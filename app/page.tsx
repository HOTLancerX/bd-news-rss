"use client"
import { useState, useEffect, useCallback } from "react"
import News from "@/components/News"
import type { NewsItem } from "./api/rss/route"

export default function HomePage() {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchNews = useCallback(async (offset = 0, limit = 30) => {
    try {
      const response = await fetch(`/api/rss?offset=${offset}&limit=${limit}&language=bangla`)
      if (!response.ok) {
        throw new Error("Failed to fetch news")
      }
      const data = await response.json()
      return data
    } catch (err) {
      console.error("Error fetching news:", err)
      throw err
    }
  }, [])

  const loadInitialNews = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchNews(0, 30)
      setNewsItems(data.items)
      setHasMore(data.hasMore)
    } catch (err) {
      setError("Failed to load news. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [fetchNews])

  const loadMoreNews = useCallback(async () => {
    if (!hasMore || loadingMore) return

    try {
      setLoadingMore(true)
      const data = await fetchNews(newsItems.length, 10)
      setNewsItems((prev) => [...prev, ...data.items])
      setHasMore(data.hasMore)
    } catch (err) {
      console.error("Error loading more news:", err)
    } finally {
      setLoadingMore(false)
    }
  }, [newsItems.length, hasMore, loadingMore, fetchNews])

  useEffect(() => {
    loadInitialNews()
  }, [loadInitialNews])

  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
        if (hasMore && !loadingMore) {
          loadMoreNews()
        }
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [hasMore, loadingMore, loadMoreNews])

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="max-w-4xl mx-auto py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading news...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <div className="max-w-4xl mx-auto py-8">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button 
              onClick={loadInitialNews} 
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="max-w-4xl mx-auto">
        <>
          {newsItems.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No news items found.</p>
            </div>
          ) : (
            <>
              {newsItems.map((item, index) => (
                <News key={`${item.guid}-${index}`} item={item} />
              ))}

              {/* Loading More Indicator */}
              {loadingMore && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading more news...</p>
                </div>
              )}

              {/* End of Feed */}
              {!hasMore && (
                <div className="text-center py-8 text-gray-500">
                  <p>You've reached the end of the news feed.</p>
                </div>
              )}
            </>
          )}
        </>
      </div>
    </>
  )
}