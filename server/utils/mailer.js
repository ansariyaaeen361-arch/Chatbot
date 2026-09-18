const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT == 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  // The VPS's IPv6 route to Gmail's SMTP is unreliable (intermittent
  // ENETUNREACH), so force IPv4 for this connection rather than relying on
  // Node's global DNS ordering, which doesn't always apply here.
  family: 4,
  tls: {
    rejectUnauthorized: false
  }
});

const sendEmail = async ({ to, subject, html }) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
    });
    console.log(`[Email Sent] To: ${to} | MessageId: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[Email Failed] To: ${to} | Error: ${error.message}`);
    throw error;
  }
};

module.exports = sendEmail;