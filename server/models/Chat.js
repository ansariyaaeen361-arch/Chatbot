const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Business",
    required: true,
  },
  visitorName: { type: String, default: "Website visitor" },
  visitorEmail: { type: String, default: "" },
  visitorPhone: { type: String, default: "" },
  status: {
    type: String,
    enum: ["waiting", "active", "closed"],
    default: "waiting",
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  assignedToName: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  acceptedAt: { type: Date, default: null },
  closedAt: { type: Date, default: null },
});

module.exports = mongoose.model("Chat", chatSchema);
