const Chat = require("../models/Chat");
const Message = require("../models/Message");
const Business = require("../models/Business");
const { countConversationIfNew } = require("../utils/conversationCounter");
const { resetIfNewMonth } = require("../utils/monthlyReset");
const { hasFeature } = require("../utils/planConfig");

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

    const chat = await Chat.create({
      businessId,
      visitorName: name || "Website visitor",
      visitorEmail: email || "",
      visitorPhone: phone || "",
    });

    resetIfNewMonth(business);
    await countConversationIfNew(business, sessionId);

    req.app.get("io").to(`business_${businessId}`).emit("refresh");
    res.json({ chatId: chat._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUBLIC — visitor or rep sends a message
exports.sendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { sender, text, repName } = req.body;

    if (!text || !sender)
      return res.status(400).json({ error: "sender and text required" });

    const message = await Message.create({
      chatId,
      sender,
      text,
      repName: repName || null,
    });
    req.app.get("io").to(`chat_${chatId}`).emit("new_message", message);

    res.json({ success: true, message });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUBLIC — get messages for a chat (widget resume + dashboard)
exports.getMessages = async (req, res) => {
  try {
    const messages = await Message.find({ chatId: req.params.chatId }).sort({
      timestamp: 1,
    });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// AUTH — get chat status (widget polls this too, to know when active/closed)
exports.getChat = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ error: "Chat not found" });
    res.json(chat);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
};

// AUTH — accept a waiting chat (atomic, race-condition safe)
exports.acceptChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = await Chat.findOneAndUpdate(
      { _id: chatId, status: "waiting", assignedTo: null },
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
    res.status(500).json({ error: err.message });
  }
};

// AUTH — transfer to another rep
exports.transferChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { newUserId, newUserName } = req.body;
    const isAdmin = req.user.role === "owner" || req.user.role === "admin";

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ error: "Chat not found" });
    if (!isAdmin && String(chat.assignedTo) !== req.user.userId) {
      return res.status(403).json({ error: "Not your chat to transfer" });
    }

    chat.assignedTo = newUserId;
    chat.assignedToName = newUserName;
    await chat.save();

    await Message.create({
      chatId,
      sender: "system",
      text: `${newUserName} has joined the chat.`,
      repName: newUserName,
    });

    const io = req.app.get("io");
    io.to(`chat_${chatId}`).emit("new_message", {
      sender: "system",
      text: `${newUserName} has joined the chat.`,
    });
    io.to(`chat_${chatId}`).emit("chat_updated", chat);
    io.to(`business_${chat.businessId}`).emit("refresh");

    res.json(chat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// AUTH — close chat
exports.closeChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = await Chat.findByIdAndUpdate(
      chatId,
      { status: "closed", closedAt: new Date() },
      { new: true },
    );

    const io = req.app.get("io");
    io.to(`chat_${chatId}`).emit("chat_updated", chat);
    io.to(`business_${chat.businessId}`).emit("refresh");

    res.json(chat);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
};