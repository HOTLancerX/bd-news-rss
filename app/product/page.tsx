"use client"

import { useState, useEffect, useCallback } from "react"
import type { Product } from "../api/product/route"

interface ProductCardProps {
  product: Product
}

function ProductCard({ product }: ProductCardProps) {
  const getFaviconUrl = (domain: string) => {
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      {/* Product Image */}
      <div className="aspect-square relative overflow-hidden">
        <img
          src={product.image || "/placeholder.svg?height=300&width=300"}
          alt={product.title}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.src = "/placeholder.svg?height=300&width=300"
          }}
        />
        {/* Domain Badge */}
        <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
          <img
            src={getFaviconUrl(product.domain) || "/placeholder.svg"}
            alt={`${product.domain} favicon`}
            className="w-4 h-4"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.style.display = "none"
            }}
          />
          <span className="text-xs font-medium text-gray-700 capitalize">
            {product.domain.replace("www.", "").split(".")[0]}
          </span>
        </div>
      </div>

      {/* Product Info */}
      <div className="p-4">
        {/* Title */}
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 min-h-[3rem]">{product.title}</h3>

        {/* Description */}
        {product.description && <p className="text-sm text-gray-600 mb-3 line-clamp-2">{product.description}</p>}

        {/* Price */}
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-green-600">{product.price}</span>
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
          >
            View
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-3 h-3 ml-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </div>
      </div>
    </div>
  )
}

export default function ProductPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProducts = useCallback(async (offset = 0, limit = 12) => {
    try {
      const response = await fetch(`/api/product?offset=${offset}&limit=${limit}`)
      if (!response.ok) {
        throw new Error("Failed to fetch products")
      }
      const data = await response.json()
      return data
    } catch (err) {
      console.error("Error fetching products:", err)
      throw err
    }
  }, [])

  const loadInitialProducts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchProducts(0, 12)
      setProducts(data.products)
      setHasMore(data.hasMore)
    } catch (err) {
      setError("Failed to load products. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [fetchProducts])

  const loadMoreProducts = useCallback(async () => {
    if (!hasMore || loadingMore) return

    try {
      setLoadingMore(true)
      const data = await fetchProducts(products.length, 12)
      setProducts((prev) => [...prev, ...data.products])
      setHasMore(data.hasMore)
    } catch (err) {
      console.error("Error loading more products:", err)
    } finally {
      setLoadingMore(false)
    }
  }, [products.length, hasMore, loadingMore, fetchProducts])

  useEffect(() => {
    loadInitialProducts()
  }, [loadInitialProducts])

  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
        if (hasMore && !loadingMore) {
          loadMoreProducts()
        }
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [hasMore, loadingMore, loadMoreProducts])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-8 px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading products...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-8 px-4">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={loadInitialProducts}
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Product Catalog</h1>
          <p className="text-gray-600">
            Discover products from multiple e-commerce platforms • {products.length} products loaded
          </p>
        </header>

        {/* Products Grid */}
        <main>
          {products.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No products found.</p>
            </div>
          ) : (
            <>
              {/* Responsive Grid: 2 columns on mobile, 4 columns on md+ */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Loading More Indicator */}
              {loadingMore && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading more products...</p>
                </div>
              )}

              {/* Scroll Indicator */}
              {hasMore && (
                <div className="text-center py-4 text-sm text-gray-500">
                  Scroll down for more products - loads automatically
                </div>
              )}

              {/* End of Products */}
              {!hasMore && (
                <div className="text-center py-8 text-gray-500">
                  <p>You've seen all available products.</p>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}