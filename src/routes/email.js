const express = require('express');
const env = require('../config/env');
const {
  verifyInboundWebhook,
  shouldForwardInbound,
  forwardReceivedEmail,
} = require('../services/email');

const router = express.Router();

//POST /api/email/webhook -- Resend inbound (email.received)
router.post('/webhook', async (req, res) => {
  try {
    if (!env.resendWebhookSecret || !env.forwardToEmail) {
      return res.status(500).json({ error: 'Inbound email not configured.' });
    }

    const payload = req.body.toString('utf8');

    const id = req.headers['svix-id'];
    const timestamp = req.headers['svix-timestamp'];
    const signature = req.headers['svix-signature'];
    if (!id || !timestamp || !signature) {
      return res.status(400).json({ error: 'Missing webhook headers.' });
    }

    const event = verifyInboundWebhook(payload, { id, timestamp, signature });

    if (event.type !== 'email.received') {
      return res.status(200).json({ ok: true, skipped: true });
    }

    if (!shouldForwardInbound(event.data.to)) {
      return res.status(200).json({ ok: true, skipped: true });
    }

    await forwardReceivedEmail({
      emailId: event.data.email_id,
      from: event.data.from,
      to: event.data.to,
      subject: event.data.subject,
    });

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('resend inbound webhook error:', err);
    res.status(500).json({ error: 'Webhook processing failed.' });
  }
});

module.exports = router;
