import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, conversation } = await request.json()

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
    }

    // ElevenLabs Conversational AI API call
    const elevenlabsResponse = await fetch('https://api.elevenlabs.io/v1/convai/conversation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY || '',
      },
      body: JSON.stringify({
        agent_id: process.env.ELEVENLABS_AGENT_ID || '',
        phone_number: phoneNumber,
        context: `You are Roy, a friendly real estate agent in Vancouver. Here's the conversation history with this lead: ${conversation}. 
        
        Continue the conversation naturally, focusing on:
        1. Understanding their specific needs and preferences
        2. Discussing available properties that match their criteria
        3. Scheduling a viewing or meeting
        4. Building rapport and trust
        
        Be conversational, helpful, and professional. Reference the chat conversation naturally.`,
      }),
    })

    if (!elevenlabsResponse.ok) {
      const errorText = await elevenlabsResponse.text()
      console.error('ElevenLabs API error:', errorText)
      return NextResponse.json({ 
        error: 'Failed to initiate call',
        details: errorText 
      }, { status: 500 })
    }

    const result = await elevenlabsResponse.json()
    
    return NextResponse.json({ 
      success: true, 
      conversationId: result.conversation_id,
      message: 'Call initiated successfully' 
    })

  } catch (error) {
    console.error('Error in elevenlabs-call API:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 