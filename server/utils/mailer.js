const nodemailer = require('nodemailer');

// Email delivery, abstracted behind a single sendMail(). It auto-selects a
// driver from the environment so the rest of the app never cares how mail goes
// out:
//   - SMTP driver  — active when SMTP_HOST is set (works with Gmail, SES SMTP,
//                    Mailtrap, Postmark, any SMTP relay).
//   - console driver — the default in dev / when SMTP is not configured; the
//                    message is logged instead of sent so flows still work end
//                    to end locally without a provider account.
//
// Required SMTP env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.
// Optional: SMTP_SECURE ('true' for 465), MAIL_FROM (defaults to SMTP_USER).

let cachedTransport;

const getTransport = () => {
    if (cachedTransport !== undefined) return cachedTransport;
    if (!process.env.SMTP_HOST) {
        cachedTransport = null; // no SMTP configured -> console fallback
        return cachedTransport;
    }
    cachedTransport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER
            ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
            : undefined
    });
    return cachedTransport;
};

/**
 * Send an email. Never throws — on failure it logs and reports delivered:false,
 * so a mail outage cannot break the request that triggered it.
 * @param {{to:string, subject:string, text?:string, html?:string}} msg
 * @returns {Promise<{delivered:boolean, channel:string}>}
 */
const sendMail = async ({ to, subject, text, html }) => {
    const transport = getTransport();

    if (!transport) {
        console.log(`[mailer:console] To: ${to} | Subject: ${subject}\n${text || html || ''}`);
        return { delivered: false, channel: 'console' };
    }

    try {
        await transport.sendMail({
            from: process.env.MAIL_FROM || process.env.SMTP_USER,
            to,
            subject,
            text,
            html
        });
        return { delivered: true, channel: 'smtp' };
    } catch (err) {
        console.error('[mailer] send failed:', err.message);
        return { delivered: false, channel: 'smtp-error' };
    }
};

// True when a real delivery channel is configured (used to decide whether it is
// safe to stop exposing dev-only secrets like reset tokens).
const isMailConfigured = () => !!process.env.SMTP_HOST;

module.exports = { sendMail, isMailConfigured };
