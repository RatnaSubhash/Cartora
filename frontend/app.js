/* ============================================
   CARTORA - Shared Utilities
   cart.js  |  auth.js  |  ui helpers
   ============================================ */

// ── Toast Notification ──────────────────────
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = '';
  const icon = document.createElement('span');
  icon.textContent = type === 'success' ? '✓' : '✕';
  t.appendChild(icon);
  t.appendChild(document.createTextNode(' ' + msg));
  t.className = 'show ' + type;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.className = ''; }, 3200);
}

// ── Cart Storage ─────────────────────────────
const Cart = {
  get() {
    try { return JSON.parse(localStorage.getItem('cartora_cart')) || []; }
    catch { return []; }
  },
  save(items) {
    localStorage.setItem('cartora_cart', JSON.stringify(items));
    Cart.updateBadge();
  },
  add(product, qty = 1) {
    const items = Cart.get();
    const idx = items.findIndex(i => i.id === product.id);
    if (idx > -1) {
      items[idx].quantity += qty;
    } else {
      items.push({ ...product, quantity: qty });
    }
    Cart.save(items);
    showToast(product.name + ' added to cart');
  },
  remove(id) {
    Cart.save(Cart.get().filter(i => i.id !== id));
  },
  updateQty(id, qty) {
    if (qty < 1) { Cart.remove(id); return; }
    const items = Cart.get();
    const idx = items.findIndex(i => i.id === id);
    if (idx > -1) { items[idx].quantity = qty; Cart.save(items); }
  },
  clear() { localStorage.removeItem('cartora_cart'); Cart.updateBadge(); },
  total()  { return Cart.get().reduce((s, i) => s + i.price * i.quantity, 0); },
  count()  { return Cart.get().reduce((s, i) => s + i.quantity, 0); },
  updateBadge() {
    document.querySelectorAll('.cart-count').forEach(el => {
      const c = Cart.count();
      el.textContent = c;
      el.style.display = c > 0 ? 'flex' : 'none';
    });
  }
};

// ── Auth Storage ─────────────────────────────
const Auth = {
  get() {
    try { return JSON.parse(localStorage.getItem('cartora_user')); }
    catch { return null; }
  },
  getToken() { return localStorage.getItem('cartora_token'); },
  set(user, token) {
    localStorage.setItem('cartora_user', JSON.stringify(user));
    localStorage.setItem('cartora_token', token);
  },
  clear() {
    localStorage.removeItem('cartora_user');
    localStorage.removeItem('cartora_token');
  },
  isLoggedIn() { return !!Auth.getToken(); }
};

// ── API Helper ───────────────────────────────
const API_URL = 'http://localhost:5000/api';

