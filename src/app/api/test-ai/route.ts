import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function GET() {
  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    })

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 50,
      messages: [
        {
          role: 'user',
          content: 'Say "Hello, I am working!"',
        },
      ],
    })

    return NextResponse.json({
      status: 'success',
      message: 'Anthropic API test successful',
      response: response.content[0].type === 'text' ? response.content[0].text : 'No text response'
    })

  } catch (error) {
    console.error('Anthropic API test error:', error)
    return NextResponse.json({
      status: 'error',
      message: 'Anthropic API test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 