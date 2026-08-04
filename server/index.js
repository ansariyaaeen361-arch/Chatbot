const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

connectDB();
app.set('io', io);

app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), require('./controllers/billingController').handleWebhook);
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use(express.static('public'));

app.get('/', (req, res) => res.send('Mental Forge SaaS API is running'));

// Dashboard-only routes — only ever called from our own frontend, so lock CORS to that origin
const dashboardCors = cors({ origin: process.env.CLIENT_URL || 'https://app.mentalforge.ai' });
// Widget-facing routes — embedded on arbitrary customer websites, so must stay open to any origin
const widgetCors = cors();

app.use('/api/auth', dashboardCors, require('./routes/authRoutes'));
app.use('/api/business', dashboardCors, require('./routes/businessRoutes'));
app.use('/api/public', widgetCors, require('./routes/publicRoutes'));
app.use('/api/chat', widgetCors, require('./routes/chatRoutes'));
app.use('/api/livechat', widgetCors, require('./routes/livechatRoutes'));
app.use('/api/onboarding', dashboardCors, require('./routes/onboardingRoutes'));
app.use('/api/analytics', dashboardCors, require('./routes/analyticsRoutes'));
app.use('/api/billing', dashboardCors, require('./routes/billingRoutes'));
app.use('/api/account', dashboardCors, require('./routes/accountRoutes'));

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