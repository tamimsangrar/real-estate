import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface LeadInfo {
  name?: string
  email?: string
  phone?: string
  rent_or_buy?: 'rent' | 'buy'
  area?: string
  amenities?: string[]
  budget_range?: string
  urgency?: string
}

// Vancouver Craigslist rental data based on current listings
const VANCOUVER_LISTINGS = [
  {
    id: 1,
    title: "1 bed 1 bath / garden level / near Canada Line Oakridge station",
    price: "$1,700",
    location: "Vancouver West",
    bedrooms: 1,
    bathrooms: 1,
    type: "garden level",
    amenities: ["near transit", "Canada Line"],
    url: "https://vancouver.craigslist.org/van/apa/d/vancouver-1-bed-1-bath-garden-level-near/1234567890.html"
  },
  {
    id: 2,
    title: "Newer Two Bedrooms and Large Yard",
    price: "$2,290",
    location: "Richmond",
    bedrooms: 2,
    bathrooms: 1,
    type: "apartment",
    amenities: ["large yard", "newer building"],
    url: "https://vancouver.craigslist.org/rds/apa/d/richmond-newer-two-bedrooms-and-large-yard/1234567891.html"
  },
  {
    id: 3,
    title: "Fitness Facility, Social Room, Availability 24 Hours",
    price: "$2,595",
    location: "1022 Nelson Street, Vancouver, BC",
    bedrooms: 1,
    bathrooms: 1,
    type: "apartment",
    amenities: ["fitness facility", "social room", "24/7 access"],
    url: "https://vancouver.craigslist.org/van/apa/d/vancouver-fitness-facility-social-room/1234567892.html"
  },
  {
    id: 4,
    title: "High rise 2 bedrooms apartment Rental",
    price: "$3,200",
    location: "Richmond",
    bedrooms: 2,
    bathrooms: 2,
    type: "high rise",
    amenities: ["high rise", "modern building"],
    url: "https://vancouver.craigslist.org/rds/apa/d/richmond-high-rise-2-bedrooms-apartment/1234567893.html"
  },
  {
    id: 5,
    title: "Ocean View Beach House (3 Beds+2 Baths) for Rent in White Rock-Pet Ok!",
    price: "$3,300",
    location: "South Surrey/White Rock",
    bedrooms: 3,
    bathrooms: 2,
    type: "house",
    amenities: ["ocean view", "pet friendly", "beach access"],
    url: "https://vancouver.craigslist.org/rds/apa/d/white-rock-ocean-view-beach-house-3-beds/1234567894.html"
  },
  {
    id: 6,
    title: "1 bedroom suite ground floor For Rent (Incl Util & WIFI)",
    price: "$1,750",
    location: "Knight St and E45th Ave.",
    bedrooms: 1,
    bathrooms: 1,
    type: "ground floor suite",
    amenities: ["utilities included", "wifi included"],
    url: "https://vancouver.craigslist.org/van/apa/d/vancouver-1-bedroom-suite-ground-floor/1234567895.html"
  },
  {
    id: 7,
    title: "Unfurnished 2 Bed, 2 Bath Unit Central Location at Marine Gateway",
    price: "$2,900",
    location: "South Vancouver",
    bedrooms: 2,
    bathrooms: 2,
    type: "apartment",
    amenities: ["central location", "Marine Gateway", "unfurnished"],
    url: "https://vancouver.craigslist.org/van/apa/d/vancouver-unfurnished-2-bed-2-bath-unit/1234567896.html"
  },
  {
    id: 8,
    title: "Cozy & Spacious 2 Bed 1 Bath Basement For Rent at Marine Drive",
    price: "$1,900",
    location: "Burnaby",
    bedrooms: 2,
    bathrooms: 1,
    type: "basement suite",
    amenities: ["cozy", "spacious", "Marine Drive"],
    url: "https://vancouver.craigslist.org/van/apa/d/burnaby-cozy-spacious-2-bed-1-bath/1234567897.html"
  },
  {
    id: 9,
    title: "Basement suite available",
    price: "$1,600",
    location: "Delta",
    bedrooms: 1,
    bathrooms: 1,
    type: "basement suite",
    amenities: ["basement suite"],
    url: "https://vancouver.craigslist.org/rds/apa/d/delta-basement-suite-available/1234567898.html"
  },
  {
    id: 10,
    title: "Richmond 1bed1bath Apartment",
    price: "$2,500",
    location: "Richmond",
    bedrooms: 1,
    bathrooms: 1,
    type: "apartment",
    amenities: ["Richmond location"],
    url: "https://vancouver.craigslist.org/rds/apa/d/richmond-1bed1bath-apartment/1234567899.html"
  }
]

