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

  crmWebhookUrl: {
    type: String,
    default: "",
  },

  businessHours: {
    enabled: { type: Boolean, default: false },
    timezone: { type: String, default: "UTC" },
    schedule: {
      mon: { open: { type: String, default: "09:00" }, close: { type: String, default: "17:00" }, closed: { type: Boolean, default: false } },
      tue: { open: { type: String, default: "09:00" }, close: { type: String, default: "17:00" }, closed: { type: Boolean, default: false } },
      wed: { open: { type: String, default: "09:00" }, close: { type: String, default: "17:00" }, closed: { type: Boolean, default: false } },
      thu: { open: { type: String, default: "09:00" }, close: { type: String, default: "17:00" }, closed: { type: Boolean, default: false } },
      fri: { open: { type: String, default: "09:00" }, close: { type: String, default: "17:00" }, closed: { type: Boolean, default: false } },
      sat: { open: { type: String, default: "09:00" }, close: { type: String, default: "17:00" }, closed: { type: Boolean, default: true } },
      sun: { open: { type: String, default: "09:00" }, close: { type: String, default: "17:00" }, closed: { type: Boolean, default: true } },
    },
  },
  awayMessage: {
    type: String,
    default: "We're currently offline. Leave your details and we'll get back to you as soon as we're back.",
  },
  autoAssignChats: {
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
  spendWarningSent: { type: Boolean, default: false },
  monthlyConversationsUsed: { type: Number, default: 0 },
  spendResetAt: { type: Date, default: Date.now },

  stripeSubscriptionId: { type: String, default: null },
  planStatus: { type: String, default: "trialing" },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Business", businessSchema);