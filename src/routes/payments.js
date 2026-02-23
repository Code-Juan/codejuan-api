const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { createCheckoutSession, constructWebhookEvent } = require('../services/stripe');
const { paymentLimiter } = require('../middleware/rateLimiter');

//POST /api/payments/checkout -- create a Stripe checkout session
router.post('/checkout', paymentLimiter, async (req, res) => {
  try {
    const { clientId, lineItems, successUrl, cancelUrl, customerEmail, metadata } = req.body;

    if (!clientId || !lineItems || !successUrl || !cancelUrl) {
      return res.status(400).json({ error: 'Missing required fields: clientId, lineItems, successUrl, cancelUrl' });
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
