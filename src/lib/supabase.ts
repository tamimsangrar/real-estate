import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Lead {
  id: string
  created_at: string
  name: string
  email: string
  phone?: string
  rent_or_buy: 'rent' | 'buy'
  area: string
  amenities: string[]
  budget_range?: string
  urgency?: string
  lead_score: number
  status: 'new' | 'contacted' | 'converted' | 'lost'
  phone_call_made: boolean
  conversation_summary: string
  notes: string
  updated_at: string
}

export interface Conversation {
  id: string
  lead_id: string
  message: string
  is_user: boolean
  timestamp: string
} 