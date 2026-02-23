const { Resend } = require('resend');
const env = require('../config/env');

const resend = new Resend(env.resendApiKey);

//send contact form notification email
async function sendContactNotification({ to, from, name, email, phone, service, message, clientName }) {
  const fromEmail = from || env.defaultFromEmail;
  const toEmail = to || env.notificationEmail;

  const { data, error } = await resend.emails.send({
    from: `${clientName || 'CodeJuan'} Contact Form <${fromEmail}>`,
    to: [toEmail],
    replyTo: email,
    subject: `New Contact Form Submission from ${name}`,
    html: `
      <h2>New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      ${phone ? `<p><strong>Phone:</strong> ${escapeHtml(phone)}</p>` : ''}
      ${service ? `<p><strong>Service:</strong> ${escapeHtml(service)}</p>` : ''}
      <p><strong>Message:</strong></p>
      <p>${escapeHtml(message)}</p>
      <hr>
      <p style="color: #666; font-size: 12px;">
        Sent via ${clientName || 'CodeJuan'} contact form
      </p>
    `,
  });

  if (error) {
    console.error('resend error:', error);
    throw new Error(`email send failed: ${error.message}`);
  }

  return data;
}

//send auto-reply to the person who submitted the form
async function sendAutoReply({ to, from, name, clientName }) {
  const fromEmail = from || env.defaultFromEmail;

  const { data, error } = await resend.emails.send({
    from: `${clientName || 'CodeJuan'} <${fromEmail}>`,
    to: [to],
    subject: `Thanks for reaching out, ${name}!`,
    html: `
      <h2>Thanks for your message, ${escapeHtml(name)}!</h2>
      <p>I've received your inquiry and will get back to you within 24 hours with more details.</p>
      <p>If your request is urgent, feel free to reply to this email directly.</p>
      <br>
      <p>Best regards,</p>
      <p>Juan Contreras<br>${clientName || 'CodeJuan Web Services'}</p>
    `,
  });

  if (error) {
    console.error('auto-reply error:', error);
    //don't throw -- auto-reply failure shouldn't break the form submission
  }

  return data;
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = { sendContactNotification, sendAutoReply };
