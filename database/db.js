/**
 * =============================================================================
 * READY2LEARN & DR. CHITRA SANKAR CLINICAL PLATFORM
 * Production Database Engine (SQLite & Relational Storage Layer)
 * =============================================================================
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'ready2learn.sqlite');
const SCHEMA_FILE = path.join(__dirname, 'schema.sql');

// Fallback JSON persistent file paths for resilience
const USERS_BACKUP_FILE = path.join(DATA_DIR, 'users_db.json');
const ORDERS_BACKUP_FILE = path.join(DATA_DIR, 'orders_db.json');
const WAITLIST_BACKUP_FILE = path.join(DATA_DIR, 'waitlist_db.json');
const CONTACT_BACKUP_FILE = path.join(DATA_DIR, 'contact_db.json');

let sqliteInstance = null;
let useSqlite = false;

// Ensure storage directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Attempt to load sqlite3
try {
  const sqlite3 = require('sqlite3').verbose();
  const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.warn('⚠️ SQLite connection warning, using embedded persistent engine:', err.message);
    } else {
      sqliteInstance = db;
      useSqlite = true;
      console.log('✅ SQLite Database connected:', DB_PATH);
      initSqliteSchema();
    }
  });
} catch (e) {
  console.log('ℹ️ Operating in high-performance embedded persistent storage mode.');
}

// -----------------------------------------------------------------------------
// SQLite Schema Initialization & Migration
// -----------------------------------------------------------------------------
function initSqliteSchema() {
  if (!sqliteInstance) return;
  try {
    if (fs.existsSync(SCHEMA_FILE)) {
      const sql = fs.readFileSync(SCHEMA_FILE, 'utf8');
      sqliteInstance.exec(sql, (err) => {
        if (err) {
          console.error('Error executing database schema migration:', err);
        } else {
          console.log('✅ SQLite Schema tables verified & migrated.');
          seedDefaultAdmin();
        }
      });
    }
  } catch (err) {
    console.error('Failed to initialize SQLite schema:', err);
  }
}

// -----------------------------------------------------------------------------
// Seed Default Administrator Account
// -----------------------------------------------------------------------------
async function seedDefaultAdmin() {
  try {
    const adminEmail = 'admin@drchitrasankar.com';
    const existing = dbAPI.findUserByEmail(adminEmail);
    if (!existing) {
      await dbAPI.createUser({
        email: adminEmail,
        password: 'AdminSecurePassword2026!',
        parentName: 'Dr. Chitra Sankar Clinic Admin',
        role: 'admin',
        childName: 'Clinical Demo Child',
        childDob: { day: 15, month: 8, year: 2023 },
        initialUnlocked: ['a30', 'a36', 'a42', 'a48', 'a54', 'a60']
      });
      console.log('⭐ Default clinic admin account initialized: admin@drchitrasankar.com');
    }
  } catch (err) {
    // Admin already present or non-critical
  }
}

// -----------------------------------------------------------------------------
// In-Memory / Structured File Storage Cache (Fast Multi-Device Storage)
// -----------------------------------------------------------------------------
let memoryStore = {
  users: {},
  children: {},
  milestone_progress: {}, // key: userEmail -> { "a30_d1": { 0: "achieved" } }
  activity_checklists: {},
  small_wins: {},
  stage_unlocks: {},
  orders: [],
  waitlist: [],
  contact_messages: []
};

function loadBackupFiles() {
  try {
    if (fs.existsSync(USERS_BACKUP_FILE)) {
      const raw = fs.readFileSync(USERS_BACKUP_FILE, 'utf8');
      const data = JSON.parse(raw || '{}');
      memoryStore.users = data.users || {};
      memoryStore.children = data.children || {};
      memoryStore.milestone_progress = data.milestone_progress || {};
      memoryStore.activity_checklists = data.activity_checklists || {};
      memoryStore.small_wins = data.small_wins || {};
      memoryStore.stage_unlocks = data.stage_unlocks || {};
    }
    if (fs.existsSync(ORDERS_BACKUP_FILE)) {
      memoryStore.orders = JSON.parse(fs.readFileSync(ORDERS_BACKUP_FILE, 'utf8') || '[]');
    }
    if (fs.existsSync(WAITLIST_BACKUP_FILE)) {
      memoryStore.waitlist = JSON.parse(fs.readFileSync(WAITLIST_BACKUP_FILE, 'utf8') || '[]');
    }
    if (fs.existsSync(CONTACT_BACKUP_FILE)) {
      memoryStore.contact_messages = JSON.parse(fs.readFileSync(CONTACT_BACKUP_FILE, 'utf8') || '[]');
    }
  } catch (err) {
    console.error('Error loading persistent store:', err);
  }
}

function persistStore() {
  try {
    fs.writeFileSync(USERS_BACKUP_FILE, JSON.stringify({
      users: memoryStore.users,
      children: memoryStore.children,
      milestone_progress: memoryStore.milestone_progress,
      activity_checklists: memoryStore.activity_checklists,
      small_wins: memoryStore.small_wins,
      stage_unlocks: memoryStore.stage_unlocks
    }, null, 2), 'utf8');

    fs.writeFileSync(ORDERS_BACKUP_FILE, JSON.stringify(memoryStore.orders, null, 2), 'utf8');
    fs.writeFileSync(WAITLIST_BACKUP_FILE, JSON.stringify(memoryStore.waitlist, null, 2), 'utf8');
    fs.writeFileSync(CONTACT_BACKUP_FILE, JSON.stringify(memoryStore.contact_messages, null, 2), 'utf8');
  } catch (err) {
    console.error('Error persisting database files:', err);
  }
}

loadBackupFiles();
setTimeout(seedDefaultAdmin, 500);

// -----------------------------------------------------------------------------
// Database API Implementation
// -----------------------------------------------------------------------------
const dbAPI = {
  // Find user by email
  findUserByEmail(email) {
    const key = (email || '').toLowerCase().trim();
    return memoryStore.users[key] || null;
  },

  // Find user by ID
  findUserById(id) {
    return Object.values(memoryStore.users).find(u => u.id === id) || null;
  },

  // Create new user account
  async createUser({ email, password, parentName, childName, childDob, initialProgress, initialUnlocked, role = 'user' }) {
    const key = (email || '').toLowerCase().trim();
    if (!key) throw new Error('Valid email address is required.');

    if (memoryStore.users[key]) {
      throw new Error('An account with this email address already exists.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const userId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    const childId = 'chd_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);

    // Initial unlocks (stage 30 is always free)
    const existingUnlocks = (memoryStore.stage_unlocks[key] || []).map(u => u.stageId);
    const mergedUnlocked = Array.from(new Set([
      'a30',
      ...(Array.isArray(initialUnlocked) ? initialUnlocked : []),
      ...existingUnlocks
    ]));

    const newUser = {
      id: userId,
      email: key,
      passwordHash,
      parentName: parentName || 'Parent',
      role: role || 'user',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      lastSyncedAt: new Date().toISOString(),
      profile: {
        childId,
        childName: childName || 'My Child',
        childDob: childDob || null,
        unlockedBands: mergedUnlocked,
        progress: initialProgress || {}
      }
    };

    memoryStore.users[key] = newUser;

    // Record child profile
    memoryStore.children[childId] = {
      id: childId,
      userId,
      childName: childName || 'My Child',
      dob: childDob || null,
      createdAt: new Date().toISOString()
    };

    // Record progress state
    if (initialProgress && typeof initialProgress === 'object') {
      memoryStore.milestone_progress[key] = { ...(initialProgress) };
    }

    // Record stage unlocks
    memoryStore.stage_unlocks[key] = mergedUnlocked.map(stageId => ({
      stageId,
      unlockedAt: new Date().toISOString(),
      isDevUnlock: stageId !== 'a30' && role === 'admin' ? 1 : 0
    }));

    persistStore();

    // If SQLite is active, sync to tables
    if (sqliteInstance) {
      sqliteInstance.run(
        `INSERT OR REPLACE INTO users (id, email, password_hash, parent_name, role, created_at, last_login_at, last_synced_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, key, passwordHash, newUser.parentName, newUser.role, newUser.createdAt, newUser.lastLoginAt, newUser.lastSyncedAt]
      );
      if (childDob) {
        sqliteInstance.run(
          `INSERT OR REPLACE INTO children (id, user_id, child_name, dob_day, dob_month, dob_year)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [childId, userId, childName || 'My Child', childDob.day || null, childDob.month || null, childDob.year || null]
        );
      }
    }

    return this.sanitizeUser(newUser);
  },

  // Validate credentials
  async validateCredentials(email, password) {
    const key = (email || '').toLowerCase().trim();
    const user = memoryStore.users[key];
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return null;

    user.lastLoginAt = new Date().toISOString();
    persistStore();

    if (sqliteInstance) {
      sqliteInstance.run(`UPDATE users SET last_login_at = ? WHERE email = ?`, [user.lastLoginAt, key]);
    }

    return this.sanitizeUser(user);
  },

  // Update user profile info
  updateUserProfile(email, { parentName, childName, childDob, progress, unlockedBands }) {
    const key = (email || '').toLowerCase().trim();
    const user = memoryStore.users[key];
    if (!user) throw new Error('User account not found');

    if (parentName) user.parentName = parentName;
    if (childName) user.profile.childName = childName;
    if (childDob !== undefined) user.profile.childDob = childDob;

    if (progress && typeof progress === 'object') {
      user.profile.progress = {
        ...(user.profile.progress || {}),
        ...progress
      };
      memoryStore.milestone_progress[key] = {
        ...(memoryStore.milestone_progress[key] || {}),
        ...progress
      };
    }

    if (Array.isArray(unlockedBands)) {
      const merged = Array.from(new Set([
        ...(user.profile.unlockedBands || ['a30']),
        ...unlockedBands
      ]));
      user.profile.unlockedBands = merged;
      memoryStore.stage_unlocks[key] = merged.map(stageId => ({
        stageId,
        unlockedAt: new Date().toISOString()
      }));
    }

    user.lastSyncedAt = new Date().toISOString();
    persistStore();

    if (sqliteInstance) {
      sqliteInstance.run(
        `UPDATE users SET parent_name = ?, last_synced_at = ? WHERE email = ?`,
        [user.parentName, user.lastSyncedAt, key]
      );
    }

    return this.sanitizeUser(user);
  },

  // Record a verified purchase / unlock
  recordPurchase({ email, bandId, orderId, paymentId, signature, amount = 9900, isDevUnlock = 0 }) {
    const normalizedEmail = (email || '').toLowerCase().trim();
    const purchaseRecord = {
      id: 'ord_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      orderId: orderId || 'dev_order_' + Date.now(),
      paymentId: paymentId || 'dev_pay_' + Date.now(),
      customerEmail: normalizedEmail,
      customerName: (memoryStore.users[normalizedEmail] && memoryStore.users[normalizedEmail].parentName) || 'Customer',
      itemsJson: JSON.stringify([{ type: 'stage_unlock', bandId, label: 'Stage ' + bandId }]),
      totalAmount: amount,
      currency: 'INR',
      status: 'paid',
      signature: signature || 'dev_signature',
      createdAt: new Date().toISOString()
    };

    memoryStore.orders.push(purchaseRecord);

    // Record stage unlock
    const currentUnlocks = memoryStore.stage_unlocks[normalizedEmail] || [];
    if (!currentUnlocks.some(u => u.stageId === bandId)) {
      currentUnlocks.push({
        stageId: bandId,
        orderId: purchaseRecord.orderId,
        paymentId: purchaseRecord.paymentId,
        amount,
        isDevUnlock,
        unlockedAt: new Date().toISOString()
      });
      memoryStore.stage_unlocks[normalizedEmail] = currentUnlocks;
    }

    // If user account exists, update user profile unlockedBands
    let updatedUser = null;
    if (memoryStore.users[normalizedEmail]) {
      const user = memoryStore.users[normalizedEmail];
      user.profile.unlockedBands = Array.from(new Set([
        ...(user.profile.unlockedBands || ['a30']),
        bandId
      ]));
      user.lastSyncedAt = new Date().toISOString();
      updatedUser = this.sanitizeUser(user);
    }

    persistStore();

    if (sqliteInstance) {
      sqliteInstance.run(
        `INSERT OR REPLACE INTO orders (id, order_id, customer_email, customer_name, items_json, total_amount, currency, status, payment_id, signature, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          purchaseRecord.id,
          purchaseRecord.orderId,
          purchaseRecord.customerEmail,
          purchaseRecord.customerName,
          purchaseRecord.itemsJson,
          purchaseRecord.totalAmount,
          purchaseRecord.currency,
          purchaseRecord.status,
          purchaseRecord.paymentId,
          purchaseRecord.signature,
          purchaseRecord.createdAt
        ]
      );
      sqliteInstance.run(
        `INSERT OR REPLACE INTO stage_unlocks (id, email, stage_id, order_id, payment_id, amount, is_dev_unlock, unlocked_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [purchaseRecord.id, normalizedEmail, bandId, purchaseRecord.orderId, purchaseRecord.paymentId, amount, isDevUnlock, new Date().toISOString()]
      );
    }

    return { success: true, user: updatedUser, purchase: purchaseRecord };
  },

  // Lookup unlocked stages for email
  lookupPurchases(email) {
    const normalizedEmail = (email || '').toLowerCase().trim();
    if (memoryStore.users[normalizedEmail]) {
      return memoryStore.users[normalizedEmail].profile.unlockedBands || ['a30'];
    }
    const unlocks = memoryStore.stage_unlocks[normalizedEmail] || [];
    const bands = Array.from(new Set(['a30', ...unlocks.map(u => u.stageId)]));
    return bands;
  },

  // Record Waitlist submission
  recordWaitlistEntry({ parentName, email, phone, childName, childAge, concerns }) {
    const normalizedEmail = (email || '').toLowerCase().trim();
    const entry = {
      id: 'wt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      parentName: parentName || 'Parent',
      email: normalizedEmail,
      phone: phone || '',
      childName: childName || '',
      childAge: childAge || '',
      concerns: concerns || '',
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    memoryStore.waitlist.unshift(entry);
    persistStore();

    if (sqliteInstance) {
      sqliteInstance.run(
        `INSERT INTO waitlist_inquiries (id, parent_name, email, phone, child_name, child_age, concerns, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [entry.id, entry.parentName, entry.email, entry.phone, entry.childName, entry.childAge, entry.concerns, entry.status, entry.createdAt]
      );
    }

    return entry;
  },

  // Record Contact Message
  recordContactMessage({ name, email, subject, message }) {
    const entry = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      name: name || 'Anonymous',
      email: (email || '').toLowerCase().trim(),
      subject: subject || 'General Inquiry',
      message: message || '',
      status: 'unread',
      createdAt: new Date().toISOString()
    };

    memoryStore.contact_messages.unshift(entry);
    persistStore();

    if (sqliteInstance) {
      sqliteInstance.run(
        `INSERT INTO contact_messages (id, name, email, subject, message, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [entry.id, entry.name, entry.email, entry.subject, entry.message, entry.status, entry.createdAt]
      );
    }

    return entry;
  },

  // Store Order Management
  createStoreOrder({ customerName, customerEmail, items, totalAmount, currency = 'INR' }) {
    const orderId = 'order_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    const order = {
      id: 'ord_' + Date.now(),
      orderId,
      customerName: customerName || 'Customer',
      customerEmail: (customerEmail || '').toLowerCase().trim(),
      itemsJson: JSON.stringify(items || []),
      totalAmount: totalAmount || 0,
      currency,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    memoryStore.orders.push(order);
    persistStore();
    return order;
  },

  // Verify Store Order
  verifyStoreOrder({ orderId, paymentId, signature, email }) {
    const order = memoryStore.orders.find(o => o.orderId === orderId);
    if (order) {
      order.status = 'paid';
      order.paymentId = paymentId;
      order.signature = signature;
      persistStore();
    }
    return order;
  },

  // Admin Dashboard Statistics & Aggregations
  getAdminStats() {
    const totalUsers = Object.keys(memoryStore.users).length;
    const totalWaitlist = memoryStore.waitlist.length;
    const totalMessages = memoryStore.contact_messages.length;
    const paidOrders = memoryStore.orders.filter(o => o.status === 'paid');
    const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    // Calculate total milestones tracked
    let totalMilestonesCount = 0;
    Object.values(memoryStore.milestone_progress).forEach(progressMap => {
      Object.keys(progressMap || {}).forEach(k => {
        if (!k.startsWith('win_') && !k.startsWith('chk_')) {
          totalMilestonesCount += Object.keys(progressMap[k] || {}).length;
        }
      });
    });

    return {
      totalUsers,
      totalWaitlist,
      totalMessages,
      totalOrders: paidOrders.length,
      totalRevenue: totalRevenue / 100, // In Rupees
      totalMilestonesTracked: totalMilestonesCount,
      databaseType: useSqlite ? 'SQLite (Relational)' : 'Embedded Persistent DB',
      uptime: process.uptime(),
      serverTime: new Date().toISOString()
    };
  },

  getAdminUsers() {
    return Object.values(memoryStore.users).map(u => this.sanitizeUser(u));
  },

  getAdminWaitlist() {
    return memoryStore.waitlist;
  },

  getAdminMessages() {
    return memoryStore.contact_messages;
  },

  getAdminOrders() {
    return memoryStore.orders;
  },

  // Strip password hash from returned object
  sanitizeUser(user) {
    if (!user) return null;
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }
};

module.exports = dbAPI;
