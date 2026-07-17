const { paypalFetch, verifyWebhookEvent } = require('../utils/paypalClient');
const Business = require('../models/Business');
const { getPlanConfig } = require('../utils/planConfig');

const PLAN_MAP = {
  starter: { monthly: process.env.PAYPAL_STARTER_PLAN_ID, yearly: process.env.PAYPAL_STARTER_YEARLY_PLAN_ID },
  basic: { monthly: process.env.PAYPAL_BASIC_PLAN_ID, yearly: process.env.PAYPAL_BASIC_YEARLY_PLAN_ID },
  pro: { monthly: process.env.PAYPAL_PRO_PLAN_ID, yearly: process.env.PAYPAL_PRO_YEARLY_PLAN_ID }
};

function planFromPlanId(planId) {
  for (const [plan, cycles] of Object.entries(PLAN_MAP)) {
    if (planId === cycles.monthly || planId === cycles.yearly) return plan;
  }
  return 'trial';
}

exports.createSubscription = async (req, res) => {
  try {
    const { plan, billingCycle } = req.body;
    const cycle = billingCycle === 'yearly' ? 'yearly' : 'monthly';
    const planId = PLAN_MAP[plan] && PLAN_MAP[plan][cycle];
    if (!planId) return res.status(400).json({ error: 'Invalid plan selected' });

    const business = await Business.findById(req.user.businessId);

    const subscription = await paypalFetch('/v1/billing/subscriptions', {
      method: 'POST',
      headers: { 'PayPal-Request-Id': `${business._id}-${Date.now()}` },
      body: JSON.stringify({
        plan_id: planId,
        custom_id: business._id.toString(),
        application_context: {
          brand_name: business.name || 'AI Chatbot',
          user_action: 'SUBSCRIBE_NOW',
          return_url: `${process.env.CLIENT_URL}/billing/confirm?plan=${plan}`,
          cancel_url: `${process.env.CLIENT_URL}/billing?canceled=true`
        }
      })
    });

    const approveLink = subscription.links.find(l => l.rel === 'approve');
    if (!approveLink) throw new Error('No approval link returned by PayPal');

    res.json({ approveUrl: approveLink.href });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.confirmSubscription = async (req, res) => {
  try {
    const { subscriptionId, plan } = req.body;
    if (!subscriptionId) return res.status(400).json({ error: 'subscriptionId required' });

    const sub = await paypalFetch(`/v1/billing/subscriptions/${subscriptionId}`);

    if (sub.status !== 'ACTIVE' && sub.status !== 'APPROVED') {
      return res.status(400).json({ error: `Subscription status: ${sub.status}` });
    }

    const resolvedPlan = PLAN_MAP[plan] ? plan : planFromPlanId(sub.plan_id);

    const business = await Business.findByIdAndUpdate(req.user.businessId, {
      paypalSubscriptionId: subscriptionId,
      plan: resolvedPlan,
      planStatus: sub.status === 'ACTIVE' ? 'active' : 'pending',
      monthlySpendCap: getPlanConfig(resolvedPlan).spendCap
    }, { new: true });

    res.json(business);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.cancelSubscription = async (req, res) => {
  try {
    const business = await Business.findById(req.user.businessId);
    if (!business.paypalSubscriptionId) return res.status(400).json({ error: 'No active subscription' });

    await paypalFetch(`/v1/billing/subscriptions/${business.paypalSubscriptionId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason: 'Canceled by customer' })
    });

    business.planStatus = 'canceled';
    business.plan = 'trial';
    await business.save();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getBillingStatus = async (req, res) => {
  try {
    const business = await Business.findById(req.user.businessId)
      .select('plan planStatus monthlySpendCap monthlySpendUsed paypalSubscriptionId');
    res.json(business);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.handleWebhook = async (req, res) => {
  try {
    const isValid = await verifyWebhookEvent(req.headers, req.body, process.env.PAYPAL_WEBHOOK_ID);
    if (!isValid) return res.status(400).send('Invalid webhook signature');

    const event = req.body;
    const subscriptionId = (event.resource || {}).id;

    if (event.event_type === 'BILLING.SUBSCRIPTION.ACTIVATED') {
      await Business.findOneAndUpdate({ paypalSubscriptionId: subscriptionId }, { planStatus: 'active' });
    }
    if (event.event_type === 'BILLING.SUBSCRIPTION.CANCELLED' || event.event_type === 'BILLING.SUBSCRIPTION.SUSPENDED') {
      await Business.findOneAndUpdate({ paypalSubscriptionId: subscriptionId }, { planStatus: 'canceled', plan: 'trial' });
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).send('Webhook handler failed');
  }
};