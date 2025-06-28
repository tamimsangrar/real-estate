-- Create leads table
CREATE TABLE leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT,
  email TEXT,
  phone TEXT,
  rent_or_buy TEXT CHECK (rent_or_buy IN ('rent', 'buy')),
  area TEXT,
  amenities TEXT[],
  budget_range TEXT,
  urgency TEXT,
  lead_score INTEGER DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 10),
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted', 'lost')),
  phone_call_made BOOLEAN DEFAULT FALSE,
  conversation_summary TEXT,
  notes TEXT
);

-- Create conversations table for detailed chat history
CREATE TABLE conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_user BOOLEAN NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_score ON leads(lead_score DESC);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_conversations_lead_id ON conversations(lead_id);
CREATE INDEX idx_conversations_timestamp ON conversations(timestamp);

-- Enable Row Level Security (RLS)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Create policies for public read/write access (for demo purposes)
-- In production, you'd want more restrictive policies
CREATE POLICY "Allow public read access to leads" ON leads
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to leads" ON leads
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to leads" ON leads
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access to leads" ON leads
  FOR DELETE USING (true);

CREATE POLICY "Allow public read access to conversations" ON conversations
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to conversations" ON conversations
  FOR INSERT WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data for testing
INSERT INTO leads (name, email, phone, rent_or_buy, area, amenities, budget_range, urgency, lead_score, status, phone_call_made, conversation_summary, notes) VALUES
('John Smith', 'john@example.com', '+1234567890', 'buy', 'Downtown', ARRAY['parking', 'gym'], '$500k-$750k', 'within 3 months', 8, 'contacted', true, 'Interested in downtown condos with parking and gym access. Budget $500k-$750k, looking to buy within 3 months.', 'High priority lead - ready to buy'),
('Sarah Johnson', 'sarah@example.com', '+1234567891', 'rent', 'Suburbs', ARRAY['schools', 'parks'], '$2000-$3000/month', 'asap', 6, 'new', false, 'Looking to rent in suburbs with good schools and parks. Budget $2000-$3000/month, needs to move ASAP.', 'Good lead - urgent rental need'),
('Mike Wilson', 'mike@example.com', NULL, 'buy', 'Westside', ARRAY['restaurants', 'shopping'], '$300k-$450k', 'flexible', 4, 'new', false, 'Interested in buying on westside near restaurants and shopping. Budget $300k-$450k, flexible timeline.', 'Medium priority - gathering more info'); 