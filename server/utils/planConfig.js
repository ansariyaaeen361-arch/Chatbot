const PLAN_FEATURES = {
  trial:   { seatLimit: 1,  spendCap: 10,  conversationCap: 500,   liveChat: false, analytics: false, removeBranding: false, crmIntegration: false },
  starter: { seatLimit: 1,  spendCap: 20,  conversationCap: 500,   liveChat: false, analytics: false, removeBranding: false, crmIntegration: false },
  basic:   { seatLimit: 5,  spendCap: 20,  conversationCap: 2500,  liveChat: true,  analytics: true,  removeBranding: true,  crmIntegration: true  }, // "Growth" tier
  pro:     { seatLimit: 10, spendCap: 100, conversationCap: 10000, liveChat: true,  analytics: true,  removeBranding: true,  crmIntegration: true  }, // "Pro/Business" tier
};

function getPlanConfig(plan) {
  return PLAN_FEATURES[plan] || PLAN_FEATURES.trial;
}

function hasFeature(business, feature) {
  return !!getPlanConfig(business.plan)[feature];
}

module.exports = { PLAN_FEATURES, getPlanConfig, hasFeature };
