const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');
const startPlanExpiryCron = require('./utils/planExpiryCheck');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

connectDB();
startPlanExpiryCron();
app.set('io', io);

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use(express.static('public'));

app.get('/', (req, res) => res.send('Mental Forge SaaS API is running'));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/business', require('./routes/businessRoutes'));
app.use('/api/public', require('./routes/publicRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));
app.use('/api/livechat', require('./routes/livechatRoutes'));
app.use('/api/onboarding', require('./routes/onboardingRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/billing', require('./routes/billingRoutes'));
app.post('/api/billing/webhook', require('./controllers/billingController').handleWebhook);
app.use('/api/account', require('./routes/accountRoutes'));

io.on('connection', (socket) => {
  socket.on('join_business', (businessId) => socket.join(`business_${businessId}`));
  socket.on('join_chat', (chatId) => socket.join(`chat_${chatId}`));
  // Agent typing indicator — broadcast to visitor in the same chat room
  socket.on('agent_typing', (chatId) => {
    socket.to(`chat_${chatId}`).emit('agent_typing');
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));