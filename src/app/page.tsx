'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import ChatInterface from '@/components/ChatInterface'

export default function HomePage() {
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isChatOpen, setIsChatOpen] = useState(false)
  const router = useRouter()

  // Get today's date in dd.mm.yy
  const getToday = () => {
    const d = new Date()
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yy = String(d.getFullYear()).slice(-2)
    return `${dd}.${mm}.${yy}`
  }

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault()
    setShowPassword(true)
    setError('')
    setPassword('')
  }

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === getToday()) {
      setShowPassword(false)
      setError('')
      setPassword('')
      router.push('/admin')
    } else {
      setError('Incorrect password. Try again.')
    }
  }

  return (
    <div className="min-h-screen w-full relative">
      {/* Hero Background Image Placeholder */}
      <div
        className="hero-bg"
        style={{ backgroundImage: 'url(/bg-img.png)' }}
      />
      <div className="hero-overlay" />

      {/* Only the Roy logo for admin access */}
      <nav className="hero-nav" style={{ justifyContent: 'flex-start' }}>
        <a href="#admin" className="hero-logo clickable" onClick={handleLogoClick}>
          <img src="/roy.png" alt="Roy" className="roy-logo-img" />
        </a>
      </nav>

      {/* Password Modal */}
      {showPassword && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 100 }} className="flex items-center justify-center">
          <form
            onSubmit={handlePasswordSubmit}
            style={{ background: '#fff', borderRadius: 12, padding: 32, minWidth: 320, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
            className="flex flex-col items-center"
          >
            <div className="mb-4 text-lg font-semibold text-gray-900">Admin Access</div>
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="mb-3 px-4 py-2 border border-gray-300 rounded w-full text-base"
              autoFocus
            />
            {error && <div className="mb-2 text-red-600 text-sm">{error}</div>}
            <div className="flex space-x-3 mt-2">
              <button type="submit" className="hero-nav-btn">Enter</button>
              <button type="button" className="hero-nav-btn" style={{ background: '#eee' }} onClick={() => setShowPassword(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Hero Content */}
      <div className="hero-content">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="hero-title"
        >
          Find your dream<br />home in Vancouver
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="hero-desc"
        >
          I am here to help you find your dream home in Vancouver. Search by type, location and amenities to find the perfect home.
        </motion.p>
        <motion.button
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="hero-cta clickable"
          onClick={() => setIsChatOpen(true)}
        >
          Chat with Roy
        </motion.button>
      </div>

      {/* Chat Interface */}
      <ChatInterface isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  )
}
