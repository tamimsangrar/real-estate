# Roy's Real Estate Lead Generation System

A best-in-class lead generation system for real estate agents featuring an AI-powered chatbot, lead scoring, and comprehensive admin dashboard.

## Features

### 🏠 Landing Page
- Professional, warm design inspired by Anthropic's aesthetic
- Hero section with prominent "Chat with Roy" CTA
- About Roy section highlighting experience and expertise
- Services overview and testimonials

### 🤖 AI Chatbot
- Claude-powered conversational AI with real estate expertise
- Dynamic online/offline status simulation
- Intelligent lead qualification and information gathering
- Natural conversation flow with personality

### 📊 Lead Management
- Automatic lead scoring (1-10 scale)
- Comprehensive lead information tracking
- Conversation history and summaries
- Status tracking (new, contacted, converted, lost)

### 📱 Admin Dashboard
- Real-time lead overview with statistics
- Advanced filtering and search capabilities
- Lead scoring visualization
- Call tracking and status management

### 🎯 Lead Scoring System
- **Basic Information** (0-3 points): Name, email, phone
- **Property Preferences** (0-3 points): Rent/buy, area, amenities
- **Budget & Urgency** (0-4 points): Budget range, timeline urgency

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **AI**: Anthropic Claude 3.5 Sonnet
- **UI**: Framer Motion, Lucide React, Headless UI
- **Deployment**: Netlify

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd leasing_agent
npm install
```

### 2. Environment Setup

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Anthropic Configuration
ANTHROPIC_API_KEY=your_anthropic_api_key

# ElevenLabs Configuration (for future voice features)
ELEVENLABS_API_KEY=your_elevenlabs_api_key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Database Setup

1. Create a new Supabase project
2. Run the SQL schema from `supabase-schema.sql` in your Supabase SQL editor
3. Copy your Supabase URL and anon key to `.env.local`

### 4. AI Setup

1. Get an Anthropic API key from [console.anthropic.com](https://console.anthropic.com)
2. Add it to your `.env.local` file

### 5. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see the landing page and `http://localhost:3000/admin` for the dashboard.

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── admin/
│   │   └── page.tsx          # Admin dashboard
│   └── layout.tsx            # Root layout
├── components/
│   └── ChatInterface.tsx     # Chat component
├── lib/
│   ├── supabase.ts          # Supabase client & types
│   └── ai.ts                # AI integration & scoring
└── globals.css              # Global styles
```

## Database Schema

### Leads Table
- `id`: Unique identifier
- `name`, `email`, `phone`: Contact information
- `rent_or_buy`: Property preference
- `area`: Desired location
- `amenities`: Array of desired amenities
- `budget_range`, `urgency`: Financial and timeline info
- `lead_score`: 1-10 scoring
- `status`: Lead status tracking
- `phone_call_made`: Call tracking
- `conversation_summary`: AI-generated summary
- `notes`: Additional notes

### Conversations Table
- `lead_id`: Reference to lead
- `message`: Chat message content
- `is_user`: Message sender flag
- `timestamp`: Message timestamp

## Customization

### AI Personality
Edit the `ROY_META_PROMPT` in `src/lib/ai.ts` to customize Roy's personality and conversation style.

### Lead Scoring
Modify the `calculateLeadScore` function in `src/lib/ai.ts` to adjust scoring criteria.

### Styling
Update Tailwind classes in components to match your branding.

## Deployment

### Netlify Deployment

1. Connect your GitHub repository to Netlify
2. Set environment variables in Netlify dashboard
3. Deploy automatically on push to main branch

### Environment Variables for Production

Make sure to set all environment variables in your Netlify dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `ANTHROPIC_API_KEY`

## Future Enhancements

- [ ] ElevenLabs voice integration for phone calls
- [ ] Email automation for follow-ups
- [ ] Advanced lead analytics and reporting
- [ ] Multi-agent support
- [ ] Integration with CRM systems
- [ ] SMS notifications
- [ ] Property listing integration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support or questions, please open an issue in the repository.
