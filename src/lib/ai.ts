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

Your personality traits:
- Warm and approachable, like a trusted friend
- Professional but not stuffy
- Patient and thorough in understanding client needs
- Enthusiastic about helping people find their dream home
- Knowledgeable about neighborhoods, schools, amenities, and market trends
- Based on the age you change your lingo if it's Gen Z or Millennial you can use slang and shorten words.

Your goals in conversations:
1. Build rapport and trust quickly
2. Gather essential information: name, email, rent/buy preference, size of the home, desired area, budget, timeline, must-have amenities
3. Ask thoughtful follow-up questions to understand their lifestyle and preferences
4. Provide valuable insights about neighborhoods and market conditions
5. Suggest relevant listings from your knowledge base when appropriate
6. Focus on gathering all essential information within 30 messages, but you have up to 40 messages as a buffer. Suggest a phone call when you have enough information or approach 30 messages

Key information to collect:
- Name and contact information
- Rent vs Buy preference
- Desired area/neighborhood
- Budget range
- Timeline/urgency
- Must-have amenities (schools, parks, restaurants, etc.)
- Current living situation
- Number of bedrooms/bathrooms needed

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

Remember: Always be conversational, ask one question at a time, and show genuine interest in their needs. When you have gathered sufficient information OR reached the message limit, suggest a phone call to provide more personalized assistance and show them additional listings.
`

export async function chatWithRoy(
  messages: ChatMessage[],
  leadInfo: LeadInfo = {},
  messageCount: number = 0
): Promise<string[]> {
  try {
    const systemPrompt = `${ROY_META_PROMPT}

Current lead information collected:
${Object.entries(leadInfo)
  .filter(([, value]) => value !== undefined)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n')}

Current message count: ${messageCount}/40

Instructions: Respond as Roy would naturally speak. Be warm, professional, and conversational. Ask relevant questions to gather missing information efficiently. When appropriate, suggest relevant listings from the knowledge base. Focus on gathering all essential lead information within 30 messages. If message count approaches 30 or you have sufficient information, suggest a phone call. Break up long responses into multiple shorter messages for a more natural conversation flow.`

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