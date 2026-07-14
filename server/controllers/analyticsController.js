const ChatLog = require('../models/ChatLog');
const Lead = require('../models/Lead');
const Chat = require('../models/Chat');

exports.getOverview = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const [totalMessages, faqCount, aiCount, leadCount, liveChatCount, respondedChats] = await Promise.all([
      ChatLog.countDocuments({ businessId, createdAt: { $gte: since } }),
      ChatLog.countDocuments({ businessId, source: 'faq', createdAt: { $gte: since } }),
      ChatLog.countDocuments({ businessId, source: 'ai', createdAt: { $gte: since } }),
      Lead.countDocuments({ businessId, createdAt: { $gte: since } }),
      Chat.countDocuments({ businessId, createdAt: { $gte: since } }),
      Chat.find({
        businessId,
        createdAt: { $gte: since },
        acceptedAt: { $ne: null }
      }).select('createdAt acceptedAt')
    ]);

    const faqRate = totalMessages > 0 ? Math.round((faqCount / totalMessages) * 100) : 0;

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
      periodDays: 30
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getTopQuestions = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const top = await ChatLog.aggregate([
      { $match: { businessId: businessId, createdAt: { $gte: since } } },
      { $group: { _id: { $toLower: '$userMessage' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json(top.map(t => ({ question: t._id, count: t.count })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getLeads = async (req, res) => {
  try {
    const leads = await Lead.find({ businessId: req.user.businessId }).sort({ createdAt: -1 });
    res.json(leads);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
};