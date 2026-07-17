const mongoose = require("mongoose");

const businessSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },

  website: {
    type: String,
    default: "",
  },

  logoUrl: {
    type: String,
    default: "",
  },
  launcherType: {
    type: String,
    enum: ["default", "image", "video"],
    default: "default",
  },
  launcherMediaUrl: {
    type: String,
    default: "",
  },
  welcomeMessage: {
    type: String,
    default: "Hi! How can I help you today?",
  },
  launcherPosition: {
    type: String,
    enum: ["left", "right"],
    default: "right",
  },
  brandColor: {
    type: String,
    default: "#1B1A18",
  },
  hideBranding: {
    type: Boolean,
    default: false,
  },

  description: {
    type: String,
    default: "",
  },

  services: [
    {
      type: String,
    },
  ],

  targetCustomer: {
    type: String,
    default: "",
  },

  tone: {
    type: String,
    default: "professional",
  },

  ctaLinks: [
    {
      label: {
        type: String,
      },
      url: {
        type: String,
      },
    },
  ],

  faqs: [
    {
      question: {
        type: String,
      },
      answer: {
        type: String,
      },
    },
  ],
  knowledgeBase: [
    {
      title: { type: String, default: "" },
      content: { type: String, required: true },
      source: { type: String, default: "manual" }, // 'manual' | 'scraped'
      addedAt: { type: Date, default: Date.now },
    },
  ],

  plan: {
    type: String,
    enum: ["trial", "starter", "basic", "pro"],
    default: "trial",
  },

  monthlySpendCap: {
    type: Number,
    default: 10,
  },
  monthlySpendUsed: { type: Number, default: 0 },
  monthlyConversationsUsed: { type: Number, default: 0 },
  spendResetAt: { type: Date, default: Date.now },

  paypalSubscriptionId: { type: String, default: null },
  planStatus: { type: String, default: "trialing" },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Business", businessSchema);