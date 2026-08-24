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