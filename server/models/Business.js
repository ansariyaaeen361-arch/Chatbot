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

  brandColor: {
    type: String,
    default: "#1B1A18",
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

  plan: {
    type: String,
    default: "trial",
  },

  monthlySpendCap: {
    type: Number,
    default: 10,
  },
  monthlySpendUsed: { type: Number, default: 0 },
  spendResetAt: { type: Date, default: Date.now },

  paypalSubscriptionId: { type: String, default: null },
  planStatus: { type: String, default: "trialing" },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Business", businessSchema);