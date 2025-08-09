// server.js
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const server = http.createServer(app);

// --- CORS / Socket.IO -------------------------------------------------------
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '*')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS : '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// --- Config -----------------------------------------------------------------
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret';

// __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve SPA from ./frontend/public
const frontendPath = path.join(__dirname, 'frontend', 'public');
console.log('Serving static from:', frontendPath);

// --- Middleware -------------------------------------------------------------
app.set('trust proxy', 1);
app.use(express.json());
app.use(cors({
  origin: ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS : '*',
  credentials: true
}));
app.use(express.static(frontendPath));

// --- In-memory demo data (replace with DB in production) --------------------
let users = [
  {
    id: '1',
    username: 'admin',
    password: 'adminpass',
    isAdmin: true,
    tier: 'ADMIN',
    avatar: 'https://i.pravatar.cc/80?img=1',
    subscriptionId: null,
    subscriptionStatus: null
  },
  {
    id: '2',
    username: 'testuser',
    password: '1234',
    isAdmin: false,
    tier: 'FREE',
    avatar: 'https://i.pravatar.cc/80?img=2',
    subscriptionId: null,
    subscriptionStatus: null
  }
];

let alerts = []; // {_id,title,message,priority,type,botName,pnl,createdAt}

// Helper to shape user object returned to client
const shapeUser = (u) => ({
  id: u.id,
  username: u.username,
  avatar: u.avatar,
  isAdmin: u.isAdmin,
  tier: u.tier,
  subscriptionId: u.subscriptionId || null,
  subscriptionStatus: u.subscriptionStatus || null
});

// JWT helpers
const signToken = (u) =>
  jwt.sign(
    { id: u.id, username: u.username, isAdmin: u.isAdmin },
    JWT_SECRET,
    { expiresIn: '12h' }
  );

const authFromHeader = (req) => {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(auth.split(' ')[1], JWT_SECRET);
  } catch {
    return null;
  }
};

// --- Healthcheck ------------------------------------------------------------
app.get('/healthz', (_req, res) => res.status(200).send('ok'));

// --- Auth endpoints to match your frontend ----------------------------------
// Login (your HTML calls POST /api/auth/login)
const loginHandler = (req, res) => {
  const { username, password } = req.body || {};
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const token = signToken(user);
  return res.json({ token, user: shapeUser(user) });
};
app.post('/api/login', loginHandler);          // alias
app.post('/api/auth/login', loginHandler);     // main

// Register (your HTML calls POST /api/auth/register)
app.post('/api/auth/register', (req, res) => {
  const { username, email, password } = req.body || {};
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  if (users.some(u => u.username === username)) {
    return res.status(409).json({ error: 'Username already exists' });
  }

  const newUser = {
    id: String(Date.now()),
    username,
    password,
    isAdmin: false,
    tier: 'FREE',
    avatar: `https://i.pravatar.cc/80?u=${encodeURIComponent(username)}`,
    subscriptionId: null,
    subscriptionStatus: null
  };
  users.push(newUser);

  const token = signToken(newUser);
  return res.status(201).json({ token, user: shapeUser(newUser) });
});

// Profile (your HTML calls GET /api/auth/profile with Bearer token)
app.get('/api/auth/profile', (req, res) => {
  const decoded = authFromHeader(req);
  if (!decoded) return res.status(401).json({ error: 'Unauthorized' });
  const user = users.find(u => u.id === decoded.id);
  if (!user) return res.status(401).json({ error: 'Invalid token' });
  return res.json(shapeUser(user));
});

// Legacy profile (POST) kept for compatibility if needed
app.post('/api/profile', (req, res) => {
  const { token } = req.body || {};
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = users.find(u => u.id === decoded.id) || users.find(u => u.username === decoded.username);
    if (!user) throw new Error('not found');
    return res.json(shapeUser(user));
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// Example protected route
app.get('/api/secure', (req, res) => {
  const decoded = authFromHeader(req);
  if (!decoded) return res.status(403).json({ error: 'No or bad token' });
  res.json({ message: `Welcome ${decoded.username}! You have access.` });
});

// --- Data endpoints your HTML calls ----------------------------------------
// Active users list
app.get('/api/users/active', (_req, res) => {
  const actives = users.map(u => ({
    _id: u.id,
    username: u.username,
    avatar: u.avatar,
    tier: u.tier
  }));
  res.json(actives);
});

// Alerts CRUD
app.get('/api/alerts', (req, res) => {
  const { type } = req.query;
  const list = type && type !== 'ALL' ? alerts.filter(a => a.type === type) : alerts;
  res.json(list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

app.post('/api/alerts', (req, res) => {
  const decoded = authFromHeader(req);
  // optional: require admin
  // if (!decoded || !decoded.isAdmin) return res.status(403).json({ error: 'Admin only' });

  const { title, message, priority = 'MEDIUM', type = 'NEWS', botName, pnl } = req.body || {};
  if (!title || !message) return res.status(400).json({ error: 'Missing title or message' });

  const alert = {
    _id: String(Date.now()),
    title,
    message,
    priority,
    type,
    botName: botName || null,
    pnl: pnl || null,
    createdAt: new Date().toISOString()
  };
  alerts.unshift(alert);
  io.emit('newAlert', alert);
  res.status(201).json(alert);
});

app.delete('/api/alerts/:id', (req, res) => {
  const decoded = authFromHeader(req);
  // optional: require admin
  // if (!decoded || !decoded.isAdmin) return res.status(403).json({ error: 'Admin only' });

  const { id } = req.params;
  const before = alerts.length;
  alerts = alerts.filter(a => a._id !== id);
  if (alerts.length === before) return res.status(404).json({ error: 'Not found' });

  io.emit('alertDeleted', id);
  res.json({ ok: true });
});

// --- Socket.IO events (names match your frontend) ---------------------------
io.on('connection', (socket) => {
  console.log('🟢 Socket connected:', socket.id);

  socket.on('joinTradingRoom', (userId) => {
    socket.join('trading-room');
    socket.broadcast.emit('userJoined', { username: String(userId || 'Trader') });
  });

  socket.on('chatMessage', (msg) => {
    // msg: { message, user, timestamp }
    io.emit('chatMessage', msg);
  });

  socket.on('newAlert', (data) => {
    // echo live alerts to all sockets (in addition to REST POST handler)
    io.emit('newAlert', data);
  });

  socket.on('disconnect', () => {
    socket.broadcast.emit('userLeft', { username: 'Trader' });
    console.log('🔴 Socket disconnected:', socket.id);
  });
});

// --- SPA fallback for client-side routing -----------------------------------
app.get('*', (req, res) => {
  const indexPath = path.join(frontendPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('index.html not found');
  }
});

// --- Start ------------------------------------------------------------------
server.listen(PORT, () => {
  console.log(`✅ RTi Server running on http://localhost:${PORT}`);
  console.log(`✅ Allowed origins:`, ALLOWED_ORIGINS);
});
