# Deployment Guide for Roy's Real Estate Lead Generation System

## Required Environment Variables

Before deploying to Netlify, you'll need to set up these environment variables:

### Supabase Configuration
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Claude AI Configuration
```
ANTHROPIC_API_KEY=your_anthropic_api_key
```

### ElevenLabs Configuration (for phone calls)
```
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_AGENT_ID=your_elevenlabs_agent_id
```

## Deployment Steps

1. **Prepare your repository**
   - Commit all changes to Git
   - Push to GitHub/GitLab

2. **Deploy to Netlify**
   - Go to [netlify.com](https://netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect your Git repository
   - Set build command: `npm run build`
   - Set publish directory: `.next`

3. **Set Environment Variables in Netlify**
   - Go to Site settings → Environment variables
   - Add each variable listed above

4. **Deploy**
   - Netlify will automatically build and deploy your site
   - Your site will be available at a netlify.app URL

## Getting API Keys

### Supabase
1. Go to [supabase.com](https://supabase.com)
2. Create a new project or use existing
3. Go to Settings → API
4. Copy the URL and anon key

### Anthropic (Claude)
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an API key
3. Copy the key (starts with sk-ant-api03-)

### ElevenLabs
1. Go to [elevenlabs.io](https://elevenlabs.io)
2. Create an account and get API key
3. Create a conversational AI agent
4. Copy the API key and agent ID 