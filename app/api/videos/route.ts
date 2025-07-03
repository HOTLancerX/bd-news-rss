// app/api/videos/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { parseString } from 'xml2js'
import { promisify } from 'util'

const parseXML = promisify(parseString)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const offset = Number(searchParams.get("offset") || 0)
    const limit = Number(searchParams.get("limit") || 30)

    // Import channel IDs from your JSON file
    const { default: { urls: channelIds } } = await import('@/data/videos.json')

    // Fetch all videos from all channels
    const allVideos = await Promise.all(
      channelIds.map(async (channelId: string) => {
        try {
          const response = await fetch(
            `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`,
            { next: { revalidate: 3600 } } // Cache for 1 hour
          )
          if (!response.ok) return []
          
          const xmlText = await response.text()
          const result = await parseXML(xmlText) as any
          
          return (result.feed.entry || []).map((entry: any) => ({
            id: entry.id[0],
            videoId: entry['yt:videoId'][0],
            title: entry.title[0],
            thumbnail: `https://i.ytimg.com/vi/${entry['yt:videoId'][0]}/mqdefault.jpg`,
            channelName: entry.author[0].name[0],
            published: entry.published[0],
            views: entry['media:group'][0]['media:community'][0]['media:statistics'][0]?.$.views || '0'
          }))
        } catch (error) {
          console.error(`Error fetching channel ${channelId}:`, error)
          return []
        }
      })
    )

    // Flatten and sort all videos by publish date (newest first)
    const sortedVideos = allVideos.flat().sort((a, b) => 
      new Date(b.published).getTime() - new Date(a.published).getTime()
    )

    // Apply pagination
    const paginatedVideos = sortedVideos.slice(offset, offset + limit)
    const hasMore = offset + limit < sortedVideos.length

    return NextResponse.json({
      items: paginatedVideos,
      hasMore,
      total: sortedVideos.length
    })

  } catch (error) {
    console.error('Error in videos API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch videos' }, 
      { status: 500 }
    )
  }
}