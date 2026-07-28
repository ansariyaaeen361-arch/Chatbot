const stripe = require('../utils/stripeClient');
const Business = require('../models/Business');
const { getPlanConfig } = require('../utils/planConfig');

const STRIPE_LINKS = {
  starter: { monthly: process.env.STRIPE_STARTER_MONTHLY_LINK, yearly: process.env.STRIPE_STARTER_YEARLY_LINK },
  basic: { monthly: process.env.STRIPE_GROWTH_MONTHLY_LINK, yearly: process.env.STRIPE_GROWTH_YEARLY_LINK },
  pro: { monthly: process.env.STRIPE_PRO_MONTHLY_LINK, yearly: process.env.STRIPE_PRO_YEARLY_LINK }
};

exports.createSubscription = async (req, res) => {
  try {
    const { plan, billingCycle } = req.body;
    const cycle = billingCycle === 'yearly' ? 'yearly' : 'monthly';
    const link = STRIPE_LINKS[plan] && STRIPE_LINKS[plan][cycle];
    if (!link) return res.status(400).json({ error: 'Invalid plan selected' });

    const business = await Business.findById(req.user.businessId);
    const reference = `${business._id}|${plan}|${cycle}`;
    const approveUrl = `${link}?client_reference_id=${encodeURIComponent(reference)}`;

    res.json({ approveUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.cancelSubscription = async (req, res) => {
  try {
    const business = await Business.findById(req.user.businessId);
    if (!business.stripeSubscriptionId) return res.status(400).json({ error: 'No active subscription' });

    await stripe.subscriptions.cancel(business.stripeSubscriptionId);

    business.planStatus = 'canceled';
    business.plan = 'trial';
    business.monthlySpendCap = getPlanConfig('trial').spendCap;
    await business.save();

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.getBillingStatus = async (req, res) => {
  try {
    const business = await Business.findById(req.user.businessId)
      .select('plan planStatus monthlySpendCap monthlySpendUsed');
    res.json(business);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.handleWebhook = async (req, res) => {
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const [businessId, plan, cycle] = (session.client_reference_id || '').split('|');

      if (businessId && STRIPE_LINKS[plan]) {
        await Business.findByIdAndUpdate(businessId, {
          plan,
          planStatus: 'active',
          stripeSubscriptionId: session.subscription || null,
          monthlySpendCap: getPlanConfig(plan).spendCap
        });
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      await Business.findOneAndUpdate({ stripeSubscriptionId: subscription.id }, {
        planStatus: 'canceled',
        plan: 'trial',
        monthlySpendCap: getPlanConfig('trial').spendCap
      });
    }

    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object;
      if (['canceled', 'unpaid', 'incomplete_expired'].includes(subscription.status)) {
        await Business.findOneAndUpdate({ stripeSubscriptionId: subscription.id }, {
          planStatus: 'canceled',
          plan: 'trial',
          monthlySpendCap: getPlanConfig('trial').spendCap
        });
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook handler failed:', err);
    res.status(500).send('Webhook handler failed');
  }
};
