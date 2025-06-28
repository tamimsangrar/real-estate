import { NextRequest, NextResponse } from 'next/server'
import { chatWithRoy, calculateLeadScore, findRelevantListings } from '@/lib/ai'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  console.log('🔄 Chat API called at:', new Date().toISOString())
  
  try {
    // Parse request body
    let body
    try {
      body = await request.json()
      console.log('📥 Request body parsed successfully:', { 
        hasMessages: !!body.messages, 
        messageCount: body.messages?.length,
        hasLeadInfo: !!body.leadInfo,
        messageCountParam: body.messageCount 
      })
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError)
      return NextResponse.json({ 
        error: 'Invalid JSON in request body',
        details: parseError instanceof Error ? parseError.message : 'Unknown parsing error'
      }, { status: 400 })
    }

    const { messages, leadInfo = {}, messageCount = 0 } = body

    // Validate required fields
    if (!messages || !Array.isArray(messages)) {
      console.error('❌ Invalid messages format:', { messages })
      return NextResponse.json({ 
        error: 'Messages must be an array',
        received: typeof messages
      }, { status: 400 })
    }

    // Check environment variables
    console.log('🔧 Environment check:', {
      hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      anthropicKeyPrefix: process.env.ANTHROPIC_API_KEY?.substring(0, 10) + '...',
    })

    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('❌ Missing ANTHROPIC_API_KEY environment variable')
      return NextResponse.json({ 
        error: 'Claude AI not configured',
        details: 'Missing ANTHROPIC_API_KEY environment variable'
      }, { status: 500 })
    }

    // Test Supabase connection
    try {
      console.log('🔄 Testing Supabase connection...')
      const { error: supabaseError } = await supabase
        .from('leads')
        .select('count')
        .limit(1)
      
      if (supabaseError) {
        console.error('❌ Supabase connection failed:', supabaseError)
        return NextResponse.json({ 
          error: 'Database connection failed',
          details: supabaseError.message
        }, { status: 500 })
      }
      console.log('✅ Supabase connection successful')
    } catch (supabaseTestError) {
      console.error('❌ Supabase test error:', supabaseTestError)
      return NextResponse.json({ 
        error: 'Database test failed',
        details: supabaseTestError instanceof Error ? supabaseTestError.message : 'Unknown database error'
      }, { status: 500 })
    }

    // Call Claude AI
    let responses
    try {
      console.log('🔄 Calling Claude AI...')
      responses = await chatWithRoy(messages, leadInfo, messageCount)
      console.log('✅ Claude AI response received:', { 
        responseCount: responses.length,
        firstResponseLength: responses[0]?.length 
      })
    } catch (aiError) {
      console.error('❌ Claude AI error:', aiError)
      return NextResponse.json({ 
        error: 'AI service failed',
        details: aiError instanceof Error ? aiError.message : 'Unknown AI error'
      }, { status: 500 })
    }

    // Calculate lead score
    let leadScore
    try {
      leadScore = calculateLeadScore(leadInfo)
      console.log('✅ Lead score calculated:', leadScore)
    } catch (scoreError) {
      console.error('❌ Lead scoring error:', scoreError)
      leadScore = 0
    }

    // Find relevant listings
    let listings: unknown[] = []
    try {
      listings = findRelevantListings(leadInfo)
      console.log('✅ Listings found:', listings.length)
    } catch (listingsError) {
      console.error('❌ Listings search error:', listingsError)
    }

    // Update or create lead in database
    try {
      console.log('🔄 Updating lead in database...')
      const { data: existingLead, error: fetchError } = await supabase
        .from('leads')
        .select('id')
        .eq('email', leadInfo.email || '')
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('❌ Error fetching existing lead:', fetchError)
      }

      if (existingLead) {
        console.log('🔄 Updating existing lead:', existingLead.id)
        const { error: updateError } = await supabase
          .from('leads')
          .update({
            name: leadInfo.name || '',
            phone: leadInfo.phone || '',
            rent_or_buy: leadInfo.rent_or_buy || '',
            area: leadInfo.area || '',
            amenities: leadInfo.amenities || [],
            budget_range: leadInfo.budget_range || '',
            urgency: leadInfo.urgency || '',
            lead_score: leadScore,
            status: 'contacted',
            conversation_summary: messages.slice(-3).map(m => m.content).join('; '),
            notes: `Last message count: ${messageCount}`
          })
          .eq('id', existingLead.id)

        if (updateError) {
          console.error('❌ Error updating lead:', updateError)
        } else {
          console.log('✅ Lead updated successfully')
        }
      } else {
        console.log('🔄 Creating new lead...')
        const { error: insertError } = await supabase
          .from('leads')
          .insert({
            name: leadInfo.name || '',
            email: leadInfo.email || '',
            phone: leadInfo.phone || '',
            rent_or_buy: leadInfo.rent_or_buy || '',
            area: leadInfo.area || '',
            amenities: leadInfo.amenities || [],
            budget_range: leadInfo.budget_range || '',
            urgency: leadInfo.urgency || '',
            lead_score: leadScore,
            status: 'new',
            conversation_summary: messages.slice(-3).map(m => m.content).join('; '),
            notes: `Initial message count: ${messageCount}`
          })

        if (insertError) {
          console.error('❌ Error creating lead:', insertError)
        } else {
          console.log('✅ New lead created successfully')
        }
      }
    } catch (dbError) {
      console.error('❌ Database operation error:', dbError)
      // Don't fail the request if database update fails
    }

    console.log('✅ Chat API completed successfully')
    return NextResponse.json({
      responses,
      leadScore,
      listings,
      debug: {
        messageCount,
        leadInfoKeys: Object.keys(leadInfo),
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Unexpected error in chat API:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}

 