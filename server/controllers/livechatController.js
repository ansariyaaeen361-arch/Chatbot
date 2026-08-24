const mongoose = require("mongoose");
const Chat = require("../models/Chat");
const Message = require("../models/Message");
const Business = require("../models/Business");
const User = require("../models/User");
const { countConversationIfNew } = require("../utils/conversationCounter");
const { resetIfNewMonth } = require("../utils/monthlyReset");
const { hasFeature, getPlanConfig } = require("../utils/planConfig");
const { isBusinessOpen } = require("../utils/businessHours");

// Picks the teammate with the fewest currently-active chats. Ties go to whoever
// Mongo returns first (no further tiebreaker needed — this only has to be "fair
// enough", not perfectly deterministic).
async function pickLeastBusyAgent(businessId) {
  const teamMembers = await User.find({ businessId }).select("_id name");
  if (!teamMembers.length) return null;

  const activeCounts = await Chat.aggregate([
    { $match: { businessId: new mongoose.Types.ObjectId(businessId), status: "active" } },
    { $group: { _id: "$assignedTo", count: { $sum: 1 } } },
  ]);
  const countByAgent = new Map(activeCounts.map((c) => [String(c._id), c.count]));

  let leastBusy = teamMembers[0];
  let minCount = countByAgent.get(String(leastBusy._id)) || 0;
  for (const member of teamMembers) {
    const count = countByAgent.get(String(member._id)) || 0;
    if (count < minCount) {
      minCount = count;
      leastBusy = member;
    }
  }
  return leastBusy;
}

// PUBLIC — widget creates a new chat
exports.createChat = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { name, email, phone, sessionId } = req.body;

    const business = await Business.findById(businessId);
    if (!business) return res.status(404).json({ error: "Business not found" });
    if (!hasFeature(business, "liveChat")) {
      return res.json({ error: "live_chat_unavailable", message: "Live chat isn't available on this plan." });
    }
    if (!isBusinessOpen(business)) {
      return res.json({ error: "outside_hours", message: business.awayMessage });
    }

    await resetIfNewMonth(business);
    await countConversationIfNew(business, sessionId);

    const conversationCap = getPlanConfig(business.plan).conversationCap;
    if (business.monthlyConversationsUsed > conversationCap) {
      await business.save();
      return res.json({ error: "conversation_limit_reached", message: "This business has reached its monthly conversation limit. Please try again later." });
    }

    const chatData = {
      businessId,
      visitorName: name || "Website visitor",
      visitorEmail: email || "",
      visitorPhone: phone || "",
    };

    if (business.autoAssignChats) {
      const assignee = await pickLeastBusyAgent(businessId);
      if (assignee) {
        chatData.status = "active";
        chatData.assignedTo = assignee._id;
        chatData.assignedToName = assignee.name;
        chatData.acceptedAt = new Date();
      }
    }

    const chat = await Chat.create(chatData);

    const io = req.app.get("io");
    io.to(`business_${businessId}`).emit("refresh");
    if (chat.assignedTo) io.to(`chat_${chat._id}`).emit("chat_updated", chat);
    res.json({ chatId: chat._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};

// PUBLIC (visitor) / AUTH (rep) — sends a message
exports.sendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { sender, text } = req.body;

    if (!text || !sender)
      return res.status(400).json({ error: "sender and text required" });
    if (sender !== "visitor" && sender !== "rep")
      return res.status(400).json({ error: "Invalid sender" });

    let repName = null;
    if (sender === "rep") {
      if (!req.user) return res.status(401).json({ error: "Login required to send as a rep" });
      const repUser = await User.findById(req.user.userId).select("isVerified");
      if (!repUser || !repUser.isVerified) {
        return res.status(403).json({ error: "Please verify your email before continuing." });
      }
      if (req.user.role !== "owner") {
        const repBusiness = await Business.findById(req.user.businessId).select("plan");
        const seatLimit = getPlanConfig(repBusiness.plan).seatLimit;
        const seatsUsed = await User.countDocuments({ businessId: req.user.businessId });
        if (seatsUsed > seatLimit) {
          return res.status(403).json({ error: "This business has more team members than its plan allows." });
        }
      }
      const chat = await Chat.findOne({ _id: chatId, businessId: req.user.businessId });
      if (!chat) return res.status(404).json({ error: "Chat not found" });
      repName = req.user.name || null;
    }

    const message = await Message.create({
      chatId,
      sender,
      text,
      repName,
    });
    req.app.get("io").to(`chat_${chatId}`).emit("new_message", message);

    res.json({ success: true, message });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};

