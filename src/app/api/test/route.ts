import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Test Supabase connection
    const { data, error } = await supabase
      .from('leads')
      .select('count')
      .limit(1)

    if (error) {
      return NextResponse.json({
        status: 'error',
        message: 'Supabase connection failed',
        error: error.message
      }, { status: 500 })
    }

    // Test environment variables
    const envCheck = {
      supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      anthropicKey: !!process.env.ANTHROPIC_API_KEY,
      serviceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    }

    return NextResponse.json({
      status: 'success',
      message: 'API test successful',
      envCheck,
      supabaseConnected: true
    })

  } catch (error) {
    console.error('Test API error:', error)
    return NextResponse.json({
      status: 'error',
      message: 'Test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 