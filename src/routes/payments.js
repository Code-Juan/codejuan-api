const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { createCheckoutSession, constructWebhookEvent } = require('../services/stripe');
const { paymentLimiter } = require('../middleware/rateLimiter');
const { getCatalogItem } = require('../config/catalog');
const { getClient } = require('../config/clients');
const env = require('../config/env');

function requirePaymentsEnabled(req, res, next) {
  if (!env.paymentsEnabled) {
    return res.status(503).json({ error: 'Payments are not available.' });
  }

  next();
}

//redirect urls must point back at a site we control
function isAllowedRedirectUrl(value) {
  try {
    return env.allowedOrigins.includes(new URL(value).origin);
  } catch {
    return false;
  }
}

//POST /api/payments/checkout -- create a Stripe checkout session
//items reference the server-side catalog by id; prices are never taken from the request
router.post('/checkout', requirePaymentsEnabled, paymentLimiter, async (req, res) => {
  try {
    const { clientId, items, successUrl, cancelUrl, customerEmail, metadata } = req.body;

    if (!clientId || !Array.isArray(items) || items.length === 0 || !successUrl || !cancelUrl) {
      return res.status(400).json({ error: 'Missing required fields: clientId, items, successUrl, cancelUrl' });
    }

    if (!getClient(clientId)) {
      return res.status(400).json({ error: 'Unknown client.' });
    }

    if (!isAllowedRedirectUrl(successUrl) || !isAllowedRedirectUrl(cancelUrl)) {
      return res.status(400).json({ error: 'Redirect URLs must use an allowed origin.' });
    }

    if (items.length > 20) {
      return res.status(400).json({ error: 'Too many items.' });
    }

    const lineItems = [];
    for (const item of items) {
      const catalogItem = getCatalogItem(item && item.itemId);
      if (!catalogItem) {
        return res.status(400).json({ error: 'Unknown item.' });
      }

      const quantity = Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 10
        ? item.quantity
        : 1;
      lineItems.push({ name: catalogItem.name, amount: catalogItem.amount, quantity });
    }

    const session = await createCheckoutSession({
      clientId,
      lineItems,
      successUrl,
      cancelUrl,
      customerEmail,
      metadata,
    });

    //store the pending payment
    try {
      await pool.query(
        `INSERT INTO payments (client_id, stripe_session_id, customer_email, amount_total, status, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [clientId, session.id, customerEmail || null, session.amount_total, 'pending', JSON.stringify(metadata || {})]
      );
    } catch (dbErr) {
      console.error('db payment insert error:', dbErr.message);
    }

    res.json({ sessionId: session.id, url: session.url });
  } catch (err) {
    console.error('checkout error:', err);
    res.status(500).json({ error: 'Failed to create checkout session.' });
  }
});

//POST /api/payments/webhook -- handle Stripe webhook events
//note: this route needs raw body, handled in index.js
router.post('/webhook', async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const event = constructWebhookEvent(req.body, sig);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await pool.query(
          `UPDATE payments SET
            status = 'completed',
            stripe_payment_intent = $1,
            amount_total = $2,
            customer_email = $3,
            updated_at = NOW()
           WHERE stripe_session_id = $4`,
          [session.payment_intent, session.amount_total, session.customer_details?.email, session.id]
        );
        console.log(`payment completed: ${session.id}`);
        break;
      }
      case 'checkout.session.expired': {
        const session = event.data.object;
        await pool.query(
          `UPDATE payments SET status = 'expired', updated_at = NOW() WHERE stripe_session_id = $1`,
          [session.id]
        );
        break;
      }
      default:
        console.log(`unhandled stripe event: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('webhook error:', err);
    res.status(400).json({ error: 'Webhook processing failed.' });
  }
});

module.exports = router;
