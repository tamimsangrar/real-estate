'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Phone, AlertCircle, Download } from 'lucide-react'
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

  const saveLeadToDatabase = async (leadInfo: LeadInfo, leadId: string | null) => {
    if (!leadId) return
    
    try {
      console.log('💾 Saving lead info to database:', leadInfo)
      
      const { error } = await supabase
        .from('leads')
        .update({
          name: leadInfo.name || '',
          email: leadInfo.email || '',
          phone: leadInfo.phone || '',
          rent_or_buy: leadInfo.rent_or_buy || '',
          area: leadInfo.area || '',
          amenities: leadInfo.amenities || [],
          budget_range: leadInfo.budget_range || '',
          urgency: leadInfo.urgency || '',
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId)

      if (error) {
        console.error('❌ Error saving lead info:', error)
      } else {
        console.log('✅ Lead info saved successfully')
      }
    } catch (error) {
      console.error('❌ Error in saveLeadToDatabase:', error)
    }
  }

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
      
      // Save lead info to database
      await saveLeadToDatabase(updatedLeadInfo, leadId)

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
    
    // Get the full conversation text
    const conversation = messages.map(m => m.content).join(' ').toLowerCase()
    
    console.log('🔍 Extracting lead info from conversation...', {
      messageCount: messages.length,
      conversationLength: conversation.length
    })

    // Extract name - look for various patterns
    const namePatterns = [
      /my name is (\w+)/i,
      /i am (\w+)/i,
      /i'm (\w+)/i,
      /call me (\w+)/i,
      /this is (\w+)/i,
      /(\w+) is my name/i
    ]
    
    for (const pattern of namePatterns) {
      const match = conversation.match(pattern)
      if (match && match[1]) {
        info.name = match[1].charAt(0).toUpperCase() + match[1].slice(1)
        console.log('✅ Extracted name:', info.name)
        break
      }
    }

    // Extract email - look for email patterns
    const emailMatch = conversation.match(/[\w.-]+@[\w.-]+\.\w+/)
    if (emailMatch) {
      info.email = emailMatch[0]
      console.log('✅ Extracted email:', info.email)
    }

    // Extract phone - look for phone patterns
    const phonePatterns = [
      /(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/,
      /(\+\d{1,3}[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/,
      /phone.*?(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/i,
      /number.*?(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/i
    ]
    
    for (const pattern of phonePatterns) {
      const match = conversation.match(pattern)
      if (match && match[1]) {
        info.phone = match[1]
        console.log('✅ Extracted phone:', info.phone)
        break
      }
    }

    // Extract rent/buy preference
    if (conversation.includes('rent') && !conversation.includes('buy')) {
      info.rent_or_buy = 'rent'
      console.log('✅ Extracted preference: rent')
    } else if (conversation.includes('buy') && !conversation.includes('rent')) {
      info.rent_or_buy = 'buy'
      console.log('✅ Extracted preference: buy')
    }

    // Extract area/neighborhood - look for area mentions
    const areaPatterns = [
      /(?:in|to|around|near|looking at) ([a-zA-Z\s]+?)(?:area|neighborhood|district|vancouver|burnaby|richmond|surrey|coquitlam|new westminster|white rock|delta|langley|maple ridge|port coquitlam|port moody|north vancouver|west vancouver)/i,
      /(?:downtown|westside|eastside|kitsilano|point grey|dunbar|kerrisdale|shaughnessy|fairview|mount pleasant|strathcona|chinatown|gastown|yaletown|coal harbour|west end|english bay|kitsilano|point grey|dunbar|kerrisdale|shaughnessy|fairview|mount pleasant|strathcona|chinatown|gastown|yaletown|coal harbour|west end|english bay)/i
    ]
    
    for (const pattern of areaPatterns) {
      const match = conversation.match(pattern)
      if (match && match[1]) {
        info.area = match[1].trim()
        console.log('✅ Extracted area:', info.area)
        break
      }
    }

    // Extract amenities - look for common amenities
    const amenityKeywords = [
      'school', 'park', 'restaurant', 'gym', 'parking', 'transit', 'shopping', 'grocery',
      'beach', 'ocean', 'mountain', 'view', 'balcony', 'laundry', 'dishwasher', 'air conditioning',
      'pet', 'dog', 'cat', 'furnished', 'unfurnished', 'utilities', 'wifi', 'internet'
    ]
    
    const foundAmenities: string[] = []
    for (const amenity of amenityKeywords) {
      if (conversation.includes(amenity)) {
        foundAmenities.push(amenity)
      }
    }
    
    if (foundAmenities.length > 0) {
      info.amenities = foundAmenities
      console.log('✅ Extracted amenities:', info.amenities)
    }

    // Extract budget range - look for price mentions
    const budgetPatterns = [
      /(\$\d{1,3}(?:,\d{3})*(?:k|k\+\+)?)/i,
      /(\$\d{1,3}(?:,\d{3})*\s*(?:per month|monthly|a month))/i,
      /budget.*?(\$\d{1,3}(?:,\d{3})*)/i,
      /around.*?(\$\d{1,3}(?:,\d{3})*)/i,
      /up to.*?(\$\d{1,3}(?:,\d{3})*)/i,
      /(\d{1,3}(?:,\d{3})*\s*(?:dollars|bucks))/i
    ]
    
    for (const pattern of budgetPatterns) {
      const match = conversation.match(pattern)
      if (match && match[1]) {
        info.budget_range = match[1]
        console.log('✅ Extracted budget:', info.budget_range)
        break
      }
    }

    // Extract urgency/timeline
    const urgencyKeywords = {
      'asap': 'asap',
      'immediate': 'immediate',
      'urgent': 'urgent',
      'soon': 'soon',
      'within a month': 'within a month',
      'within 3 months': 'within 3 months',
      'flexible': 'flexible',
      'no rush': 'no rush',
      'not in a hurry': 'not in a hurry'
    }
    
    for (const [keyword, urgency] of Object.entries(urgencyKeywords)) {
      if (conversation.includes(keyword)) {
        info.urgency = urgency
        console.log('✅ Extracted urgency:', info.urgency)
        break
      }
    }

    console.log('📊 Final extracted lead info:', info)
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
    if (!phoneNumber.trim()) return
    
    setIsCallingAPI(true)
    
    try {
      // Update lead with phone number and status
      if (leadId) {
        await supabase
          .from('leads')
          .update({
            phone: phoneNumber,
            status: 'contacted',
            phone_call_made: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', leadId)
      }

      // Call ElevenLabs API
      const response = await fetch('/api/elevenlabs-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          leadId,
          conversation: messages.map(m => `${m.role === 'user' ? 'User' : 'Roy'}: ${m.content}`).join('\n')
        }),
      })

      if (response.ok) {
        const callMessage: ChatMessage = {
          role: 'assistant',
          content: `Perfect! I am calling you now at ${phoneNumber}. Please answer your phone - I will be calling you within the next minute to discuss your options and show you some amazing listings!`
        }
        setMessages(prev => [...prev, callMessage])
      } else {
        throw new Error('Failed to initiate call')
      }
    } catch (error) {
      console.error('Error initiating call:', error)
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: "I am having trouble initiating the call right now. Please try again in a moment, or feel free to call me directly!"
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsCallingAPI(false)
      setShowPhoneInput(false)
      setChatCompleted(true)
    }
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