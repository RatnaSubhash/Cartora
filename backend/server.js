// ============================================
// CARTORA Backend Server
// Node.js + Express + MongoDB (Mongoose) + JWT + Email
// Migrated from SQLite / sql.js
// ============================================

const express    = require('express');
const cors       = require('cors');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const path       = require('path');
const mongoose   = require('mongoose');
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// ══════════════════════════════════════════════
// MONGOOSE SCHEMAS & MODELS
// ══════════════════════════════════════════════

// ── User ──────────────────────────────────────
const userSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  email:       { type: String, required: true, unique: true, lowercase: true },
  phone:       { type: String, default: null },
  password:    { type: String, required: true },
  role:        { type: String, default: 'user', enum: ['user', 'admin'] },
  is_verified: { type: Boolean, default: false },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// ── Email Verification (OTP) ──────────────────
const verificationSchema = new mongoose.Schema({
  email:      { type: String, required: true },
  token:      { type: String, required: true },
  expires_at: { type: Date,   required: true },
}, { timestamps: true });

const Verification = mongoose.model('Verification', verificationSchema);

// ── Product ───────────────────────────────────
const productSchema = new mongoose.Schema({
  name:           { type: String, required: true },
  price:          { type: Number, required: true },
  original_price: { type: Number, default: null },
  image:          { type: String, default: '' },
  category:       { type: String, default: '' },
  rating:         { type: Number, default: 0 },
  reviews:        { type: Number, default: 0 },
  description:    { type: String, default: '' },
  in_stock:       { type: Boolean, default: true },
  is_new:         { type: Boolean, default: false },
  is_featured:    { type: Boolean, default: false },
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);

// ── Order ─────────────────────────────────────
const orderSchema = new mongoose.Schema({
  order_id: { type: String, required: true, unique: true },
  user_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  email:    { type: String, required: true },
  name:     { type: String, default: '' },
  total:    { type: Number, required: true },
  status:   { type: String, default: 'Pending' },
  address:  { type: String, default: '' },
  items: [{
    product_id: { type: String, required: true },
    quantity:   { type: Number, required: true },
    price:      { type: Number, required: true },
  }]
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);

// ══════════════════════════════════════════════
// CONNECT TO MONGODB & START SERVER
// ══════════════════════════════════════════════

async function initDatabase() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // ── Seed demo users if not present ──────────
  const adminExists = await User.findOne({ email: 'admin@example.com' });
  if (!adminExists) {
    const hash = bcrypt.hashSync('password123', 10);
    await User.create([
      { name: 'Suresh Babu', email: 'admin@example.com', password: hash, role: 'admin', is_verified: true },
      { name: 'Ravi Kumar',  email: 'user@example.com',  password: hash, role: 'user',  is_verified: true },
    ]);
    console.log('✅ Demo users seeded');
  }

  // ── JWT Middleware ───────────────────────────
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

  // ── Email Setup ──────────────────────────────
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
              <div style="font-size:44px;font-weight:700;letter-spacing:12px;color:#3b2f27">${otp}</div>
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

  // ══════════════════════════════════════════════
  // AUTH ROUTES
  // ══════════════════════════════════════════════

  // POST /api/auth/register
  app.post('/api/auth/register', async (req, res) => {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'Name, email and password are required' });

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ error: 'An account with this email already exists' });

    const hash = bcrypt.hashSync(password, 10);
    await User.create({ name, email, phone: phone || null, password: hash });

    const otp     = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await Verification.deleteMany({ email });
    await Verification.create({ email, token: otp, expires_at: expires });

    await sendVerificationEmail(email, name, otp);

    res.status(201).json({
      message: 'Account created! Check your email for the 6-digit code.',
      email
    });
  });

  // POST /api/auth/verify
  app.post('/api/auth/verify', async (req, res) => {
    const { email, token } = req.body;
    if (!email || !token) return res.status(400).json({ error: 'Email and code are required' });

    const row = await Verification.findOne({ email, token: token.trim() });
    if (!row) return res.status(400).json({ error: 'Invalid verification code. Please try again.' });

    if (new Date() > row.expires_at) {
      await Verification.deleteMany({ email });
      return res.status(400).json({ error: 'This code has expired. Please request a new one.' });
    }

    const user = await User.findOneAndUpdate(
      { email },
      { is_verified: true },
      { new: true }
    );
    await Verification.deleteMany({ email });

    const jwtToken = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Email verified! Welcome to Cartora.',
      user:  { id: user._id, name: user.name, email: user.email, role: user.role },
      token: jwtToken
    });
  });

  // POST /api/auth/resend
  app.post('/api/auth/resend', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await User.findOne({ email });
    if (!user)            return res.status(404).json({ error: 'No account found with this email' });
    if (user.is_verified) return res.status(400).json({ error: 'This email is already verified' });

    const otp     = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await Verification.deleteMany({ email });
    await Verification.create({ email, token: otp, expires_at: expires });

    await sendVerificationEmail(email, user.name, otp);
    res.json({ message: 'A new verification code has been sent.' });
  });

  // POST /api/auth/login
  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const row = await User.findOne({ email: email.toLowerCase() });
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

    const user  = { id: row._id, name: row.name, email: row.email, phone: row.phone, role: row.role };
    const token = jwt.sign(
      { id: row._id, email: row.email, role: row.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ user, token });
  });

  // POST /api/auth/forgot-password
  app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await User.findOne({ email });
    if (!user) return res.json({ message: 'If this email exists, a reset code has been sent.' });

    const otp     = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000);
    const resetKey = 'reset_' + email;

    await Verification.deleteMany({ email: resetKey });
    await Verification.create({ email: resetKey, token: otp, expires_at: expires });

    await sendPasswordResetEmail(email, user.name, otp);
    res.json({ message: 'Reset code sent to your email.' });
  });

  // POST /api/auth/reset-password
  app.post('/api/auth/reset-password', async (req, res) => {
    const { email, token, newPassword } = req.body;
    if (!email || !token || !newPassword)
      return res.status(400).json({ error: 'Email, code and new password are required' });

    if (newPassword.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const resetKey = 'reset_' + email;
    const row = await Verification.findOne({ email: resetKey, token: token.trim() });

    if (!row)
      return res.status(400).json({ error: 'Invalid reset code. Please check and try again.' });

    if (new Date() > row.expires_at) {
      await Verification.deleteMany({ email: resetKey });
      return res.status(400).json({ error: 'This code has expired. Please request a new one.' });
    }

    const hash = bcrypt.hashSync(newPassword, 10);
    await User.updateOne({ email }, { password: hash });
    await Verification.deleteMany({ email: resetKey });

    res.json({ message: 'Password reset successfully! You can now log in.' });
  });

  // ══════════════════════════════════════════════
  // PRODUCT ROUTES
  // ══════════════════════════════════════════════

  app.get('/api/products', async (req, res) => {
    const { category, featured, search } = req.query;
    const filter = {};
    if (category) filter.category   = category;
    if (featured) filter.is_featured = true;
    if (search)   filter.name       = { $regex: search, $options: 'i' };
    const products = await Product.find(filter);
    // Return with `id` field for frontend compatibility
    res.json(products.map(p => ({ ...p.toObject(), id: p._id })));
  });

  app.get('/api/products/:id', async (req, res) => {
    const product = await Product.findById(req.params.id).catch(() => null);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ ...product.toObject(), id: product._id });
  });

  // ══════════════════════════════════════════════
  // ORDER ROUTES
  // ══════════════════════════════════════════════

  app.post('/api/orders', async (req, res) => {
    const { orderId, email, name, items, total, address } = req.body;
    if (!orderId || !email || !items || !total)
      return res.status(400).json({ error: 'Missing required fields' });

    const token  = req.headers['authorization']?.split(' ')[1];
    let userId   = null;
    try { if (token) userId = jwt.verify(token, process.env.JWT_SECRET).id; } catch {}

    const orderItems = items.map(item => ({
      product_id: String(item.productId),
      quantity:   item.quantity,
      price:      item.price
    }));

    await Order.create({ order_id: orderId, user_id: userId, email, name: name || '', total, address: address || '', items: orderItems });

    sendOrderEmail(email, name || 'Customer', orderId, total);
    res.status(201).json({ success: true, orderId });
  });

  app.get('/api/orders/my', authRequired, async (req, res) => {
    const orders = await Order.find({ user_id: req.user.id }).sort({ createdAt: -1 });
    const formatted = orders.map(o => ({
      ...o.toObject(),
      id:    o._id,
      date:  new Date(o.createdAt).toLocaleDateString('en-IN'),
      items: o.items.length
    }));
    res.json(formatted);
  });

  // ══════════════════════════════════════════════
  // ADMIN ROUTES
  // ══════════════════════════════════════════════

  app.get('/api/admin/orders', adminRequired, async (req, res) => {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders.map(o => ({ ...o.toObject(), id: o._id })));
  });

  app.patch('/api/admin/orders/:orderId/status', adminRequired, async (req, res) => {
    await Order.updateOne({ order_id: req.params.orderId }, { status: req.body.status });
    res.json({ success: true });
  });

  app.get('/api/admin/stats', adminRequired, async (req, res) => {
    const [totalUsers, totalOrders, revenueResult, pendingOrders] = await Promise.all([
      User.countDocuments(),
      Order.countDocuments(),
      Order.aggregate([{ $group: { _id: null, total: { $sum: '$total' } } }]),
      Order.countDocuments({ status: 'Pending' })
    ]);
    res.json({
      totalUsers,
      totalOrders,
      totalRevenue:  revenueResult[0]?.total || 0,
      pendingOrders
    });
  });

  // GET all users
  app.get('/api/admin/users', adminRequired, async (req, res) => {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users.map(u => ({
      id:          u._id,
      name:        u.name,
      email:       u.email,
      role:        u.role,
      is_verified: u.is_verified,
      created_at:  u.createdAt
    })));
  });

  // PATCH — edit user name and role
  app.patch('/api/admin/users/:id', adminRequired, async (req, res) => {
    const { name, role } = req.body;
    if (!name || !role) return res.status(400).json({ error: 'Name and role required' });
    const user = await User.findByIdAndUpdate(req.params.id, { name, role }).catch(() => null);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true });
  });

  // PATCH — manually verify a user's email
  app.patch('/api/admin/users/:id/verify', adminRequired, async (req, res) => {
    const user = await User.findByIdAndUpdate(req.params.id, { is_verified: true }).catch(() => null);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true });
  });

  // DELETE — remove a user
  app.delete('/api/admin/users/:id', adminRequired, async (req, res) => {
    const user = await User.findById(req.params.id).catch(() => null);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ error: 'Cannot delete admin accounts' });
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  });

  // GET all products (admin)
  app.get('/api/admin/products', adminRequired, async (req, res) => {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products.map(p => ({ ...p.toObject(), id: p._id })));
  });

  // POST — add new product
  app.post('/api/admin/products', adminRequired, async (req, res) => {
    const { name, price, original_price, category, image, description, in_stock, is_new, is_featured } = req.body;
    if (!name || !price) return res.status(400).json({ error: 'Name and price are required' });
    const product = await Product.create({
      name, price,
      original_price: original_price || null,
      category:       category    || '',
      image:          image       || '',
      description:    description || '',
      in_stock:       in_stock !== undefined ? Boolean(in_stock)    : true,
      is_new:         is_new   !== undefined ? Boolean(is_new)      : false,
      is_featured:    is_featured !== undefined ? Boolean(is_featured) : false,
    });
    res.status(201).json({ success: true, id: product._id });
  });

  // PATCH — update product
  app.patch('/api/admin/products/:id', adminRequired, async (req, res) => {
    const { name, price, original_price, category, image, description, in_stock, is_new, is_featured } = req.body;
    const product = await Product.findByIdAndUpdate(req.params.id, {
      name, price,
      original_price: original_price || null,
      category, image, description,
      in_stock:    Boolean(in_stock),
      is_new:      Boolean(is_new),
      is_featured: Boolean(is_featured)
    }).catch(() => null);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ success: true });
  });

  // DELETE — remove product
  app.delete('/api/admin/products/:id', adminRequired, async (req, res) => {
    const product = await Product.findByIdAndDelete(req.params.id).catch(() => null);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ success: true });
  });

  // ── Health check ─────────────────────────────
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Cartora API running ✅ (MongoDB)', time: new Date().toISOString() });
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
  ║   DB:  MongoDB ✅                    ║
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
