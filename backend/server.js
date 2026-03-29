// ============================================
// CARTORA Backend Server
// Node.js + Express + sql.js + JWT + Email
// Web Technologies Project | 24BIT0489
// ============================================

const express    = require('express');
const cors       = require('cors');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const path       = require('path');
const fs         = require('fs');
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// ── Database Setup (sql.js — pure JS, no compilation needed) ──
const initSqlJs = require('sql.js');
const DB_PATH   = path.join(__dirname, 'cartora.db');

let db; // will be set after sql.js loads

async function initDatabase() {
  const SQL = await initSqlJs();

  // Load existing DB file if it exists, otherwise create fresh
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Save DB to file after every write
  function saveDb() {
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      email       TEXT    UNIQUE NOT NULL,
      phone       TEXT,
      password    TEXT    NOT NULL,
      role        TEXT    DEFAULT 'user',
      is_verified INTEGER DEFAULT 0,
      created_at  TEXT    DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS email_verifications (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      email      TEXT    NOT NULL,
      token      TEXT    NOT NULL,
      expires_at TEXT    NOT NULL,
      created_at TEXT    DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      name           TEXT    NOT NULL,
      price          REAL    NOT NULL,
      original_price REAL,
      image          TEXT,
      category       TEXT,
      rating         REAL    DEFAULT 0,
      reviews        INTEGER DEFAULT 0,
      description    TEXT,
      in_stock       INTEGER DEFAULT 1,
      is_new         INTEGER DEFAULT 0,
      is_featured    INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS orders (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id   TEXT    UNIQUE NOT NULL,
      user_id    INTEGER,
      email      TEXT    NOT NULL,
      name       TEXT,
      total      REAL    NOT NULL,
      status     TEXT    DEFAULT 'Pending',
      address    TEXT,
      created_at TEXT    DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id   TEXT    NOT NULL,
      product_id INTEGER NOT NULL,
      quantity   INTEGER NOT NULL,
      price      REAL    NOT NULL
    );
  `);
  saveDb();

  // ── Helper functions to make sql.js feel like better-sqlite3 ──

  // Run a statement with params (INSERT, UPDATE, DELETE)
  function run(sql, params = []) {
    db.run(sql, params);
    saveDb();
  }

  // Get one row
  function get(sql, params = []) {
    const stmt   = db.prepare(sql);
    stmt.bind(params);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row;
    }
    stmt.free();
    return null;
  }

  // Get all rows
  function all(sql, params = []) {
    const results = db.exec(sql, params);
    if (!results.length) return [];
    const { columns, values } = results[0];
    return values.map(row => {
      const obj = {};
      columns.forEach((col, i) => { obj[col] = row[i]; });
      return obj;
    });
  }

  // Get last inserted row id
  function lastId() {
    return get('SELECT last_insert_rowid() as id').id;
  }

  // Seed demo users if not already there
  const adminExists = get('SELECT id FROM users WHERE email = ?', ['admin@example.com']);
  if (!adminExists) {
    const hash = bcrypt.hashSync('password123', 10);
    run('INSERT INTO users (name, email, password, role, is_verified) VALUES (?,?,?,?,1)',
      ['Suresh Babu', 'admin@example.com', hash, 'admin']);
    run('INSERT INTO users (name, email, password, role, is_verified) VALUES (?,?,?,?,1)',
      ['Ravi Kumar', 'user@example.com', hash, 'user']);
    console.log('✅ Demo users seeded');
  }

  // ── JWT Middleware ──────────────────────────
  function authRequired(req, res, next) {
    const header = req.headers['authorization'];
    const token  = header && header.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Login required' });
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      res.status(403).json({ error: 'Invalid or expired token' });
    }
  }

  function adminRequired(req, res, next) {
    authRequired(req, res, () => {
      if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
      next();
    });
  }

  // ── Email Setup ─────────────────────────────
  const mailer = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS
    },
    tls: { rejectUnauthorized: false }
  });

  function emailConfigured() {
    return process.env.GMAIL_USER && process.env.GMAIL_USER !== 'your.email@gmail.com';
  }

  async function sendVerificationEmail(email, name, otp) {
    if (!emailConfigured()) {
      console.log('\n──────────────────────────────────────────');
      console.log('📧  EMAIL NOT CONFIGURED — DEV MODE');
      console.log('    OTP for ' + email + '  →  ' + otp);
      console.log('──────────────────────────────────────────\n');
      return;
    }
    try {
      await mailer.sendMail({
        from:    '"Cartora" <' + process.env.GMAIL_USER + '>',
        to:       email,
        subject: 'Your Cartora Verification Code',
        html: `
          <div style="font-family:Georgia,serif;max-width:480px;margin:0 auto;padding:32px;background:#f8f5f0;border-radius:12px">
            <h1 style="color:#3b2f27;font-size:26px;margin:0 0 4px">Cartora</h1>
            <p style="color:#c76b39;font-size:12px;letter-spacing:3px;margin:0 0 32px">LUXURY SHOPPING</p>
            <h2 style="color:#3b2f27;margin:0 0 12px">Hello, ${name}!</h2>
            <p style="color:#7a6a5f;line-height:1.7;margin:0 0 28px">
              Your verification code is below. It expires in <strong>15 minutes</strong>.
            </p>
            <div style="background:#fff;border-radius:10px;padding:28px;text-align:center;margin:0 0 28px;border:1px solid #e2d9cf">
              <p style="margin:0 0 8px;font-size:13px;color:#b5a89a;letter-spacing:1px">VERIFICATION CODE</p>
              <div style="font-size:44px;font-weight:700;letter-spacing:12px;color:#3b2f27">${otp}</div>
            </div>
            <p style="color:#b5a89a;font-size:12px;margin:0">&copy; 2025 Cartora</p>
          </div>`
      });
      console.log('📧 Verification email sent to', email);
    } catch (err) {
      console.error('❌ Verification email failed:', err.message);
    }
  }

  async function sendOrderEmail(email, name, orderId, total) {
    if (!emailConfigured()) {
      console.log('📧 Email not configured — skipping order email for', orderId);
      return;
    }
    try {
      await mailer.sendMail({
        from:    '"Cartora" <' + process.env.GMAIL_USER + '>',
        to:       email,
        subject: 'Order Confirmed – ' + orderId + ' | Cartora',
        html: `
          <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:32px;background:#f8f5f0;border-radius:12px">
            <h1 style="color:#3b2f27;font-size:28px;margin:0 0 4px">Cartora</h1>
            <p style="color:#c76b39;font-size:12px;letter-spacing:3px;margin:0 0 32px">LUXURY SHOPPING</p>
            <h2 style="color:#3b2f27">Thank you, ${name}!</h2>
            <p style="color:#7a6a5f;margin:0 0 24px">Your order is confirmed and will be dispatched soon.</p>
            <div style="background:#fff;border-radius:10px;padding:24px;margin:0 0 24px;border:1px solid #e2d9cf">
              <p style="margin:0 0 6px;color:#7a6a5f"><strong style="color:#3b2f27">Order ID:</strong> ${orderId}</p>
              <p style="margin:0;font-size:20px;font-weight:700;color:#3b2f27">Total: &#8377;${Number(total).toLocaleString('en-IN')}</p>
            </div>
            <a href="http://localhost:5000/dashboard.html"
               style="display:inline-block;padding:13px 28px;background:#c76b39;color:#fff;text-decoration:none;border-radius:8px;font-size:14px">
               View My Orders &rarr;
            </a>
            <p style="color:#b5a89a;font-size:12px;margin:28px 0 0">&copy; 2025 Cartora</p>
          </div>`
      });
      console.log('📧 Order confirmation sent to', email);
    } catch (err) {
      console.error('❌ Order email failed:', err.message);
    }
  }

  // Send password reset email
  async function sendPasswordResetEmail(email, name, otp) {
    if (!emailConfigured()) {
      console.log('\n──────────────────────────────────────────');
      console.log('🔑  PASSWORD RESET — DEV MODE');
      console.log('    Reset OTP for ' + email + '  →  ' + otp);
      console.log('──────────────────────────────────────────\n');
      return;
    }
    try {
      await mailer.sendMail({
        from:    '"Cartora" <' + process.env.GMAIL_USER + '>',
        to:       email,
        subject: 'Reset Your Cartora Password',
        html: `
          <div style="font-family:Georgia,serif;max-width:480px;margin:0 auto;padding:32px;background:#f8f5f0;border-radius:12px">
            <h1 style="color:#3b2f27;font-size:26px;margin:0 0 4px">Cartora</h1>
            <p style="color:#c76b39;font-size:12px;letter-spacing:3px;margin:0 0 32px">LUXURY SHOPPING</p>
            <h2 style="color:#3b2f27;margin:0 0 12px">Password Reset Request</h2>
            <p style="color:#7a6a5f;line-height:1.7;margin:0 0 28px">
              Hi ${name}, we received a request to reset your password.
              Use the code below — it expires in <strong>15 minutes</strong>.
            </p>
            <div style="background:#fff;border-radius:10px;padding:28px;text-align:center;margin:0 0 28px;border:1px solid #e2d9cf">
              <p style="margin:0 0 8px;font-size:13px;color:#b5a89a;letter-spacing:1px">RESET CODE</p>
              <div style="font-size:44px;font-weight:700;letter-spacing:12px;color:#3b2f27;font-family:Georgia,serif">${otp}</div>
            </div>
            <p style="color:#7a6a5f;font-size:14px;margin:0 0 8px">
              If you did not request a password reset, you can safely ignore this email.
            </p>
            <p style="color:#b5a89a;font-size:12px;margin:24px 0 0;border-top:1px solid #e2d9cf;padding-top:20px">
              &copy; 2025 Cartora
            </p>
          </div>`
      });
      console.log('📧 Password reset email sent to', email);
    } catch (err) {
      console.error('❌ Reset email failed:', err.message);
    }
  }

  // ── AUTH ROUTES ──────────────────────────────

  // POST /api/auth/register
  app.post('/api/auth/register', async (req, res) => {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'Name, email and password are required' });

    const exists = get('SELECT id FROM users WHERE email = ?', [email]);
    if (exists) return res.status(400).json({ error: 'An account with this email already exists' });

    const hash = bcrypt.hashSync(password, 10);
    run('INSERT INTO users (name, email, phone, password, is_verified) VALUES (?,?,?,?,0)',
      [name, email, phone || null, hash]);

    const otp     = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    run('DELETE FROM email_verifications WHERE email = ?', [email]);
    run('INSERT INTO email_verifications (email, token, expires_at) VALUES (?,?,?)',
      [email, otp, expires]);

    await sendVerificationEmail(email, name, otp);

    res.status(201).json({
      message: 'Account created! Check your email for the 6-digit code.',
      email
    });
  });

  // POST /api/auth/verify
  app.post('/api/auth/verify', (req, res) => {
    const { email, token } = req.body;
    if (!email || !token) return res.status(400).json({ error: 'Email and code are required' });

    const row = get(
      'SELECT * FROM email_verifications WHERE email = ? AND token = ?',
      [email, token.trim()]
    );

    if (!row) return res.status(400).json({ error: 'Invalid verification code. Please try again.' });

    if (new Date() > new Date(row.expires_at)) {
      run('DELETE FROM email_verifications WHERE email = ?', [email]);
      return res.status(400).json({ error: 'This code has expired. Please request a new one.' });
    }

    run('UPDATE users SET is_verified = 1 WHERE email = ?', [email]);
    run('DELETE FROM email_verifications WHERE email = ?', [email]);

    const user     = get('SELECT * FROM users WHERE email = ?', [email]);
    const jwtToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Email verified! Welcome to Cartora.',
      user:  { id: user.id, name: user.name, email: user.email, role: user.role },
      token: jwtToken
    });
  });

  // POST /api/auth/resend
  app.post('/api/auth/resend', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user)             return res.status(404).json({ error: 'No account found with this email' });
    if (user.is_verified)  return res.status(400).json({ error: 'This email is already verified' });

    const otp     = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    run('DELETE FROM email_verifications WHERE email = ?', [email]);
    run('INSERT INTO email_verifications (email, token, expires_at) VALUES (?,?,?)',
      [email, otp, expires]);

    await sendVerificationEmail(email, user.name, otp);
    res.json({ message: 'A new verification code has been sent.' });
  });

  // POST /api/auth/login
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const row = get('SELECT * FROM users WHERE email = ?', [email]);
    if (!row) return res.status(400).json({ error: 'Invalid email or password' });

    if (!bcrypt.compareSync(password, row.password))
      return res.status(400).json({ error: 'Invalid email or password' });

    if (!row.is_verified) {
      return res.status(403).json({
        error: 'Please verify your email before logging in.',
        needsVerification: true,
        email: row.email
      });
    }

    const user  = { id: row.id, name: row.name, email: row.email, phone: row.phone, role: row.role };
    const token = jwt.sign(
      { id: row.id, email: row.email, role: row.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ user, token });
  });

  // POST /api/auth/forgot-password
  // Generates a reset OTP and emails it to the user
  app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = get('SELECT * FROM users WHERE email = ?', [email]);
    // Always return success even if email not found — security best practice
    // (don't reveal which emails are registered)
    if (!user) {
      return res.json({ message: 'If this email exists, a reset code has been sent.' });
    }

    const otp     = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Reuse email_verifications table with a "reset_" prefix to distinguish
    run('DELETE FROM email_verifications WHERE email = ?', ['reset_' + email]);
    run('INSERT INTO email_verifications (email, token, expires_at) VALUES (?,?,?)',
      ['reset_' + email, otp, expires]);

    await sendPasswordResetEmail(email, user.name, otp);

    res.json({ message: 'Reset code sent to your email.' });
  });

  // POST /api/auth/reset-password
  // Verifies OTP and sets the new password
  app.post('/api/auth/reset-password', (req, res) => {
    const { email, token, newPassword } = req.body;
    if (!email || !token || !newPassword)
      return res.status(400).json({ error: 'Email, code and new password are required' });

    if (newPassword.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const row = get(
      'SELECT * FROM email_verifications WHERE email = ? AND token = ?',
      ['reset_' + email, token.trim()]
    );

    if (!row)
      return res.status(400).json({ error: 'Invalid reset code. Please check and try again.' });

    if (new Date() > new Date(row.expires_at)) {
      run('DELETE FROM email_verifications WHERE email = ?', ['reset_' + email]);
      return res.status(400).json({ error: 'This code has expired. Please request a new one.' });
    }

    // Update password and clean up token
    const hash = bcrypt.hashSync(newPassword, 10);
    run('UPDATE users SET password = ? WHERE email = ?', [hash, email]);
    run('DELETE FROM email_verifications WHERE email = ?', ['reset_' + email]);

    res.json({ message: 'Password reset successfully! You can now log in.' });
  });

  // ── PRODUCT ROUTES ───────────────────────────

  app.get('/api/products', (req, res) => {
    const { category, featured, search } = req.query;
    let sql    = 'SELECT * FROM products WHERE 1=1';
    const args = [];
    if (category) { sql += ' AND category = ?'; args.push(category); }
    if (featured) { sql += ' AND is_featured = 1'; }
    if (search)   { sql += ' AND name LIKE ?'; args.push('%' + search + '%'); }
    res.json(all(sql, args));
  });

  app.get('/api/products/:id', (req, res) => {
    const row = get('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Product not found' });
    res.json(row);
  });

  // ── ORDER ROUTES ─────────────────────────────

  app.post('/api/orders', async (req, res) => {
    const { orderId, email, name, items, total, address } = req.body;
    if (!orderId || !email || !items || !total)
      return res.status(400).json({ error: 'Missing required fields' });

    const token  = req.headers['authorization']?.split(' ')[1];
    let userId   = null;
    try { if (token) userId = jwt.verify(token, process.env.JWT_SECRET).id; } catch {}

    run('INSERT INTO orders (order_id, user_id, email, name, total, address) VALUES (?,?,?,?,?,?)',
      [orderId, userId, email, name || '', total, address || '']);

    items.forEach(item => {
      run('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?,?,?,?)',
        [orderId, item.productId, item.quantity, item.price]);
    });

    sendOrderEmail(email, name || 'Customer', orderId, total);
    res.status(201).json({ success: true, orderId });
  });

  app.get('/api/orders/my', authRequired, (req, res) => {
    const rows = all(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    const formatted = rows.map(o => ({
      ...o,
      date:  new Date(o.created_at).toLocaleDateString('en-IN'),
      items: (get('SELECT COUNT(*) as cnt FROM order_items WHERE order_id = ?', [o.order_id]) || {}).cnt || 0
    }));
    res.json(formatted);
  });

  app.get('/api/admin/orders', adminRequired, (req, res) => {
    res.json(all('SELECT * FROM orders ORDER BY created_at DESC'));
  });

  app.patch('/api/admin/orders/:orderId/status', adminRequired, (req, res) => {
    run('UPDATE orders SET status = ? WHERE order_id = ?', [req.body.status, req.params.orderId]);
    res.json({ success: true });
  });

  app.get('/api/admin/stats', adminRequired, (req, res) => {
    res.json({
      totalUsers:    (get('SELECT COUNT(*) as n FROM users') || {}).n || 0,
      totalOrders:   (get('SELECT COUNT(*) as n FROM orders') || {}).n || 0,
      totalRevenue:  (get('SELECT COALESCE(SUM(total),0) as n FROM orders') || {}).n || 0,
      pendingOrders: (get("SELECT COUNT(*) as n FROM orders WHERE status='Pending'") || {}).n || 0
    });
  });

  // GET all users
  app.get('/api/admin/users', adminRequired, (req, res) => {
    res.json(all('SELECT id, name, email, role, is_verified, created_at FROM users ORDER BY id DESC'));
  });

  // PATCH — edit user name and role
  app.patch('/api/admin/users/:id', adminRequired, (req, res) => {
    const { name, role } = req.body;
    if (!name || !role) return res.status(400).json({ error: 'Name and role required' });
    const exists = get('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (!exists) return res.status(404).json({ error: 'User not found' });
    run('UPDATE users SET name = ?, role = ? WHERE id = ?', [name, role, req.params.id]);
    res.json({ success: true });
  });

  // PATCH — manually verify a user's email
  app.patch('/api/admin/users/:id/verify', adminRequired, (req, res) => {
    const exists = get('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (!exists) return res.status(404).json({ error: 'User not found' });
    run('UPDATE users SET is_verified = 1 WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  });

  // DELETE — remove a user (cannot delete admins)
  app.delete('/api/admin/users/:id', adminRequired, (req, res) => {
    const user = get('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ error: 'Cannot delete admin accounts' });
    run('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  });

  // GET all products (admin)
  app.get('/api/admin/products', adminRequired, (req, res) => {
    res.json(all('SELECT * FROM products ORDER BY id DESC'));
  });

  // POST — add new product
  app.post('/api/admin/products', adminRequired, (req, res) => {
    const { name, price, original_price, category, image, description, in_stock, is_new, is_featured } = req.body;
    if (!name || !price) return res.status(400).json({ error: 'Name and price are required' });
    run(
      'INSERT INTO products (name, price, original_price, category, image, description, in_stock, is_new, is_featured, rating, reviews) VALUES (?,?,?,?,?,?,?,?,?,0,0)',
      [name, price, original_price || null, category || '', image || '', description || '', in_stock || 1, is_new || 0, is_featured || 0]
    );
    const newId = get('SELECT last_insert_rowid() as id').id;
    res.status(201).json({ success: true, id: newId });
  });

  // PATCH — update product
  app.patch('/api/admin/products/:id', adminRequired, (req, res) => {
    const { name, price, original_price, category, image, description, in_stock, is_new, is_featured } = req.body;
    const exists = get('SELECT id FROM products WHERE id = ?', [req.params.id]);
    if (!exists) return res.status(404).json({ error: 'Product not found' });
    run(
      'UPDATE products SET name=?, price=?, original_price=?, category=?, image=?, description=?, in_stock=?, is_new=?, is_featured=? WHERE id=?',
      [name, price, original_price || null, category, image, description, in_stock, is_new, is_featured, req.params.id]
    );
    res.json({ success: true });
  });

  // DELETE — remove product
  app.delete('/api/admin/products/:id', adminRequired, (req, res) => {
    const exists = get('SELECT id FROM products WHERE id = ?', [req.params.id]);
    if (!exists) return res.status(404).json({ error: 'Product not found' });
    run('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  });

  // ── Health check ─────────────────────────────
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Cartora API running ✅', time: new Date().toISOString() });
  });

  // Catch-all — serve frontend
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
  });

  // ── Start server ─────────────────────────────
  app.listen(PORT, () => {
    console.log(`
  ╔══════════════════════════════════════╗
  ║   CARTORA Backend Running            ║
  ║   http://localhost:${PORT}              ║
  ║   API: http://localhost:${PORT}/api     ║
  ╚══════════════════════════════════════╝
    `);
    if (!emailConfigured()) {
      console.log('  ⚠️  Gmail not set up in .env');
      console.log('  ℹ️  OTPs will print to this terminal for testing\n');
    }
  });
}

// Start everything
initDatabase().catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
