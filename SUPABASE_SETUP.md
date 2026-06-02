# 🚀 Supabase + Vercel Setup Guide

## Khalid & Sons Petroleum - Multi-Tenant Authentication

### 📋 Step 1: Supabase Setup

#### 1.1 Create Supabase Project
```
1. Go to https://supabase.com
2. Click "Start your project"
3. Create new organization (if needed)
4. Create new project:
   - Name: petrol-pump-management
   - Database Password: [strong password]
   - Region: Southeast Asia (Singapore) - closest to Pakistan
```

#### 1.2 Get API Keys
```
1. Go to Project Settings → API
2. Copy these keys:
   - Project URL: https://xxxxx.supabase.co
   - anon/public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 1.3 Update config.js
```javascript
// js/config.js
const SUPABASE_URL = 'YOUR_PROJECT_URL';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

window.config = {
  SUPABASE_URL,
  SUPABASE_ANON_KEY
};

window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

### 📊 Step 2: Database Tables (Already have these!)

Your existing tables are perfect for multi-tenant:

```sql
-- customers table
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id), -- Add this for multi-tenant
  sr_no INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  category VARCHAR(50),
  balance DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- transactions table
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id), -- Add this for multi-tenant
  customer_id INTEGER REFERENCES customers(id),
  tank_id INTEGER REFERENCES tanks(id),
  transaction_type VARCHAR(50),
  amount DECIMAL(12,2),
  liters DECIMAL(10,2),
  unit_price DECIMAL(10,2),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- tanks table
CREATE TABLE tanks (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id), -- Add this for multi-tenant
  name VARCHAR(100),
  fuel_type VARCHAR(50),
  capacity DECIMAL(12,2),
  current_stock DECIMAL(12,2),
  last_updated TIMESTAMP DEFAULT NOW()
);
```

### 🔐 Step 3: Row Level Security (RLS)

Enable RLS to ensure users only see their own data:

```sql
-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tanks ENABLE ROW LEVEL SECURITY;

-- Customers policies
CREATE POLICY "Users can view own customers"
  ON customers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own customers"
  ON customers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own customers"
  ON customers FOR UPDATE
  USING (auth.uid() = user_id);

-- Transactions policies
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Tanks policies
CREATE POLICY "Users can view own tanks"
  ON tanks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own tanks"
  ON tanks FOR ALL
  USING (auth.uid() = user_id);
```

### 🎯 Step 4: Authentication Setup

#### 4.1 Enable Email Auth
```
1. Go to Authentication → Providers
2. Enable "Email"
3. Configure email templates (optional)
```

#### 4.2 Email Templates (Optional)
```
Authentication → Email Templates

Customize:
- Confirm signup
- Magic Link
- Reset password
```

### 🚀 Step 5: Vercel Deployment

#### 5.1 Prepare for Vercel
```json
// vercel.json (create this file)
{
  "version": 2,
  "builds": [
    {
      "src": "*.html",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/",
      "dest": "/login.html"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ]
}
```

#### 5.2 Environment Variables
```
In Vercel Dashboard → Settings → Environment Variables

Add:
SUPABASE_URL = your_project_url
SUPABASE_ANON_KEY = your_anon_key
```

#### 5.3 Deploy to Vercel
```bash
# Option 1: Using Vercel CLI
npm i -g vercel
vercel login
vercel

# Option 2: GitHub Integration
1. Push code to GitHub
2. Import project in Vercel
3. Deploy automatically
```

### 🔄 Step 6: Initial Data Setup

For each new user, auto-create default tanks:

```javascript
// Add to signup process
async function initializeUserData(userId) {
  // Create default tanks
  await supabase.from('tanks').insert([
    {
      user_id: userId,
      name: 'Petrol Tank',
      fuel_type: 'Petrol',
      capacity: 25000,
      current_stock: 0
    },
    {
      user_id: userId,
      name: 'Diesel Tank',
      fuel_type: 'Diesel',
      capacity: 25000,
      current_stock: 0
    },
    {
      user_id: userId,
      name: 'Car Mobil',
      fuel_type: 'Car Mobil',
      capacity: 1000,
      current_stock: 0
    },
    {
      user_id: userId,
      name: 'Open Mobil',
      fuel_type: 'Open Mobil',
      capacity: 1000,
      current_stock: 0
    }
  ]);

  // Create owner customer account
  await supabase.from('customers').insert([
    {
      user_id: userId,
      sr_no: 0,
      name: 'Owner',
      category: 'Owner',
      balance: 0
    }
  ]);
}
```

### 📱 Step 7: Multi-Tenant Features

#### How it works:
1. **User signs up** → Gets unique user_id
2. **All data tagged** with user_id
3. **RLS ensures** users only see their data
4. **Pump name customizable** per user

#### Multiple Pumps (Demo):
```javascript
// Option 1: Same account, different pump profiles
localStorage.setItem('current_pump_id', 'pump_1');

// Option 2: Different accounts for each pump
// Each pump owner creates separate account
```

### ✅ Testing Checklist

- [ ] Supabase project created
- [ ] API keys configured
- [ ] Database tables created
- [ ] RLS policies enabled
- [ ] Email auth configured
- [ ] Vercel deployed
- [ ] Test signup flow
- [ ] Test login
- [ ] Test data isolation
- [ ] Test pump customization

### 🎉 Result

✅ Each user has their own:
- Customers
- Transactions
- Tanks
- Settings
- Pump name/details

✅ Completely isolated data
✅ Secure authentication
✅ Scalable to unlimited users
✅ Works on Vercel

### 📞 Support

For any issues:
1. Check Supabase logs
2. Check browser console
3. Verify RLS policies
4. Test with different accounts