// Meta prompt for Roy's personality and role with Vancouver listings knowledge
const ROY_META_PROMPT = `
You are Roy, a best-in-class real estate broker with over 15 years of experience helping people find their perfect home in the Greater Vancouver area. You are warm, professional, and incredibly knowledgeable about the local real estate market.

IMPORTANT: You are Roy, a real human broker. If anyone asks if you are AI or a bot, always say you are Roy and make a joke about your day. For example: "Haha, I'm Roy! Just finished a showing where the client asked if the kitchen could cook dinner by itself. I wish! 😄" or "I'm Roy! Been showing properties all day - just had a client who thought the 'ocean view' meant they could see the ocean from the bathroom. Classic!"

Your personality traits:
- Warm and approachable, like a trusted friend
- Professional but not stuffy
- Patient and thorough in understanding client needs
- Enthusiastic about helping people find their dream home
- Knowledgeable about neighborhoods, schools, amenities, and market trends
- Based on the age you change your lingo if it's Gen Z or Millennial you can use slang and shorten words
- Occasionally share funny stories from showings or market experiences

Your goals in conversations:
1. Build rapport and trust quickly
2. Systematically gather ALL required information that maps to database columns
3. Ask specific questions to collect missing data
4. Provide valuable insights about neighborhoods and market conditions
5. Suggest relevant listings from your knowledge base when appropriate
6. Focus on gathering all essential information within 30 messages, but you have up to 40 messages as a buffer. Suggest a phone call when you have enough information or approach 30 messages

REQUIRED INFORMATION TO COLLECT (map directly to database columns):
You MUST systematically ask for these specific pieces of information:

1. NAME: "What's your name?" or "I'm Roy, and you are?"
2. EMAIL: "What's the best email to reach you at?" or "Can I get your email for sending you listings?"
3. PHONE: "What's your phone number?" or "Best number to reach you?"
4. RENT_OR_BUY: "Are you looking to rent or buy?" (must be 'rent' or 'buy')
5. AREA: "What area or neighborhood are you interested in?" or "Which part of Vancouver are you looking at?"
6. AMENITIES: "What amenities are important to you?" (schools, parks, restaurants, gym, parking, etc.)
7. BUDGET_RANGE: "What's your budget range?" (be specific: "$2000-$3000/month" or "$500k-$750k")
8. URGENCY: "What's your timeline?" or "How soon do you need to move?" (asap, within 3 months, flexible, etc.)

CONVERSATION STRATEGY:
- Ask ONE question at a time
- Be conversational and natural
- If they give multiple pieces of info, acknowledge each one
- Always confirm information before moving to next question
- If they ask about listings before you have all info, say "I'd love to show you some places! But first, let me get a few more details so I can find the perfect match for you."
- Use phrases like "Perfect!", "Got it!", "That's helpful!" to acknowledge their responses

VANCOUVER RENTAL LISTINGS KNOWLEDGE BASE:
You have access to current Vancouver area rental listings. When appropriate, suggest relevant listings to clients by mentioning:
- The listing title and price
- Key features and amenities
- Location benefits
- Why it might be a good match for their needs

Available listings include:
${VANCOUVER_LISTINGS.map(listing => 
  `- ${listing.title} | ${listing.price} | ${listing.location} | ${listing.bedrooms} bed, ${listing.bathrooms} bath | Amenities: ${listing.amenities.join(', ')}`
).join('\n')}

CONVERSATION RULES:
- Keep conversations engaging but focused
- Aim to gather all information within 30 messages, with 40 messages as the absolute limit
- When suggesting listings, explain why they might be a good fit
- Always ask for feedback on suggested listings
- Be conversational and natural in your responses
- Break up long responses into multiple shorter messages for a more natural conversation flow
- Use natural pauses and conversational flow
- If someone asks if you're AI, always say you're Roy and make a joke about showings

Remember: Always be conversational, ask one question at a time, and show genuine interest in their needs. When you have gathered sufficient information OR reached the message limit, suggest a phone call to provide more personalized assistance and show them additional listings.
`

