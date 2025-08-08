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
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Serve only frontend directory statically
const frontendPath = path.join(__dirname, 'frontend');
app.use(express.static(frontendPath));
app.use(cors());
app.use(express.json());

const users = [
  { username: 'testuser', password: '1234', admin: false },
  { username: 'admin', password: 'adminpass', admin: true }
];

// ✅ Login route (alias)
const loginHandler = (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ username: user.username, admin: user.admin }, JWT_SECRET, { expiresIn: '12h' });
  res.json({ token, username: user.username, admin: user.admin });
};

app.post('/api/login', loginHandler);
app.post('/api/auth/login', loginHandler); // for frontend compatibility

// ✅ Profile token verification
app.post('/api/profile', (req, res) => {
  const { token } = req.body;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ username: decoded.username, admin: decoded.admin });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// ✅ Example protected route
app.get('/api/secure', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(403).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    res.json({ message: `Welcome ${decoded.username}! You have access.` });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// ✅ Socket.IO alerts
io.on('connection', (socket) => {
  console.log('🟢 Socket connected:', socket.id);
  socket.on('new-alert', (data) => {
    console.log('🚨 Alert received:', data);
    io.emit('alert', data);
  });
  socket.on('disconnect', () => {
    console.log('🔴 Socket disconnected:', socket.id);
  });
});

// ✅ Fallback for React-style routing (SPA)
app.get('*', (req, res) => {
  const indexPath = path.join(frontendPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('index.html not found');
  }
});

// ✅ Start server
server.listen(PORT, () => {
  console.log(`✅ RTi Frontend Server running on http://localhost:${PORT}`);
});
