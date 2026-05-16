const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { sendContactNotification, sendAutoReply } = require('../services/email');
const { getClient } = require('../config/clients');
const env = require('../config/env');
const { contactLimiter } = require('../middleware/rateLimiter');
const { contactRules, handleValidationErrors } = require('../middleware/validate');

//POST /api/contact -- default contact form (your own sites)
//POST /api/contact/:clientId -- per-client contact form
router.post('/', contactLimiter, contactRules, handleValidationErrors, async (req, res) => {
  try {
    const clientId = 'codejuan';
    const client = getClient(clientId);
    const { name, email, phone, service, message } = req.body;

    //store submission in database
    try {
      await pool.query(
        `INSERT INTO submissions (client_id, name, email, phone, service, message, page_url, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [clientId, name, email, phone || null, service || null, message, req.get('referer') || null, req.ip]
      );
    } catch (dbErr) {
      console.error('db insert error (non-fatal):', dbErr.message);
      //continue even if DB insert fails -- email is more important
    }

    //send notification email to you (or client)
    const notificationEmail = client?.notificationEmail || env.notificationEmail;
    await sendContactNotification({
      to: notificationEmail,
      name,
      email,
      phone,
      service,
      message,
      clientName: client?.name || 'codeJuan',
    });

    //send auto-reply to the submitter
    sendAutoReply({
      to: email,
      name,
      clientName: client?.name || 'codeJuan Web Services',
    }).catch(err => console.error('auto-reply failed:', err.message));

    res.status(200).json({ success: true, message: 'Message sent successfully.' });
  } catch (err) {
    console.error('contact form error:', err);
    res.status(500).json({ error: 'Failed to send message. Please try again.' });
  }
});

router.post('/:clientId', contactLimiter, contactRules, handleValidationErrors, async (req, res) => {
  try {
    const clientId = req.params.clientId;
    const client = getClient(clientId);
    const { name, email, phone, service, message } = req.body;

    try {
      await pool.query(
        `INSERT INTO submissions (client_id, name, email, phone, service, message, page_url, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [clientId, name, email, phone || null, service || null, message, req.get('referer') || null, req.ip]
      );
    } catch (dbErr) {
      console.error('db insert error (non-fatal):', dbErr.message);
    }

    const notificationEmail = client?.notificationEmail || env.notificationEmail;
    await sendContactNotification({
      to: notificationEmail,
      name,
      email,
      phone,
      service,
      message,
      clientName: client?.name || 'codeJuan',
    });

    sendAutoReply({
      to: email,
      name,
      clientName: client?.name || 'codeJuan Web Services',
    }).catch(err => console.error('auto-reply failed:', err.message));

    res.status(200).json({ success: true, message: 'Message sent successfully.' });
  } catch (err) {
    console.error('contact form error:', err);
    res.status(500).json({ error: 'Failed to send message. Please try again.' });
  }
});

//GET /api/submissions/:clientId -- view submissions for a client (future dashboard)
router.get('/submissions/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const offset = parseInt(req.query.offset, 10) || 0;

    const result = await pool.query(
      `SELECT id, name, email, phone, service, message, page_url, created_at
       FROM submissions
       WHERE client_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [clientId, limit, offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM submissions WHERE client_id = $1',
      [clientId]
    );

    res.json({
      submissions: result.rows,
      total: parseInt(countResult.rows[0].count, 10),
      limit,
      offset,
    });
  } catch (err) {
    console.error('fetch submissions error:', err);
    res.status(500).json({ error: 'Failed to fetch submissions.' });
  }
});

module.exports = router;
