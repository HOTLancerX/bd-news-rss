import { type NextRequest, NextResponse } from "next/server"
import { parseString } from "xml2js"
import { promisify } from "util"

const parseXML = promisify(parseString)

export interface NewsItem {
  title: string
  link: string
  description: string
  pubDate: string
  guid: string
  image?: string
  domain: string
  needsImage?: boolean // Flag to resolve later
}

// Extract og:image from HTML
async function fetchOGImageFromPage(link: string): Promise<string | null> {
  try {
    const response = await fetch(link, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
      cache: "no-store",
    })

    if (!response.ok) return null

    const html = await response.text()
    const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    return ogMatch?.[1] || null
  } catch {
    return null
  }
}

// Parse a single feed URL
async function fetchRSSFeed(url: string): Promise<NewsItem[]> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
    })

    if (!response.ok) {
      console.error(`Failed to fetch ${url}: ${response.status}`)
      return []
    }

    const xmlText = await response.text()
    const result = (await parseXML(xmlText)) as any

    const items = result?.rss?.channel?.[0]?.item || []
    const domain = new URL(url).hostname

    const newsItems: NewsItem[] = items.map((item: any) => {
      const title = item.title?.[0] || ""
      const link = item.link?.[0] || ""
      const pubDate = item.pubDate?.[0] || ""
      const guid = item.guid?.[0]?._ || item.guid?.[0] || ""

      const contentEncoded = item["content:encoded"]?.[0]?.trim()
      const description = contentEncoded || item.description?.[0] || ""

      const image = item["media:content"]?.[0]?.$?.url || ""
      const needsImage = !image && !!link

      return {
        title,
        link,
        description,
        pubDate,
        guid,
        image,
        domain,
        needsImage,
      }
    })

    return newsItems.filter((item: NewsItem) => item.title && item.link)
  } catch (error) {
    console.error(`Error fetching RSS feed ${url}:`, error)
    return []
  }
}

// Optional: Background image updater
async function enrichItemsWithImages(items: NewsItem[]): Promise<NewsItem[]> {
  return Promise.all(
    items.map(async (item) => {
      if (!item.needsImage || !item.link) return item

      const image = await fetchOGImageFromPage(item.link)
      return {
        ...item,
        image: image || "",
        needsImage: false,
      }
    })
  )
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const offset = Number.parseInt(searchParams.get("offset") || "0")
    const limit = Number.parseInt(searchParams.get("limit") || "30")

    const urlsData = await import("@/data/url.json")
    const urls = urlsData.urls

    const allFeeds = await Promise.all(urls.map(fetchRSSFeed))

    let allItems = allFeeds
      .flat()
      .filter((item) => item.pubDate)
      .sort((a, b) => {
        const dateA = new Date(a.pubDate).getTime()
        const dateB = new Date(b.pubDate).getTime()
        if (isNaN(dateA) && isNaN(dateB)) return 0
        if (isNaN(dateA)) return 1
        if (isNaN(dateB)) return -1
        return dateB - dateA
      })

    const paginatedItems = allItems.slice(offset, offset + limit)

    // Optional: Update images after data is processed
    const enrichedItems = await enrichItemsWithImages(paginatedItems)

    return NextResponse.json({
      items: enrichedItems,
      hasMore: offset + limit < allItems.length,
      total: allItems.length,
    })
  } catch (error) {
    console.error("Error in RSS API:", error)
    return NextResponse.json({ error: "Failed to fetch RSS feeds" }, { status: 500 })
  }
}