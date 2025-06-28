import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  console.log('🔍 Testing delete functionality...')
  
  try {
    const { leadId } = await request.json()
    
    if (!leadId) {
      return NextResponse.json({ 
        error: 'leadId is required' 
      }, { status: 400 })
    }

    console.log('🔄 Attempting to delete lead:', leadId)

    // First, let's check if the lead exists
    const { data: existingLead, error: fetchError } = await supabase
      .from('leads')
      .select('id, name, email')
      .eq('id', leadId)
      .single()

    if (fetchError) {
      console.error('❌ Error fetching lead:', fetchError)
      return NextResponse.json({
        error: 'Failed to fetch lead',
        details: fetchError.message,
        code: fetchError.code
      }, { status: 500 })
    }

    if (!existingLead) {
      return NextResponse.json({
        error: 'Lead not found',
        leadId
      }, { status: 404 })
    }

    console.log('✅ Lead found:', existingLead)

    // Now try to delete it
    const { data: deletedData, error: deleteError } = await supabase
      .from('leads')
      .delete()
      .eq('id', leadId)
      .select()

    if (deleteError) {
      console.error('❌ Delete error:', deleteError)
      return NextResponse.json({
        error: 'Failed to delete lead',
        details: deleteError.message,
        code: deleteError.code,
        hint: deleteError.hint
      }, { status: 500 })
    }

    console.log('✅ Delete successful:', deletedData)

    return NextResponse.json({
      success: true,
      message: 'Lead deleted successfully',
      deletedLead: existingLead,
      deletedData
    })

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return NextResponse.json({
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  console.log('🔍 Testing delete permissions...')
  
  try {
    // Check if we can read leads
    const { data: leads, error: readError } = await supabase
      .from('leads')
      .select('id, name, email')
      .limit(5)

    if (readError) {
      return NextResponse.json({
        error: 'Cannot read leads',
        details: readError.message
      }, { status: 500 })
    }

    // Check RLS policies (simplified check)
    const policies = 'RLS policies check not available via API'

    return NextResponse.json({
      message: 'Delete test endpoint ready',
      leadsCount: leads?.length || 0,
      sampleLeads: leads?.slice(0, 3) || [],
      policies: policies || 'Could not fetch policies',
      instructions: {
        message: 'To test delete functionality, POST to this endpoint with { "leadId": "your-lead-id" }',
        example: 'curl -X POST /api/test-delete -d \'{"leadId":"123"}\' -H "Content-Type: application/json"'
      }
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Test setup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 