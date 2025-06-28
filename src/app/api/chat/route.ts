import { NextRequest, NextResponse } from 'next/server'
import { chatWithRoy, ChatMessage, LeadInfo, calculateLeadScore } from '@/lib/ai'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { messages, leadInfo, leadId, messageCount } = await request.json()

    // Validate input
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 })
    }

    // Get AI response with message count
    const responses = await chatWithRoy(messages, leadInfo, messageCount || 0)

    // Update lead information if leadId is provided
    if (leadId) {
      try {
        const updatedLeadInfo = extractLeadInfo(messages)
        const score = calculateLeadScore(updatedLeadInfo)
        const summary = messages.map((m: ChatMessage) => `${m.role}: ${m.content}`).join('\n')
        
        await supabase
          .from('leads')
          .update({
            ...updatedLeadInfo,
            lead_score: score,
            conversation_summary: summary,
            updated_at: new Date().toISOString()
          })
          .eq('id', leadId)
      } catch (error) {
        console.error('Error updating lead:', error)
        // Don't fail the request if lead update fails
      }
    }

    return NextResponse.json({ responses })
  } catch (error) {
    console.error('Error in chat API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function extractLeadInfo(messages: ChatMessage[]): LeadInfo {
  const info: LeadInfo = {}
  
  // Simple extraction logic - in production, you'd want more sophisticated NLP
  const conversation = messages.map(m => m.content).join(' ').toLowerCase()
  
  // Extract name (basic pattern)
  const nameMatch = conversation.match(/my name is (\w+)/i) || conversation.match(/i'm (\w+)/i)
  if (nameMatch) info.name = nameMatch[1]

  // Extract email
  const emailMatch = conversation.match(/[\w.-]+@[\w.-]+\.\w+/)
  if (emailMatch) info.email = emailMatch[0]

  // Extract phone
  const phoneMatch = conversation.match(/\+?[\d\s\-\(\)]{10,}/)
  if (phoneMatch) info.phone = phoneMatch[0]

  // Extract rent/buy preference
  if (conversation.includes('rent')) info.rent_or_buy = 'rent'
  if (conversation.includes('buy')) info.rent_or_buy = 'buy'

  // Extract area (basic)
  const areaMatch = conversation.match(/(?:in|to|around) ([a-zA-Z\s]+)(?:area|neighborhood|district)/i)
  if (areaMatch) info.area = areaMatch[1].trim()

  // Extract budget
  const budgetMatch = conversation.match(/\$?(\d+(?:k|m)?(?:\s*-\s*\d+(?:k|m)?)?)/i)
  if (budgetMatch) info.budget_range = budgetMatch[0]

  // Extract urgency
  if (conversation.includes('asap') || conversation.includes('immediate') || conversation.includes('soon')) {
    info.urgency = 'urgent'
  } else if (conversation.includes('flexible') || conversation.includes('no rush')) {
    info.urgency = 'flexible'
  }

  return info
} 