'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Phone, AlertCircle, Download, User, Mail, MapPin, DollarSign, Calendar } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChatMessage, LeadInfo } from '@/lib/ai'
import { supabase } from '@/lib/supabase'

interface ChatInterfaceProps {
  isOpen: boolean
  onClose: () => void
}

export default function ChatInterface({ isOpen, onClose }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [leadInfo, setLeadInfo] = useState<LeadInfo>({})
  const [leadId, setLeadId] = useState<string | null>(null)
  const [messageCount, setMessageCount] = useState(0)
  const [showCallPrompt, setShowCallPrompt] = useState(false)
  const [chatCompleted, setChatCompleted] = useState(false)
  const [showPhoneInput, setShowPhoneInput] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [isCallingAPI, setIsCallingAPI] = useState(false)
  const [showLeadCollection, setShowLeadCollection] = useState(false)
  const [isSavingLead, setIsSavingLead] = useState(false)
  const [leadFormData, setLeadFormData] = useState({
    name: '',
    email: '',
    phone: '',
    rent_or_buy: '',
    area: '',
    amenities: '',
    budget_range: '',
    urgency: ''
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Initialize chat with welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        role: 'assistant',
        content: "Hey there! Are you excited to embark on your search for a new home? I am Roy, I will be your local real estate expert. How can i help you today?"
      }
      setMessages([welcomeMessage])
      setMessageCount(1)
      setChatCompleted(false)
    }
  }, [isOpen, messages.length])

  // Check if we should show call prompt at 30 messages
  useEffect(() => {
    if (messageCount >= 30 && !showCallPrompt) {
      setShowCallPrompt(true)
      setChatCompleted(true)
    }
  }, [messageCount, showCallPrompt])

  // Check if we should show lead collection card
  useEffect(() => {
    const hasEnoughInfo = leadInfo.name && leadInfo.email && leadInfo.rent_or_buy && leadInfo.area && leadInfo.budget_range
    if (hasEnoughInfo && !showLeadCollection && messageCount >= 15) {
      setShowLeadCollection(true)
      // Pre-fill form with extracted data
      setLeadFormData({
        name: leadInfo.name || '',
        email: leadInfo.email || '',
        phone: leadInfo.phone || '',
        rent_or_buy: leadInfo.rent_or_buy || '',
        area: leadInfo.area || '',
        amenities: leadInfo.amenities?.join(', ') || '',
        budget_range: leadInfo.budget_range || '',
        urgency: leadInfo.urgency || ''
      })
    }
  }, [leadInfo, showLeadCollection, messageCount])

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    // Check message limit
    if (messageCount >= 40) {
      setShowCallPrompt(true)
      setChatCompleted(true)
      return
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)
    setIsTyping(true)
    setMessageCount(prev => prev + 1)

    try {
      // Create lead if this is the first message
      if (!leadId) {
        const { data: lead, error } = await supabase
          .from('leads')
          .insert([{
            name: '',
            email: '',
            rent_or_buy: null,
            area: '',
            amenities: [],
            lead_score: 0,
            status: 'new',
            phone_call_made: false,
            conversation_summary: '',
            notes: ''
          }])
          .select()
          .single()

        if (error) throw error
        setLeadId(lead.id)
      }

      // Get AI response via API
      const allMessages = [...messages, userMessage]
      
      console.log('🔄 Sending chat request...', {
        messageCount: messageCount + 1,
        messagesLength: allMessages.length,
        leadInfo: Object.keys(leadInfo)
      })

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: allMessages,
          leadInfo,
          leadId,
          messageCount: messageCount + 1
        }),
      })

      console.log('📡 Response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('❌ API Error:', errorData)
        throw new Error(`API Error (${response.status}): ${errorData.error || 'Unknown error'}\nDetails: ${errorData.details || 'No additional details'}`)
      }

      const data = await response.json()
      console.log('✅ API Response received:', {
        hasResponses: !!data.responses,
        responseCount: data.responses?.length,
        hasDebug: !!data.debug,
        debug: data.debug
      })
      
      // Handle multiple responses from AI
      const responses = data.responses || [data.response]
      
      // Add responses one by one with delays for natural flow
      for (let i = 0; i < responses.length; i++) {
        const response = responses[i]
        
        // Simulate natural typing delay based on message length
        const typingDelay = Math.min(response.length * 15, 2000) // Max 2 seconds
        await new Promise(resolve => setTimeout(resolve, typingDelay))
        
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response
        }

        setMessages(prev => [...prev, assistantMessage])
        setMessageCount(prev => prev + 1)
        
        // Small delay between multiple messages
        if (i < responses.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }

      // Update lead info based on conversation
      const updatedLeadInfo = extractLeadInfo(allMessages)
      setLeadInfo(updatedLeadInfo)

    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: "I am having trouble connecting right now. Could you try again in a moment?"
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      setIsTyping(false)
    }
  }

  const extractLeadInfo = (messages: ChatMessage[]): LeadInfo => {
    const info: LeadInfo = {}
    
    // Get the last few messages for better context
    const recentMessages = messages.slice(-6).map(m => m.content).join(' ').toLowerCase()
    const allMessages = messages.map(m => m.content).join(' ').toLowerCase()
    
    // Extract name (multiple patterns)
    const namePatterns = [
      /my name is (\w+)/i,
      /i am (\w+)/i,
      /i'm (\w+)/i,
      /call me (\w+)/i,
      /this is (\w+)/i
    ]
    
    for (const pattern of namePatterns) {
      const match = allMessages.match(pattern)
      if (match && match[1]) {
        info.name = match[1].charAt(0).toUpperCase() + match[1].slice(1)
        break
      }
    }

    // Extract email
    const emailMatch = allMessages.match(/[\w.-]+@[\w.-]+\.\w+/)
    if (emailMatch) info.email = emailMatch[0]

    // Extract phone
    const phoneMatch = allMessages.match(/(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/)
    if (phoneMatch) info.phone = phoneMatch[0]

    // Extract rent/buy preference
    if (recentMessages.includes('rent') && !recentMessages.includes('buy')) info.rent_or_buy = 'rent'
    if (recentMessages.includes('buy') && !recentMessages.includes('rent')) info.rent_or_buy = 'buy'

    // Extract area (more comprehensive)
    const areaPatterns = [
      /(?:in|to|around|near) ([a-zA-Z\s]+)(?:area|neighborhood|district|vancouver|burnaby|richmond|surrey)/i,
      /(?:looking for|interested in) ([a-zA-Z\s]+)(?:area|neighborhood|district)/i,
      /(?:downtown|westside|eastside|north vancouver|south vancouver|burnaby|richmond|surrey|coquitlam|new westminster)/i
    ]
    
    for (const pattern of areaPatterns) {
      const match = allMessages.match(pattern)
      if (match && match[1]) {
        info.area = match[1].trim()
        break
      }
    }

    // Extract amenities
    const amenityKeywords = ['schools', 'parks', 'restaurants', 'gym', 'parking', 'transit', 'shopping', 'beach', 'ocean view', 'balcony', 'in-suite laundry']
    const foundAmenities = amenityKeywords.filter(keyword => allMessages.includes(keyword))
    if (foundAmenities.length > 0) {
      info.amenities = foundAmenities
    }

    // Extract budget range
    const budgetPatterns = [
      /\$(\d{1,3}(?:,\d{3})*)(?:k|000)?\s*-\s*\$(\d{1,3}(?:,\d{3})*)(?:k|000)?/i,
      /\$(\d{1,3}(?:,\d{3})*)\s*-\s*\$(\d{1,3}(?:,\d{3})*)\s*per\s*month/i,
      /budget.*?\$(\d{1,3}(?:,\d{3})*)\s*-\s*\$(\d{1,3}(?:,\d{3})*)/i
    ]
    
    for (const pattern of budgetPatterns) {
      const match = allMessages.match(pattern)
      if (match) {
        const min = parseInt(match[1].replace(/,/g, ''))
        const max = parseInt(match[2].replace(/,/g, ''))
        if (min > 1000) {
          info.budget_range = `$${min.toLocaleString()}-$${max.toLocaleString()}`
        } else {
          info.budget_range = `$${min.toLocaleString()}-$${max.toLocaleString()}/month`
        }
        break
      }
    }

    // Extract urgency
    if (recentMessages.includes('asap') || recentMessages.includes('immediately') || recentMessages.includes('urgent')) {
      info.urgency = 'asap'
    } else if (recentMessages.includes('within 3 months') || recentMessages.includes('soon')) {
      info.urgency = 'within 3 months'
    } else if (recentMessages.includes('flexible') || recentMessages.includes('no rush')) {
      info.urgency = 'flexible'
    }

    return info
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleCallRequest = () => {
    setShowCallPrompt(false)
    setShowPhoneInput(true)
  }

  const handlePhoneSubmit = async () => {
    if (!phoneNumber.trim() || isCallingAPI) return

    setIsCallingAPI(true)
    try {
      // Update lead with phone number
      if (leadId) {
        await supabase
          .from('leads')
          .update({ phone: phoneNumber })
          .eq('id', leadId)
      }

      // Make the call via ElevenLabs API
      const response = await fetch('/api/elevenlabs-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          leadId,
          conversationSummary: messages.map(m => `${m.role}: ${m.content}`).join('\n')
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to initiate call')
      }

      const result = await response.json()
      
      // Add success message
      const successMessage: ChatMessage = {
        role: 'assistant',
        content: `Perfect! I am calling you now at ${phoneNumber}. You should receive a call in the next few minutes. Looking forward to helping you find your perfect home!`
      }
      setMessages(prev => [...prev, successMessage])
      setShowPhoneInput(false)
      setPhoneNumber('')

    } catch (error) {
      console.error('Error making call:', error)
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: "I am having trouble making the call right now. Please try again in a moment or contact me directly."
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsCallingAPI(false)
    }
  }

  const handleLeadSubmit = async () => {
    if (isSavingLead) return

    setIsSavingLead(true)
    try {
      // Calculate lead score
      const score = calculateLeadScore({
        name: leadFormData.name,
        email: leadFormData.email,
        phone: leadFormData.phone,
        rent_or_buy: leadFormData.rent_or_buy as 'rent' | 'buy',
        area: leadFormData.area,
        amenities: leadFormData.amenities ? leadFormData.amenities.split(',').map(a => a.trim()) : [],
        budget_range: leadFormData.budget_range,
        urgency: leadFormData.urgency
      })

      // Update lead with collected information
      if (leadId) {
        const { error } = await supabase
          .from('leads')
          .update({
            name: leadFormData.name,
            email: leadFormData.email,
            phone: leadFormData.phone,
            rent_or_buy: leadFormData.rent_or_buy as 'rent' | 'buy',
            area: leadFormData.area,
            amenities: leadFormData.amenities ? leadFormData.amenities.split(',').map(a => a.trim()) : [],
            budget_range: leadFormData.budget_range,
            urgency: leadFormData.urgency,
            lead_score: score,
            conversation_summary: messages.map(m => `${m.role}: ${m.content}`).join('\n'),
            status: 'new'
          })
          .eq('id', leadId)

        if (error) throw error

        // Add success message
        const successMessage: ChatMessage = {
          role: 'assistant',
          content: `Perfect! I have saved your information. Your lead score is ${score}/10. I will be in touch soon with personalized listings that match your criteria. Is there anything else you would like to know about the market?`
        }
        setMessages(prev => [...prev, successMessage])
        setShowLeadCollection(false)
      }

    } catch (error) {
      console.error('Error saving lead:', error)
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: "I am having trouble saving your information right now. Please try again in a moment."
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsSavingLead(false)
    }
  }

  const calculateLeadScore = (info: LeadInfo): number => {
    let score = 0

    // Basic information (0-3 points)
    if (info.name) score += 1
    if (info.email) score += 1
    if (info.phone) score += 1

    // Property preferences (0-3 points)
    if (info.rent_or_buy) score += 1
    if (info.area) score += 1
    if (info.amenities && info.amenities.length > 0) score += 1

    // Budget and urgency (0-4 points)
    if (info.budget_range) {
      if (info.budget_range.includes('500k') || info.budget_range.includes('750k') || info.budget_range.includes('1M')) {
        score += 2
      } else {
        score += 1
      }
    }
    if (info.urgency) {
      if (info.urgency.includes('asap') || info.urgency.includes('immediately')) {
        score += 2
      } else {
        score += 1
      }
    }

    return Math.min(score, 10)
  }

  const downloadConversation = () => {
    const conversationText = messages.map(m => `${m.role === 'user' ? 'You' : 'Roy'}: ${m.content}`).join('\n\n')
    const blob = new Blob([conversationText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `conversation-with-roy-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="fixed bottom-4 right-4 w-full max-w-md h-600 chat-window flex flex-col z-50"
          style={{ width: 'calc(100vw - 2rem)', maxWidth: '500px' }}
        >
          {/* Header */}
          <div className="chat-header">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden">
                  <img src="/roy.png" alt="Roy" className="w-10 h-10 rounded-full object-cover" />
                </div>
                <div>
                  <h3 className="font-semibold">Chat with Roy</h3>
                  <div className="flex items-center space-x-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span>Roy is online</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {chatCompleted && (
                  <button
                    onClick={downloadConversation}
                    className="download-button"
                    title="Download conversation"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="chat-close-btn"
                  aria-label="Close chat"
                >
                  ×
                </button>
              </div>
            </div>
            {/* Message counter */}
            <div className="mt-2 text-xs text-gray-300">
              Messages: {messageCount}/40
            </div>
          </div>

          {/* Messages */}
          <div className="chat-messages space-y-4">
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`message-bubble ${
                    message.role === 'user' ? 'message-user' : 'message-assistant'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    {message.role === 'assistant' && (
                      <div className="w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                        <img src="/roy.png" alt="Roy" className="w-6 h-6 rounded-full object-cover" />
                      </div>
                    )}
                    <p className="text-sm leading-relaxed">{message.content}</p>
                  </div>
                </div>
              </motion.div>
            ))}
            
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="message-bubble message-assistant">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center overflow-hidden">
                      <img src="/roy.png" alt="Roy" className="w-6 h-6 rounded-full object-cover" />
                    </div>
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Call prompt */}
            {showCallPrompt && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="message-bubble message-assistant">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 text-yellow-600 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-800 font-medium mb-2">
                        Great conversation! Let us take this to the next level.
                      </p>
                      <p className="text-sm text-gray-600 mb-3">
                                                  I would love to give you a call to discuss your options in detail and show you some amazing listings that match your criteria.
                      </p>
                      <button
                        onClick={handleCallRequest}
                        className="bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-yellow-700 transition-colors flex items-center space-x-2 clickable"
                      >
                        <Phone className="w-4 h-4" />
                        <span>Yes, call me!</span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Phone input */}
            {showPhoneInput && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="message-bubble message-assistant">
                  <div className="flex items-start space-x-2">
                    <div className="w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                      <img src="/roy.png" alt="Roy" className="w-6 h-6 rounded-full object-cover" />
                    </div>
                    <div className="w-full">
                      <p className="text-sm text-gray-800 font-medium mb-3">
                        Perfect! What is your phone number so I can call you?
                      </p>
                      <div className="flex space-x-2">
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="(555) 123-4567"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          disabled={isCallingAPI}
                        />
                        <button
                          onClick={handlePhoneSubmit}
                          disabled={isCallingAPI || !phoneNumber.trim()}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition-colors flex items-center space-x-2 clickable disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Phone className="w-4 h-4" />
                          <span>{isCallingAPI ? 'Calling...' : 'Call Me'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Lead collection card */}
            {showLeadCollection && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="message-bubble message-assistant">
                  <div className="flex items-start space-x-2">
                    <div className="w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                      <img src="/roy.png" alt="Roy" className="w-6 h-6 rounded-full object-cover" />
                    </div>
                    <div className="w-full">
                      <p className="text-sm text-gray-800 font-medium mb-3">
                        Great! I have gathered some information from our conversation. Let me save your details so I can send you personalized listings:
                      </p>
                      <div className="space-y-3">
                        <div className="flex space-x-2">
                          <div className="flex-1">
                            <label className="block text-xs text-gray-600 mb-1">Name</label>
                            <input
                              type="text"
                              value={leadFormData.name}
                              onChange={(e) => setLeadFormData(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="Your name"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs text-gray-600 mb-1">Email</label>
                            <input
                              type="email"
                              value={leadFormData.email}
                              onChange={(e) => setLeadFormData(prev => ({ ...prev, email: e.target.value }))}
                              placeholder="your@email.com"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <div className="flex-1">
                            <label className="block text-xs text-gray-600 mb-1">Phone (optional)</label>
                            <input
                              type="tel"
                              value={leadFormData.phone}
                              onChange={(e) => setLeadFormData(prev => ({ ...prev, phone: e.target.value }))}
                              placeholder="(555) 123-4567"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs text-gray-600 mb-1">Rent or Buy</label>
                            <select
                              value={leadFormData.rent_or_buy}
                              onChange={(e) => setLeadFormData(prev => ({ ...prev, rent_or_buy: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="">Select...</option>
                              <option value="rent">Rent</option>
                              <option value="buy">Buy</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <div className="flex-1">
                            <label className="block text-xs text-gray-600 mb-1">Preferred Area</label>
                            <input
                              type="text"
                              value={leadFormData.area}
                              onChange={(e) => setLeadFormData(prev => ({ ...prev, area: e.target.value }))}
                              placeholder="e.g., Downtown, Westside"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs text-gray-600 mb-1">Budget Range</label>
                            <input
                              type="text"
                              value={leadFormData.budget_range}
                              onChange={(e) => setLeadFormData(prev => ({ ...prev, budget_range: e.target.value }))}
                              placeholder="e.g., $2000-$3000/month"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <div className="flex-1">
                            <label className="block text-xs text-gray-600 mb-1">Amenities (comma separated)</label>
                            <input
                              type="text"
                              value={leadFormData.amenities}
                              onChange={(e) => setLeadFormData(prev => ({ ...prev, amenities: e.target.value }))}
                              placeholder="e.g., gym, parking, schools"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs text-gray-600 mb-1">Timeline</label>
                            <select
                              value={leadFormData.urgency}
                              onChange={(e) => setLeadFormData(prev => ({ ...prev, urgency: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="">Select...</option>
                              <option value="asap">ASAP</option>
                              <option value="within 3 months">Within 3 months</option>
                              <option value="flexible">Flexible</option>
                            </select>
                          </div>
                        </div>
                        <button
                          onClick={handleLeadSubmit}
                          disabled={isSavingLead || !leadFormData.name || !leadFormData.email || !leadFormData.rent_or_buy}
                          className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 clickable disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <User className="w-4 h-4" />
                          <span>{isSavingLead ? 'Saving...' : 'Save My Information'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="chat-input">
            {messageCount >= 40 ? (
              <div className="text-center text-gray-500 text-sm">
                <Phone className="w-4 h-4 mx-auto mb-2" />
                <p>Chat limit reached. Please request a call to continue.</p>
              </div>
            ) : (
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className="flex-1 chat-input-field"
                  disabled={isLoading}
                />
                <button
                  onClick={sendMessage}
                  disabled={isLoading || !inputMessage.trim()}
                  className="chat-send-button clickable"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
} 