async function apiFetch(path, options = {}) {
  const token = Auth.getToken();
  const res = await fetch(API_URL + path, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': 'Bearer ' + token } : {})
    },
    ...options
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ── Format Currency ──────────────────────────
function formatINR(amount) {
  return '₹' + Number(amount).toLocaleString('en-IN');
}

// ── Star Rating HTML ─────────────────────────
function starsHTML(rating) {
  let html = '<div class="stars">';
  for (let i = 1; i <= 5; i++) {
    html += i <= Math.floor(rating) ? '★' : '☆';
  }
  html += '</div>';
  return html;
}

// ── Navbar Setup ─────────────────────────────
function initNavbar() {
  Cart.updateBadge();
  const user = Auth.get();

  // User icon / menu
  const userWrap = document.getElementById('user-wrap');
  if (userWrap) {
    if (user) {
      userWrap.innerHTML = `
        <div class="nav-user-wrap" style="position:relative">
          <button class="nav-icon" title="${user.name}">👤</button>
          <div class="nav-user-menu">
            <div class="nav-user-info">
              <p>${user.name}</p>
              <span>${user.role}</span>
            </div>
            <a href="dashboard.html">My Orders</a>
            ${user.role === 'admin' ? '<a href="admin.html">Admin Panel</a>' : ''}
            <button onclick="logoutUser()">Logout</button>
          </div>
        </div>`;
    } else {
      userWrap.innerHTML = `<a href="login.html" class="nav-icon" title="Login">👤</a>`;
    }
  }

  // Hamburger menu
  const ham = document.getElementById('hamburger');
  const mob = document.getElementById('mobile-menu');
  if (ham && mob) {
    ham.addEventListener('click', () => {
      mob.style.display = mob.style.display === 'block' ? 'none' : 'block';
    });
  }

  // Cart sidebar open
  const cartBtn = document.querySelectorAll('.cart-open-btn');
  cartBtn.forEach(b => b.addEventListener('click', openCart));
}

function logoutUser() {
  Auth.clear();
  showToast('Logged out successfully');
  setTimeout(() => { window.location.href = 'index.html'; }, 1000);
}

// ── Cart Sidebar ─────────────────────────────
function openCart()  {
  document.getElementById('cart-sidebar')?.classList.add('open');
  document.getElementById('cart-overlay')?.classList.add('open');
  renderCartSidebar();
}
function closeCart() {
  document.getElementById('cart-sidebar')?.classList.remove('open');
  document.getElementById('cart-overlay')?.classList.remove('open');
}

function renderCartSidebar() {
  const body = document.getElementById('cart-body');
  if (!body) return;
  const items = Cart.get();
  if (items.length === 0) {
    body.innerHTML = `
      <div class="cart-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 01-8 0"/>
        </svg>
        <p style="color:var(--mid);margin-bottom:16px">Your cart is empty</p>
        <a href="products.html" class="btn btn-primary btn-sm" onclick="closeCart()">Browse Products</a>
      </div>`;
    return;
  }
  const shipping = Cart.total() > 15000 ? 0 : 499;
  const gst = Math.round(Cart.total() * 0.18);
  const total = Cart.total() + shipping + gst;

  body.innerHTML = items.map(item => `
    <div class="cart-item">
      <img class="cart-item-img" src="${item.image}" alt="${item.name}" onerror="this.src='https://images.unsplash.com/photo-1560343090-f0409e92791a?w=100'">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">${formatINR(item.price)}</div>
        <div class="qty-controls">
          <button class="qty-btn" onclick="changeQty(${item.id},-1)">−</button>
          <span class="qty-val">${item.quantity}</span>
          <button class="qty-btn" onclick="changeQty(${item.id},1)">+</button>
        </div>
      </div>
      <button class="remove-btn" onclick="removeFromCart(${item.id})">×</button>
    </div>`).join('');

  document.getElementById('cart-footer').innerHTML = `
    <div class="cart-total-row"><span>Subtotal</span><span>${formatINR(Cart.total())}</span></div>
    <div class="cart-total-row"><span>Shipping</span><span>${shipping === 0 ? 'FREE' : formatINR(shipping)}</span></div>
    <div class="cart-total-row"><span>GST (18%)</span><span>${formatINR(gst)}</span></div>
    <div class="cart-grand"><span>Total</span><span>${formatINR(total)}</span></div>
    <a href="checkout.html" class="btn btn-primary btn-full" style="margin-top:16px;text-align:center;justify-content:center">Proceed to Checkout</a>`;
}

function changeQty(id, delta) {
  const items = Cart.get();
  const item  = items.find(i => i.id === id);
  if (item) Cart.updateQty(id, item.quantity + delta);
  renderCartSidebar();
}
function removeFromCart(id) {
  Cart.remove(id);
  renderCartSidebar();
  showToast('Item removed', 'error');
}

// ── Newsletter ───────────────────────────────
function initNewsletter() {
  const form = document.getElementById('nl-form');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const email = form.querySelector('input[type=email]').value;
    if (!email) return;
    const success = document.getElementById('nl-success');
    form.style.display = 'none';
    if (success) success.style.display = 'block';
    showToast('Subscribed! Thank you.');
  });
}

// ── Run on DOM ready ─────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initNewsletter();

  // Cart overlay close
  document.getElementById('cart-overlay')?.addEventListener('click', closeCart);
  document.getElementById('cart-close')?.addEventListener('click', closeCart);

  // Active nav link highlight
  const current = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    if (a.getAttribute('href') === current) a.classList.add('active');
  });
});
