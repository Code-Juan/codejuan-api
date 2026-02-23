const env = require('../config/env');

let stripe = null;

function getStripe() {
  if (!stripe && env.stripeSecretKey) {
    const Stripe = require('stripe');
    stripe = new Stripe(env.stripeSecretKey);
  }
  return stripe;
}

//create a checkout session for a client's e-commerce site
async function createCheckoutSession({ clientId, lineItems, successUrl, cancelUrl, customerEmail, metadata }) {
  const s = getStripe();
  if (!s) throw new Error('stripe not configured');

  const session = await s.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: lineItems,
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: customerEmail || undefined,
    metadata: {
      client_id: clientId,
      ...metadata,
    },
  });

  return session;
}

//verify and construct a webhook event
function constructWebhookEvent(rawBody, signature) {
  const s = getStripe();
  if (!s) throw new Error('stripe not configured');
  return s.webhooks.constructEvent(rawBody, signature, env.stripeWebhookSecret);
}

module.exports = { createCheckoutSession, constructWebhookEvent };
