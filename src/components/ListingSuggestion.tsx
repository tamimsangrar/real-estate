'use client'

import { motion } from 'framer-motion'
import { Home, MapPin, Bed, Bath, ExternalLink, Download } from 'lucide-react'

interface Listing {
  id: number
  title: string
  price: string
  location: string
  bedrooms: number
  bathrooms: number
  type: string
  amenities: string[]
  url: string
}

interface ListingSuggestionProps {
  listings: Listing[]
  onClose?: () => void
}

export default function ListingSuggestion({ listings, onClose }: ListingSuggestionProps) {
  const downloadListings = () => {
    const headers = [
      'Title',
      'Price',
      'Location',
      'Bedrooms',
      'Bathrooms',
      'Type',
      'Amenities',
      'URL'
    ]

    const csvData = listings.map(listing => [
      listing.title,
      listing.price,
      listing.location,
      listing.bedrooms,
      listing.bathrooms,
      listing.type,
      listing.amenities.join(', '),
      listing.url
    ])

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vancouver-listings-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 max-w-4xl mx-auto"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Vancouver Listings</h3>
          <p className="text-gray-600">Current rental opportunities in the Greater Vancouver area</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={downloadListings}
            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 text-sm"
          >
            <Download className="w-4 h-4" />
            <span>Download CSV</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {listings.map((listing, index) => (
          <motion.div
            key={listing.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition-colors border border-gray-200"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                  {listing.title}
                </h4>
                <div className="text-2xl font-bold text-blue-600 mb-2">
                  {listing.price}
                </div>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center ml-3">
                <Home className="w-4 h-4 text-blue-600" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center text-gray-600">
                <MapPin className="w-4 h-4 mr-2" />
                <span className="text-sm">{listing.location}</span>
              </div>

              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <Bed className="w-4 h-4 mr-1" />
                  <span>{listing.bedrooms} bed</span>
                </div>
                <div className="flex items-center">
                  <Bath className="w-4 h-4 mr-1" />
                  <span>{listing.bathrooms} bath</span>
                </div>
                <div className="text-gray-500 capitalize">
                  {listing.type}
                </div>
              </div>

              {listing.amenities.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {listing.amenities.slice(0, 3).map((amenity, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {amenity}
                    </span>
                  ))}
                  {listing.amenities.length > 3 && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      +{listing.amenities.length - 3} more
                    </span>
                  )}
                </div>
              )}

              <div className="pt-3 border-t border-gray-200">
                <a
                  href={listing.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Listing
                </a>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start">
          <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <Home className="w-3 h-3 text-white" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-800 font-medium">
              Need more details about any of these listings?
            </p>
            <p className="text-sm text-blue-700 mt-1">
              I can provide more information about neighborhoods, amenities, and arrange viewings. Just let me know which ones interest you!
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  )
} 