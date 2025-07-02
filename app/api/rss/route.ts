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
}

async function fetchRSSFeed(url: string): Promise<NewsItem[]> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
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

    return items
      .map((item: any) => ({
        title: item.title?.[0] || "",
        link: item.link?.[0] || "",
        description: item.description?.[0] || "",
        pubDate: item.pubDate?.[0] || "",
        guid: item.guid?.[0]?._ || item.guid?.[0] || "",
        image: item["media:content"]?.[0]?.$?.url || "",
        domain,
      }))
      .filter((item: NewsItem) => item.title && item.link)
  } catch (error) {
    console.error(`Error fetching RSS feed ${url}:`, error)
    return []
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const offset = Number.parseInt(searchParams.get("offset") || "0")
    const limit = Number.parseInt(searchParams.get("limit") || "30")

    // Import URLs from JSON file
    const urlsData = await import("@/data/url.json")
    const urls = urlsData.urls

    // Fetch all RSS feeds
    const allFeeds = await Promise.all(urls.map((url) => fetchRSSFeed(url)))

    // Combine and sort all items by date (latest first)
    const allItems = allFeeds
      .flat()
      .filter((item) => item.pubDate) // Filter out items without dates
      .sort((a, b) => {
        const dateA = new Date(a.pubDate).getTime()
        const dateB = new Date(b.pubDate).getTime()

        // Handle invalid dates
        if (isNaN(dateA) && isNaN(dateB)) return 0
        if (isNaN(dateA)) return 1
        if (isNaN(dateB)) return -1

        // Sort by newest first (descending order)
        return dateB - dateA
      })

    // Apply pagination
    const paginatedItems = allItems.slice(offset, offset + limit)

    return NextResponse.json({
      items: paginatedItems,
      hasMore: offset + limit < allItems.length,
      total: allItems.length,
    })
  } catch (error) {
    console.error("Error in RSS API:", error)
    return NextResponse.json({ error: "Failed to fetch RSS feeds" }, { status: 500 })
  }
}
