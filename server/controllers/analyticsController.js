const mongoose = require('mongoose');
const ChatLog = require('../models/ChatLog');
const Lead = require('../models/Lead');
const Chat = require('../models/Chat');
const ConversationSession = require('../models/ConversationSession');

exports.getOverview = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const [totalMessages, faqCount, aiCount, leadCount, liveChatCount, respondedChats, conversationCount] = await Promise.all([
      ChatLog.countDocuments({ businessId, createdAt: { $gte: since } }),
      ChatLog.countDocuments({ businessId, source: 'faq', createdAt: { $gte: since } }),
      ChatLog.countDocuments({ businessId, source: 'ai', createdAt: { $gte: since } }),
      Lead.countDocuments({ businessId, createdAt: { $gte: since } }),
      Chat.countDocuments({ businessId, createdAt: { $gte: since } }),
      Chat.find({
        businessId,
        createdAt: { $gte: since },
        acceptedAt: { $ne: null }
      }).select('createdAt acceptedAt'),
      ConversationSession.countDocuments({ businessId, createdAt: { $gte: since } })
    ]);

    const faqRate = totalMessages > 0 ? Math.round((faqCount / totalMessages) * 100) : 0;
    const conversionRate = conversationCount > 0 ? Math.round((leadCount / conversationCount) * 100) : 0;

    let avgResponseSeconds = null;
    if (respondedChats.length > 0) {
      const totalSeconds = respondedChats.reduce((sum, c) => {
        return sum + (new Date(c.acceptedAt) - new Date(c.createdAt)) / 1000;
      }, 0);
      avgResponseSeconds = Math.round(totalSeconds / respondedChats.length);
    }

    res.json({
      totalMessages,
      faqCount,
      aiCount,
      faqRate,
      leadCount,
      liveChatCount,
      avgResponseSeconds,
      respondedChatsCount: respondedChats.length,
      conversationCount,
      conversionRate,
      periodDays: 30
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};

exports.getHomeSummary = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    const [
      conversationsToday, conversationsYesterday,
      leadsToday, leadsYesterday,
      chatsToday, chatsYesterday,
      messagesToday,
      recentLeads
    ] = await Promise.all([
      ConversationSession.countDocuments({ businessId, createdAt: { $gte: startOfToday } }),
      ConversationSession.countDocuments({ businessId, createdAt: { $gte: startOfYesterday, $lt: startOfToday } }),
      Lead.countDocuments({ businessId, createdAt: { $gte: startOfToday } }),
      Lead.countDocuments({ businessId, createdAt: { $gte: startOfYesterday, $lt: startOfToday } }),
      Chat.countDocuments({ businessId, createdAt: { $gte: startOfToday } }),
      Chat.countDocuments({ businessId, createdAt: { $gte: startOfYesterday, $lt: startOfToday } }),
      ChatLog.countDocuments({ businessId, createdAt: { $gte: startOfToday } }),
      Lead.find({ businessId }).sort({ createdAt: -1 }).limit(6).select('name email createdAt sessionId')
    ]);

    const delta = (today, yesterday) => {
      if (yesterday === 0) return today > 0 ? 100 : 0;
      return Math.round(((today - yesterday) / yesterday) * 100);
    };

    res.json({
      conversationsToday, conversationsDelta: delta(conversationsToday, conversationsYesterday),
      leadsToday, leadsDelta: delta(leadsToday, leadsYesterday),
      chatsToday, chatsDelta: delta(chatsToday, chatsYesterday),
      messagesToday,
      recentLeads
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};

exports.getHomeTrend = async (req, res) => {
  try {
    const businessId = new mongoose.Types.ObjectId(req.user.businessId);
    const days = [7, 30, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 7;
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - (days - 1));

    const [convByDay, leadsByDay] = await Promise.all([
      ConversationSession.aggregate([
        { $match: { businessId, createdAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } }
      ]),
      Lead.aggregate([
        { $match: { businessId, createdAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } }
      ])
    ]);

    const convMap = Object.fromEntries(convByDay.map((d) => [d._id, d.count]));
    const leadsMap = Object.fromEntries(leadsByDay.map((d) => [d._id, d.count]));

    const points = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      points.push({
        date: key,
        label: days <= 7
          ? d.toLocaleDateString('en-US', { weekday: 'short' })
          : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        conversations: convMap[key] || 0,
        leads: leadsMap[key] || 0,
      });
    }

    res.json({ points, days });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};

exports.getMessageTrend = async (req, res) => {
  try {
    const businessId = new mongoose.Types.ObjectId(req.user.businessId);
    const days = 30;
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - (days - 1));

    const byDay = await ChatLog.aggregate([
      { $match: { businessId, createdAt: { $gte: since } } },
      {
        $group: {
          _id: { day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, source: '$source' },
          count: { $sum: 1 }
        }
      }
    ]);

    const map = {};
    byDay.forEach((d) => {
      const day = d._id.day;
      if (!map[day]) map[day] = { faq: 0, ai: 0 };
      if (d._id.source === 'faq') map[day].faq = d.count;
      else if (d._id.source === 'ai') map[day].ai = d.count;
    });

    const points = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      points.push({
        date: key,
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        faq: map[key]?.faq || 0,
        ai: map[key]?.ai || 0,
      });
    }

    res.json({ points });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};

exports.getAgentStats = async (req, res) => {
  try {
    const businessId = new mongoose.Types.ObjectId(req.user.businessId);
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const stats = await Chat.aggregate([
      { $match: { businessId, assignedTo: { $ne: null }, createdAt: { $gte: since } } },
      {
        $group: {
          _id: '$assignedTo',
          agentName: { $first: '$assignedToName' },
          chatsHandled: { $sum: 1 },
          resolvedCount: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
          respondedCount: { $sum: { $cond: [{ $ne: ['$acceptedAt', null] }, 1, 0] } },
          totalResponseSeconds: {
            $sum: {
              $cond: [
                { $ne: ['$acceptedAt', null] },
                { $divide: [{ $subtract: ['$acceptedAt', '$createdAt'] }, 1000] },
                0
              ]
            }
          }
        }
      },
      { $sort: { chatsHandled: -1 } }
    ]);

    res.json(stats.map(s => ({
      agentId: s._id,
      agentName: s.agentName || 'Unknown',
      chatsHandled: s.chatsHandled,
      resolvedCount: s.resolvedCount,
      avgResponseSeconds: s.respondedCount > 0 ? Math.round(s.totalResponseSeconds / s.respondedCount) : null
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};

exports.getTopQuestions = async (req, res) => {
  try {
    const businessId = new mongoose.Types.ObjectId(req.user.businessId);
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const top = await ChatLog.aggregate([
      { $match: { businessId, createdAt: { $gte: since } } },
      { $group: { _id: { $toLower: '$userMessage' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json(top.map(t => ({ question: t._id, count: t.count })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};

// Questions the AI has been answering repeatedly that aren't in the FAQ list yet —
// each one costs an AI call every time; turning it into an FAQ makes future visitors
// get an instant free answer instead.
exports.getMissedFaqs = async (req, res) => {
  try {
    const businessId = new mongoose.Types.ObjectId(req.user.businessId);
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const grouped = await ChatLog.aggregate([
      { $match: { businessId, source: 'ai', createdAt: { $gte: since } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: { $toLower: '$userMessage' },
          question: { $first: '$userMessage' },
          suggestedAnswer: { $first: '$aiReply' },
          count: { $sum: 1 },
          lastAskedAt: { $first: '$createdAt' }
        }
      },
      { $match: { count: { $gte: 2 } } },
      { $sort: { count: -1 } },
      { $limit: 15 }
    ]);

    res.json(grouped.map(g => ({
      question: g.question,
      suggestedAnswer: g.suggestedAnswer,
      count: g.count,
      lastAskedAt: g.lastAskedAt
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};

exports.getLeads = async (req, res) => {
  try {
    const leads = await Lead.find({ businessId: req.user.businessId }).sort({ createdAt: -1 });
    res.json(leads);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};

// The widget chat, not just the lead-capture form — what the visitor actually
// asked and how the bot answered, so the leads list isn't just a name and email.
exports.getLeadConversation = async (req, res) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.leadId, businessId: req.user.businessId });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    if (!lead.sessionId) return res.json({ messages: [], note: 'No linked chat found — this lead was likely captured before conversation linking was turned on, or through a form outside the chat widget.' });

    const logs = await ChatLog.find({ businessId: req.user.businessId, sessionId: lead.sessionId }).sort({ createdAt: 1 });
    const messages = [];
    logs.forEach(l => {
      messages.push({ role: 'visitor', text: l.userMessage, at: l.createdAt });
      if (l.aiReply) messages.push({ role: 'bot', text: l.aiReply, at: l.createdAt });
    });
    res.json({ messages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};

exports.exportLeadsCsv = async (req, res) => {
  try {
    const leads = await Lead.find({ businessId: req.user.businessId }).sort({ createdAt: -1 });
    let csv = 'Name,Email,Phone,Date\n';
    leads.forEach(l => {
      csv += `"${l.name}","${l.email || ''}","${l.phone || ''}","${l.createdAt.toISOString()}"\n`;
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=leads.csv');
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};