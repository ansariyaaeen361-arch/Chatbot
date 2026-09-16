const mongoose = require("mongoose");

// A standalone audit log of every promo code redemption, kept separate from
// the Business doc so "how many businesses took offer X" stays easy to query
// even as businesses later change plans again.
const promoRedemptionSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true },
  businessName: { type: String, default: "" },
  redeemedByEmail: { type: String, default: "" },
  code: { type: String, required: true },
  planGranted: { type: String, required: true },
  redeemedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("PromoRedemption", promoRedemptionSchema);
