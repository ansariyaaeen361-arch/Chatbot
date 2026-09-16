const stripe = require('../utils/stripeClient');
const Business = require('../models/Business');
const User = require('../models/User');
const PromoRedemption = require('../models/PromoRedemption');
const { getPlanConfig } = require('../utils/planConfig');

const STRIPE_LINKS = {
  starter: { monthly: process.env.STRIPE_STARTER_MONTHLY_LINK, yearly: process.env.STRIPE_STARTER_YEARLY_LINK },
  basic: { monthly: process.env.STRIPE_GROWTH_MONTHLY_LINK, yearly: process.env.STRIPE_GROWTH_YEARLY_LINK },
  pro: { monthly: process.env.STRIPE_PRO_MONTHLY_LINK, yearly: process.env.STRIPE_PRO_YEARLY_LINK }
};

// Promo codes that grant a plan directly, bypassing Stripe checkout. Each
// business can redeem a given code only once (tracked on the Business doc).
// Remove an entry here (or add an isActive:false check) to end an offer —
// past redemptions stay valid; they just can't be granted again.
const PROMO_CODES = {
  STARTERFORFREE: { plan: 'starter' },
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
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
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
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};

exports.getBillingStatus = async (req, res) => {
  try {
    const business = await Business.findById(req.user.businessId)
      .select('plan planStatus monthlySpendCap monthlySpendUsed');
    res.json(business);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};

exports.redeemPromo = async (req, res) => {
  try {
    const normalized = (req.body.code || '').trim().toUpperCase();
    const promo = PROMO_CODES[normalized];
    if (!promo) return res.status(400).json({ error: 'Invalid promo code.' });

    const business = await Business.findById(req.user.businessId);
    if (!business) return res.status(404).json({ error: 'Business not found' });

    if ((business.redeemedPromoCodes || []).includes(normalized)) {
      return res.status(400).json({ error: 'This promo code has already been used on this account.' });
    }

    business.plan = promo.plan;
    business.planStatus = 'active';
    business.monthlySpendCap = getPlanConfig(promo.plan).spendCap;
    business.redeemedPromoCodes = [...(business.redeemedPromoCodes || []), normalized];
    await business.save();

    const owner = await User.findOne({ businessId: business._id, role: 'owner' }).select('email');
    await PromoRedemption.create({
      businessId: business._id,
      businessName: business.name,
      redeemedByEmail: owner?.email || '',
      code: normalized,
      planGranted: promo.plan,
    });

    res.json({ success: true, plan: business.plan });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};

// Simple shared-secret check (no per-platform admin/user role exists yet) so
// this can be checked from outside the dashboard — pass ?secret=<ADMIN_SECRET>.
exports.getPromoRedemptions = async (req, res) => {
  try {
    if (!process.env.ADMIN_SECRET || req.query.secret !== process.env.ADMIN_SECRET) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const list = await PromoRedemption.find({}).sort({ redeemedAt: -1 });
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
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
