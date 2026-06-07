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

  const stripeLineItems = lineItems.map((item) => {
    if (item.price_data || item.price) {
      return {
        quantity: item.quantity || 1,
        ...(item.price ? { price: item.price } : { price_data: item.price_data }),
      };
    }

    return {
      quantity: item.quantity || 1,
      price_data: {
        currency: item.currency || 'usd',
        product_data: {
          name: item.name,
          ...(item.description ? { description: item.description } : {}),
        },
        unit_amount: item.amount,
      },
    };
  });

  const session = await s.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: stripeLineItems,
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
