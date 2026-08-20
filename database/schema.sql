-- =============================================================================
-- READY2LEARN & DR. CHITRA SANKAR CLINICAL PLATFORM DATABASE SCHEMA
-- Relational SQLite Database for User Profiles, Cross-Device Sync & Clinical Hub
-- =============================================================================

-- 1. Users table (Parents, Admin & Clinicians)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  parent_name TEXT DEFAULT 'Parent',
  role TEXT DEFAULT 'user',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME,
  last_synced_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. Children table (Supports multi-child tracking)
CREATE TABLE IF NOT EXISTS children (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  child_name TEXT NOT NULL,
  dob_day INTEGER,
  dob_month INTEGER,
  dob_year INTEGER,
  gender TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_children_user_id ON children(user_id);

-- 3. Milestone Progress table (Granular state: achieved | emerging | notyet)
CREATE TABLE IF NOT EXISTS milestone_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  child_id TEXT,
  stage_id TEXT NOT NULL,
  domain_key TEXT NOT NULL,
  milestone_idx INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('achieved', 'emerging', 'notyet')),
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, stage_id, domain_key, milestone_idx)
);

CREATE INDEX IF NOT EXISTS idx_milestones_lookup ON milestone_progress(user_id, stage_id, domain_key);

-- 4. Activity Checklists table (Parent-child activity tracking)
CREATE TABLE IF NOT EXISTS activity_checklists (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  child_id TEXT,
  stage_id TEXT NOT NULL,
  domain_key TEXT NOT NULL,
  activity_idx INTEGER NOT NULL,
  checked INTEGER DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, stage_id, domain_key, activity_idx)
);

-- 5. Small Wins Journal table (Parent qualitative observation notes)
CREATE TABLE IF NOT EXISTS small_wins (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  child_id TEXT,
  stage_id TEXT NOT NULL,
  domain_key TEXT NOT NULL,
  notes TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, stage_id, domain_key)
);

-- 6. Stage Unlocks table (Purchased & Dev-unlocked age stages)
CREATE TABLE IF NOT EXISTS stage_unlocks (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  email TEXT NOT NULL COLLATE NOCASE,
  stage_id TEXT NOT NULL,
  order_id TEXT,
  payment_id TEXT,
  amount INTEGER DEFAULT 0,
  is_dev_unlock INTEGER DEFAULT 0,
  unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(email, stage_id)
);

CREATE INDEX IF NOT EXISTS idx_unlocks_email ON stage_unlocks(email);

-- 7. Orders table (E-commerce & stage purchases)
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_id TEXT UNIQUE NOT NULL,
  user_id TEXT,
  customer_name TEXT,
  customer_email TEXT NOT NULL COLLATE NOCASE,
  items_json TEXT NOT NULL,
  total_amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'INR',
  status TEXT DEFAULT 'pending',
  payment_id TEXT,
  signature TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(customer_email);

-- 8. Waitlist Inquiries table (Clinic appointments)
CREATE TABLE IF NOT EXISTS waitlist_inquiries (
  id TEXT PRIMARY KEY,
  parent_name TEXT NOT NULL,
  email TEXT NOT NULL COLLATE NOCASE,
  phone TEXT,
  child_name TEXT,
  child_age TEXT,
  concerns TEXT,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 9. Contact Messages table
CREATE TABLE IF NOT EXISTS contact_messages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL COLLATE NOCASE,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'unread',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 10. System & App Configuration
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