// AUTH (dashboard only) — get messages for a chat
exports.getMessages = async (req, res) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.chatId, businessId: req.user.businessId });
    if (!chat) return res.status(404).json({ error: "Chat not found" });

    const messages = await Message.find({ chatId: req.params.chatId }).sort({
      timestamp: 1,
    });
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};

// AUTH (dashboard only) — get chat status
exports.getChat = async (req, res) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.chatId, businessId: req.user.businessId });
    if (!chat) return res.status(404).json({ error: "Chat not found" });
    res.json(chat);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};

// AUTH — list chats for dashboard, scoped by role
exports.listChats = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { status } = req.query;
    const isAdmin = req.user.role === "owner" || req.user.role === "admin";

    const filter = { businessId, status };
    if (!isAdmin) filter.assignedTo = req.user.userId;
    if (status === "waiting") delete filter.assignedTo; // waiting queue is shared for everyone

    const chats = await Chat.find(filter).sort({
      createdAt: status === "waiting" ? 1 : -1,
    });
    res.json(chats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};

// AUTH — accept a waiting chat (atomic, race-condition safe)
exports.acceptChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = await Chat.findOneAndUpdate(
      { _id: chatId, businessId: req.user.businessId, status: "waiting", assignedTo: null },
      {
        status: "active",
        assignedTo: req.user.userId,
        assignedToName: req.user.name,
        acceptedAt: new Date(),
      },
      { new: true },
    );

    if (!chat)
      return res
        .status(409)
        .json({ error: "This chat was already picked up." });

    await Message.create({
      chatId,
      sender: "system",
      text: `${req.user.name} has joined the chat.`,
      repName: req.user.name,
    });

    const io = req.app.get("io");
    io.to(`chat_${chatId}`).emit("new_message", {
      sender: "system",
      text: `${req.user.name} has joined the chat.`,
    });
    io.to(`chat_${chatId}`).emit("chat_updated", chat);
    io.to(`business_${chat.businessId}`).emit("refresh");

    res.json(chat);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};

// AUTH — transfer to another rep
exports.transferChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { newUserId, newUserName } = req.body;
    const isAdmin = req.user.role === "owner" || req.user.role === "admin";

    const chat = await Chat.findOne({ _id: chatId, businessId: req.user.businessId });
    if (!chat) return res.status(404).json({ error: "Chat not found" });
    if (!isAdmin && String(chat.assignedTo) !== req.user.userId) {
      return res.status(403).json({ error: "Not your chat to transfer" });
    }

    const targetUser = await User.findOne({ _id: newUserId, businessId: req.user.businessId });
    if (!targetUser) return res.status(400).json({ error: "That teammate was not found" });

    chat.assignedTo = targetUser._id;
    chat.assignedToName = targetUser.name;
    await chat.save();

    await Message.create({
      chatId,
      sender: "system",
      text: `${targetUser.name} has joined the chat.`,
      repName: targetUser.name,
    });

    const io = req.app.get("io");
    io.to(`chat_${chatId}`).emit("new_message", {
      sender: "system",
      text: `${targetUser.name} has joined the chat.`,
    });
    io.to(`chat_${chatId}`).emit("chat_updated", chat);
    io.to(`business_${chat.businessId}`).emit("refresh");

    res.json(chat);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};

// AUTH — close chat
exports.closeChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = await Chat.findOneAndUpdate(
      { _id: chatId, businessId: req.user.businessId },
      { status: "closed", closedAt: new Date() },
      { new: true },
    );
    if (!chat) return res.status(404).json({ error: "Chat not found" });

    const io = req.app.get("io");
    io.to(`chat_${chatId}`).emit("chat_updated", chat);
    io.to(`business_${chat.businessId}`).emit("refresh");

    res.json(chat);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};
// PUBLIC — visitor leaves/ends their own chat (no auth needed)
exports.leaveChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = await Chat.findById(chatId);
    if (!chat) return res.json({ success: true }); // already gone, nothing to do

    if (chat.status !== 'closed') {
      chat.status = 'closed';
      chat.closedAt = new Date();
      await chat.save();

      await Message.create({ chatId, sender: 'system', text: 'The visitor has left the chat.' });

      const io = req.app.get('io');
      io.to(`chat_${chatId}`).emit('new_message', { sender: 'system', text: 'The visitor has left the chat.' });
      io.to(`chat_${chatId}`).emit('chat_updated', chat);
      io.to(`business_${chat.businessId}`).emit('refresh');
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};