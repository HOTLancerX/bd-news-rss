import { type NextRequest, NextResponse } from "next/server"
import { parseString } from "xml2js"
import { promisify } from "util"
import axios from "axios"
import * as cheerio from "cheerio"
import pLimit from "p-limit"

const parseXML = promisify(parseString)

// Limit concurrent requests to avoid overwhelming servers
const limit = pLimit(5)

export interface Product {
  id: string
  title: string
  description: string
  image: string
  price: string
  url: string
  domain: string
}

interface ProductSource {
  sitemap: string
  xpath: string
  domain: string
}

// Configure axios with better settings
const axiosInstance = axios.create({
  timeout: 10000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate, br",
    Connection: "keep-alive",
    "Upgrade-Insecure-Requests": "1",
  },
})

async function fetchSitemapFast(sitemapUrl: string): Promise<string[]> {
  try {
    const response = await axiosInstance.get(sitemapUrl)
    const result = (await parseXML(response.data)) as any
    const urls: string[] = []

    if (result?.urlset?.url) {
      result.urlset.url.forEach((urlEntry: any) => {
        if (urlEntry.loc && urlEntry.loc[0]) {
          urls.push(urlEntry.loc[0])
        }
      })
    }

    // Increase limit for more products
    return urls.slice(0, 50)
  } catch (error) {
    console.error(`Error fetching sitemap ${sitemapUrl}:`, error)
    return []
  }
}

async function scrapeProductDataFast(url: string, domain: string): Promise<Product | null> {
  return limit(async () => {
    try {
      const response = await axiosInstance.get(url)
      const $ = cheerio.load(response.data)

      // Extract Open Graph data using Cheerio (much faster than regex)
      const ogTitle =
        $('meta[property="og:title"]').attr("content") ||
        $('meta[name="og:title"]').attr("content") ||
        $("title").text() ||
        ""

      const ogDescription =
        $('meta[property="og:description"]').attr("content") ||
        $('meta[name="og:description"]').attr("content") ||
        $('meta[name="description"]').attr("content") ||
        ""

      const ogImage = $('meta[property="og:image"]').attr("content") || $('meta[name="og:image"]').attr("content") || ""

      // Enhanced price extraction with multiple selectors
      let price = "Price not available"

      if (domain.includes("pickaboo")) {
        // Try multiple price selectors for Pickaboo
        const priceSelectors = [
          ".price-current",
          ".product-price",
          '[class*="price"]',
          'h2:contains("৳")',
          'span:contains("৳")',
        ]

        for (const selector of priceSelectors) {
          const priceText = $(selector).first().text().trim()
          if (priceText && (priceText.includes("৳") || priceText.includes("Tk"))) {
            price = priceText.match(/৳\s*[\d,]+|Tk\s*[\d,]+/)?.[0] || priceText
            break
          }
        }
      } else if (domain.includes("daraz")) {
        // Try multiple price selectors for Daraz
        const priceSelectors = [
          '[data-testid="price-current"]',
          ".pdp-price",
          "#module_product_price_1 span",
          '[class*="price"]',
          'span:contains("৳")',
        ]

        for (const selector of priceSelectors) {
          const priceText = $(selector).first().text().trim()
          if (priceText && (priceText.includes("৳") || priceText.includes("Tk"))) {
            price = priceText.match(/৳\s*[\d,]+|Tk\s*[\d,]+/)?.[0] || priceText
            break
          }
        }
      }

      if (!ogTitle.trim()) return null

      return {
        id: Buffer.from(url).toString("base64").slice(0, 16),
        title: ogTitle.substring(0, 100),
        description: ogDescription.substring(0, 200),
        image: ogImage.startsWith("http") ? ogImage : ogImage ? `https://${domain}${ogImage}` : "",
        price,
        url,
        domain,
      }
    } catch (error) {
      console.error(`Error scraping product ${url}:`, error)
      return null
    }
  })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const offset = Number.parseInt(searchParams.get("offset") || "0")
    const limit = Number.parseInt(searchParams.get("limit") || "20")

    const productData = await import("../../../data/product.json")
    const sources: ProductSource[] = productData.urls

    const allProducts: Product[] = []

    // Process all sitemaps concurrently
    const sitemapPromises = sources.map(async (source) => {
      console.log(`Processing sitemap: ${source.sitemap}`)
      const urls = await fetchSitemapFast(source.sitemap)
      console.log(`Found ${urls.length} URLs in sitemap`)

      // Process more URLs concurrently (increased from 5 to 15)
      const productPromises = urls.slice(0, 15).map((url) => scrapeProductDataFast(url, source.domain))

      const products = await Promise.all(productPromises)
      return products.filter((p): p is Product => p !== null)
    })

    const allResults = await Promise.all(sitemapPromises)
    allResults.forEach((products) => allProducts.push(...products))

    // Sort products by title
    allProducts.sort((a, b) => a.title.localeCompare(b.title))

    const paginatedProducts = allProducts.slice(offset, offset + limit)

    return NextResponse.json({
      products: paginatedProducts,
      hasMore: offset + limit < allProducts.length,
      total: allProducts.length,
    })
  } catch (error) {
    console.error("Error in product API:", error)
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 })
  }
}