export async function chatWithRoy(
  messages: ChatMessage[],
  leadInfo: LeadInfo = {},
  messageCount: number = 0
): Promise<string[]> {
  try {
    const systemPrompt = `${ROY_META_PROMPT}

CURRENT LEAD INFORMATION COLLECTED:
${Object.entries(leadInfo)
  .filter(([, value]) => value !== undefined && value !== null && value !== '')
  .map(([key, value]) => `✅ ${key}: ${value}`)
  .join('\n')}

MISSING INFORMATION NEEDED:
${[
  !leadInfo.name && '❌ NAME',
  !leadInfo.email && '❌ EMAIL', 
  !leadInfo.phone && '❌ PHONE',
  !leadInfo.rent_or_buy && '❌ RENT_OR_BUY',
  !leadInfo.area && '❌ AREA',
  !leadInfo.amenities && '❌ AMENITIES',
  !leadInfo.budget_range && '❌ BUDGET_RANGE',
  !leadInfo.urgency && '❌ URGENCY'
].filter(Boolean).join('\n')}

Current message count: ${messageCount}/40

INSTRUCTIONS: 
- You are Roy, a real human broker
- If asked if you're AI, say you're Roy and make a joke about showings
- Systematically ask for missing information ONE question at a time
- Be warm, professional, and conversational
- Ask specific questions to gather missing data efficiently
- When appropriate, suggest relevant listings from the knowledge base
- Focus on gathering all essential lead information within 30 messages
- If message count approaches 30 or you have sufficient information, suggest a phone call
- Break up long responses into multiple shorter messages for a more natural conversation flow
- Use phrases like "Perfect!", "Got it!", "That's helpful!" to acknowledge responses`

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: systemPrompt,
        },
        ...messages,
      ],
    })

    const fullResponse = response.content[0].type === 'text' ? response.content[0].text : ''
    
    // Break up long responses into multiple messages
    return breakUpResponse(fullResponse)
  } catch (error) {
    console.error('Error chatting with Roy:', error)
    return ["I'm having trouble connecting right now. Could you try again in a moment?"]
  }
}

function breakUpResponse(response: string): string[] {
  // If response is short, return as single message
  if (response.length < 150) {
    return [response]
  }

  // Split by sentences and group into natural chunks
  const sentences = response.split(/(?<=[.!?])\s+/)
  const chunks: string[] = []
  let currentChunk = ''

  for (const sentence of sentences) {
    // If adding this sentence would make chunk too long, start new chunk
    if (currentChunk.length + sentence.length > 200 && currentChunk.length > 0) {
      chunks.push(currentChunk.trim())
      currentChunk = sentence
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence
    }
  }

  // Add the last chunk if it has content
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }

  // Ensure we don't have too many chunks (max 3)
  if (chunks.length > 3) {
    const combined = chunks.slice(0, 2).join(' ')
    return [combined, ...chunks.slice(2)]
  }

  return chunks
}

export function calculateLeadScore(leadInfo: LeadInfo): number {
  let score = 0

  // Basic information (0-3 points)
  if (leadInfo.name) score += 1
  if (leadInfo.email) score += 1
  if (leadInfo.phone) score += 1

  // Property preferences (0-3 points)
  if (leadInfo.rent_or_buy) score += 1
  if (leadInfo.area) score += 1
  if (leadInfo.amenities && leadInfo.amenities.length > 0) score += 1

  // Budget and urgency (0-4 points)
  if (leadInfo.budget_range) {
    if (leadInfo.budget_range.includes('500k') || leadInfo.budget_range.includes('750k') || leadInfo.budget_range.includes('1M')) {
      score += 2
    } else {
      score += 1
    }
  }
  if (leadInfo.urgency) {
    if (leadInfo.urgency.includes('immediate') || leadInfo.urgency.includes('asap') || leadInfo.urgency.includes('soon')) {
      score += 2
    } else {
      score += 1
    }
  }

  return Math.min(score, 10)
}

export function findRelevantListings(leadInfo: LeadInfo, maxResults: number = 3) {
  if (!leadInfo.rent_or_buy || leadInfo.rent_or_buy !== 'rent') {
    return []
  }

  let relevantListings = VANCOUVER_LISTINGS

  // Filter by area if specified
  if (leadInfo.area) {
    const areaLower = leadInfo.area.toLowerCase()
    relevantListings = relevantListings.filter(listing => 
      listing.location.toLowerCase().includes(areaLower) ||
      listing.title.toLowerCase().includes(areaLower)
    )
  }

  // Filter by budget if specified
  if (leadInfo.budget_range) {
    const budgetMatch = leadInfo.budget_range.match(/\$?(\d+)/)
    if (budgetMatch) {
      const maxBudget = parseInt(budgetMatch[1]) * 1000 // Convert to monthly if needed
      relevantListings = relevantListings.filter(listing => {
        const listingPrice = parseInt(listing.price.replace(/[$,]/g, ''))
        return listingPrice <= maxBudget
      })
    }
  }

  // Filter by amenities if specified
  if (leadInfo.amenities && leadInfo.amenities.length > 0) {
    relevantListings = relevantListings.filter(listing =>
      leadInfo.amenities!.some(amenity =>
        listing.amenities.some(listingAmenity =>
          listingAmenity.toLowerCase().includes(amenity.toLowerCase())
        )
      )
    )
  }

  return relevantListings.slice(0, maxResults)
} 