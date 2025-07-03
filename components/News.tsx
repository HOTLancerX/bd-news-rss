"use client"
import { useState } from "react"
import type { NewsItem } from "@/app/api/rss/route"
import Image from "next/image"
import Link from "next/link"

interface NewsItemProps {
  item: NewsItem
}

export default function News({ item }: NewsItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return dateString
    }
  }

  const cleanDescription = (html: string) => {
    // Remove HTML tags and decode entities
    return html
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .trim()
  }

  const description = cleanDescription(item.description)
  const shortDescription = description.split("\n").slice(0, 3).join("\n")
  const shouldShowReadMore = description.length > shortDescription.length

  const getFaviconUrl = (domain: string) => {
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
  }

  const getWebsiteName = (domain: string) => {
    return domain.replace("www.", "").split(".")[0]
  }

  return (
    <div className="bg-white p-2 rounded mb-4">
      <div
        className={`${isExpanded ? 'flex-col' : 'flex-rows'} flex items-center md:gap-4 gap-2`}
      >
        <div
          className={`${isExpanded ? 'w-full' : 'md:w-1/4 w-1/3'} flex-shrink-0`}
        >
          {item.image ? (
            <Image
              src={item.image || "/placeholder.svg"}
              alt={item.title}
              width={800}
              height={300}
              className={`${isExpanded ? 'h-full' : 'md:h-40 h-24'} w-full object-cover rounded`}
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = "/placeholder.svg?height=128&width=200"
              }}
            />
          ) : (
            <div className="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}
        </div>
        <div className={`${isExpanded ? 'w-full' : 'md:w-3/4 w-2/3'} flex flex-col gap-1`}>
          <div className="flex items-center gap-2">
            <Image
              src={getFaviconUrl(item.domain) || "/placeholder.svg"}
              alt={`${item.domain} favicon`}
              className="w-4 h-4"
              width={32}
              height={32}
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = "none"
              }}
            />
            <span className="text-sm text-gray-600 capitalize">{getWebsiteName(item.domain)}</span>
            <Link
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center hover:text-blue-600 ml-auto"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 32 32"><path fill="currentColor" d="M18 5v2h5.563L11.28 19.281l1.438 1.438L25 8.437V14h2V5zM5 9v18h18V14l-2 2v9H7V11h9l2-2z"/></svg>
            </Link>
          </div>

          {/* Title and Description */}
          <div className="flex-1">
            <h2
              className={`${isExpanded ? '' : 'line-clamp-1'} text-lg font-semibold text-gray-900 mb-2`}
            >
              {item.title}</h2>
            <div className="text-gray-700 leading-relaxed">
              {isExpanded ? (
                <p className="whitespace-pre-line text-xl leading-10"
                  dangerouslySetInnerHTML={{
                    __html: description,
                  }}
                />
              ) : (
                <p className="whitespace-pre-line text-base line-clamp-1 md:line-clamp-3"
                  dangerouslySetInnerHTML={{
                    __html: shortDescription,
                  }}
                />
              )}
            </div>
          </div>

          {/* Time and Read More */}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>{formatDate(item.pubDate)}</span>
            {shouldShowReadMore && (
              <button onClick={() => setIsExpanded(!isExpanded)} className="text-blue-600 hover:underline font-medium">
                {isExpanded ? "Read Less" : "Read More"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
