# Database Setup for PureFood Application

This document outlines the database tables you need to create in Supabase for the user authentication system to work properly.

## Tables Required

### 1. test_requests
This table stores all food test requests submitted by users.

**Columns:**
- `id` (bigint, primary key, auto-increment)
- `created_at` (timestamp with time zone, default: now())
- `user_id` (uuid, foreign key to auth.users) - **NEW: Associates request with user**
- `barcode` (bigint)
- `product_name` (text)
- `brand` (text)
- `category` (text)
- `test_types` (text) - JSON array stored as text
- `status` (text) - values: 'pending', 'testing', 'complete'
- `item_price` (bigint) - price in cents
- `test_cost` (bigint) - total cost in cents
- `current_funding` (bigint, default: 0) - current funding in cents

**SQL to create/modify:**
```sql
-- Add user_id column if upgrading existing table
ALTER TABLE test_requests
ADD COLUMN user_id uuid REFERENCES auth.users(id);

-- Or create new table:
CREATE TABLE test_requests (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    created_at timestamp with time zone DEFAULT now(),
    user_id uuid REFERENCES auth.users(id),
    barcode bigint,
    product_name text,
    brand text,
    category text,
    test_types text,
    status text DEFAULT 'pending',
    item_price bigint,
    test_cost bigint,
    current_funding bigint DEFAULT 0
);
```

### 2. pledges (NEW TABLE)
This table tracks individual pledges made by users to support test requests.

**Columns:**
- `id` (bigint, primary key, auto-increment)
- `created_at` (timestamp with time zone, default: now())
- `user_id` (uuid, foreign key to auth.users)
- `test_request_id` (bigint, foreign key to test_requests)
- `amount` (bigint) - pledge amount in cents

**SQL to create:**
```sql
CREATE TABLE pledges (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    created_at timestamp with time zone DEFAULT now(),
    user_id uuid REFERENCES auth.users(id),
    test_request_id bigint REFERENCES test_requests(id),
    amount bigint NOT NULL
);
```

### 3. test_pricing
This table stores the current pricing for different test types.

**Columns:**
- `id` (bigint, primary key, auto-increment)
- `created_at` (timestamp with time zone, default: now())
- `heavy_metals` (bigint) - price in cents
- `pesticide` (bigint) - price in cents
- `PFAS` (bigint) - price in cents
- `microplastic` (bigint) - price in cents

**SQL to create:**
```sql
CREATE TABLE test_pricing (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    created_at timestamp with time zone DEFAULT now(),
    heavy_metals bigint,
    pesticide bigint,
    PFAS bigint,
    microplastic bigint
);

-- Insert default pricing (example values in cents)
INSERT INTO test_pricing (heavy_metals, pesticide, PFAS, microplastic)
VALUES (15000, 12000, 18000, 20000);
```

## Row Level Security (RLS) Policies

To ensure users can only access their own data, set up these RLS policies:

### test_requests policies:
```sql
-- Enable RLS
ALTER TABLE test_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view test requests
CREATE POLICY "Test requests are viewable by everyone"
ON test_requests FOR SELECT
USING (true);

-- Policy: Users can insert their own test requests
CREATE POLICY "Users can create their own test requests"
ON test_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own test requests
CREATE POLICY "Users can update their own test requests"
ON test_requests FOR UPDATE
USING (auth.uid() = user_id);
```

### pledges policies:
```sql
-- Enable RLS
ALTER TABLE pledges ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own pledges
CREATE POLICY "Users can view their own pledges"
ON pledges FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can create their own pledges
CREATE POLICY "Users can create pledges"
ON pledges FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

### test_pricing policies:
```sql
-- Enable RLS
ALTER TABLE test_pricing ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view pricing
CREATE POLICY "Pricing is viewable by everyone"
ON test_pricing FOR SELECT
USING (true);
```

## Authentication Setup

Make sure you have enabled email authentication in Supabase:
1. Go to Authentication > Providers in your Supabase dashboard
2. Enable Email provider
3. Configure email templates as needed

## Environment Variables

Make sure your Vercel deployment has these environment variables set:
- `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Testing the Setup

1. Sign up for a new account at `/auth.html`
2. Confirm your email (if required)
3. Sign in
4. Submit a test request - it should be associated with your user ID
5. Make a pledge on another test request
6. View your profile at `/profile.html` to see your requests and pledges
