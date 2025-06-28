import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'

export async function GET() {
  console.log('🔍 Debug endpoint called at:', new Date().toISOString())
  
  const results = {
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasElevenLabsKey: !!process.env.ELEVENLABS_API_KEY,
      hasElevenLabsAgentId: !!process.env.ELEVENLABS_AGENT_ID,
      anthropicKeyPrefix: process.env.ANTHROPIC_API_KEY?.substring(0, 15) + '...',
      supabaseUrlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
    },
    tests: {
      supabase: { status: 'pending' as 'pending' | 'success' | 'error', details: null as string | null },
      anthropic: { status: 'pending' as 'pending' | 'success' | 'error', details: null as string | null },
      elevenlabs: { status: 'pending' as 'pending' | 'success' | 'error', details: null as string | null }
    }
  }

  // Test Supabase connection
  try {
    console.log('🔄 Testing Supabase...')
    const { error } = await supabase
      .from('leads')
      .select('count')
      .limit(1)
    
    if (error) {
      results.tests.supabase = {
        status: 'error',
        details: error.message
      }
      console.error('❌ Supabase test failed:', error)
    } else {
      results.tests.supabase = {
        status: 'success',
        details: 'Connection successful'
      }
      console.log('✅ Supabase test passed')
    }
  } catch (supabaseError) {
    results.tests.supabase = {
      status: 'error',
      details: supabaseError instanceof Error ? supabaseError.message : 'Unknown error'
    }
    console.error('❌ Supabase test exception:', supabaseError)
  }

  // Test Anthropic Claude
  try {
    console.log('🔄 Testing Anthropic...')
    if (!process.env.ANTHROPIC_API_KEY) {
      results.tests.anthropic = {
        status: 'error',
        details: 'Missing ANTHROPIC_API_KEY environment variable'
      }
    } else {
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      })

      const message = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 10,
        messages: [{
          role: 'user',
          content: 'Say "test"'
        }],
      })

      if (message.content[0].type === 'text') {
        results.tests.anthropic = {
          status: 'success',
          details: `Response: ${message.content[0].text}`
        }
        console.log('✅ Anthropic test passed')
      } else {
        results.tests.anthropic = {
          status: 'error',
          details: 'Unexpected response format'
        }
      }
    }
  } catch (anthropicError) {
    results.tests.anthropic = {
      status: 'error',
      details: anthropicError instanceof Error ? anthropicError.message : 'Unknown error'
    }
    console.error('❌ Anthropic test failed:', anthropicError)
  }

  // Test ElevenLabs (basic key validation)
  try {
    console.log('🔄 Testing ElevenLabs...')
    if (!process.env.ELEVENLABS_API_KEY) {
      results.tests.elevenlabs = {
        status: 'error',
        details: 'Missing ELEVENLABS_API_KEY environment variable'
      }
    } else if (!process.env.ELEVENLABS_AGENT_ID) {
      results.tests.elevenlabs = {
        status: 'error',
        details: 'Missing ELEVENLABS_AGENT_ID environment variable'
      }
    } else {
      // Just validate the keys exist - don't make actual API call to avoid charges
      results.tests.elevenlabs = {
        status: 'success',
        details: 'API key and Agent ID are configured'
      }
      console.log('✅ ElevenLabs configuration validated')
    }
  } catch (elevenLabsError) {
    results.tests.elevenlabs = {
      status: 'error',
      details: elevenLabsError instanceof Error ? elevenLabsError.message : 'Unknown error'
    }
    console.error('❌ ElevenLabs test failed:', elevenLabsError)
  }

  // Summary
  const allPassed = Object.values(results.tests).every(test => test.status === 'success')
  console.log(`🏁 Debug tests completed. All passed: ${allPassed}`)

  return NextResponse.json({
    ...results,
    summary: {
      allTestsPassed: allPassed,
      passedTests: Object.values(results.tests).filter(test => test.status === 'success').length,
      totalTests: Object.keys(results.tests).length
    }
  })
} 