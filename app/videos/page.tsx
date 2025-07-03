"use client"
import { useState, useEffect, useCallback } from "react"
import Image from "next/image"


interface VideoItem {
  id: string
  videoId: string
  title: string
  thumbnail: string
  channelName: string
  published: string
  views: string
}

export default function VideosPage() {
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null)

  const fetchVideos = useCallback(async (offset = 0, limit = 30) => {
    try {
      const response = await fetch(`/api/videos?offset=${offset}&limit=${limit}`)
      if (!response.ok) {
        throw new Error("Failed to fetch videos")
      }
      return await response.json()
    } catch (err) {
      console.error("Error fetching videos:", err)
      throw err
    }
  }, [])

  const loadInitialVideos = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchVideos(0, 30)
      setVideos(data.items)
      setHasMore(data.hasMore)
    } catch (err) {
      setError("Failed to load videos. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [fetchVideos])

  const loadMoreVideos = useCallback(async () => {
    if (!hasMore || loadingMore) return

    try {
      setLoadingMore(true)
      const data = await fetchVideos(videos.length, 10)
      setVideos(prev => [...prev, ...data.items])
      setHasMore(data.hasMore)
    } catch (err) {
      console.error("Error loading more videos:", err)
    } finally {
      setLoadingMore(false)
    }
  }, [videos.length, hasMore, loadingMore, fetchVideos])

  useEffect(() => {
    loadInitialVideos()
  }, [loadInitialVideos])

  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
        if (hasMore && !loadingMore) {
          loadMoreVideos()
        }
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [hasMore, loadingMore, loadMoreVideos])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading videos...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto py-8">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button 
              onClick={loadInitialVideos} 
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
        {videos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No videos found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 px-2 md:px-0">
            {videos.map((video) => (
              <div 
                key={video.id}
                className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedVideo(video.videoId)}
              >
                <div className="relative aspect-video">
                  <Image
                    src={video.thumbnail}
                    alt={video.title}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-black bg-opacity-50 rounded-full p-3">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold line-clamp-2 mb-1">{video.title}</h3>
                  <p className="text-sm text-gray-600">{video.channelName}</p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-500">{formatDate(video.published)}</span>
                    <span className="text-xs text-gray-500">{video.views} views</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {loadingMore && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading more videos...</p>
          </div>
        )}

        {!hasMore && videos.length > 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>You've reached the end of the video gallery.</p>
          </div>
        )}

        {/* Video Player Modal */}
        {selectedVideo && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-4xl bg-black rounded-lg overflow-hidden relative">
              <button 
                onClick={() => setSelectedVideo(null)}
                className="absolute top-4 right-4 bg-white bg-opacity-20 rounded-full p-2 z-10 hover:bg-opacity-30"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              <div className="aspect-w-16 aspect-h-9 w-full">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${selectedVideo}?autoplay=1`}
                  className="w-full h-full aspect-video"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}