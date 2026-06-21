// SMS delivery, abstracted behind a single sendSms(). Driver is auto-selected
// from the environment:
//   - twilio driver  — active when TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN +
//                      TWILIO_FROM are set. Calls Twilio's REST API directly with
//                      global fetch (Node 18+), so no SDK dependency is needed.
//   - console driver — the default in dev / when Twilio is not configured; the
//                      message is logged so OTP login works end to end locally.
//
// To plug in a different provider (MSG91, Textlocal, etc.) add a branch here;
// the rest of the app only calls sendSms({ to, body }).

// Twilio needs the Account SID (AC...) in the URL and a From number. Auth can use
// either the Account SID + Auth Token, or an API Key SID (SK...) + its secret.
const twilioConfigured = () =>
    !!(process.env.TWILIO_ACCOUNT_SID
        && process.env.TWILIO_FROM
        && (process.env.TWILIO_AUTH_TOKEN
            || (process.env.TWILIO_API_KEY_SID && process.env.TWILIO_API_KEY_SECRET)));

const sendViaTwilio = async (to, body) => {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
    // Prefer API Key auth (SK + secret) when present; fall back to Auth Token.
    const authUser = process.env.TWILIO_API_KEY_SID || sid;
    const authPass = process.env.TWILIO_API_KEY_SECRET || process.env.TWILIO_AUTH_TOKEN;
    const auth = Buffer.from(`${authUser}:${authPass}`).toString('base64');
    const params = new URLSearchParams({ To: to, From: process.env.TWILIO_FROM, Body: body });

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
    });

    if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(`Twilio ${res.status}: ${detail.slice(0, 200)}`);
    }
};

/**
 * Send an SMS. Never throws — on failure it logs and reports delivered:false.
 * @param {{to:string, body:string}} msg
 * @returns {Promise<{delivered:boolean, channel:string}>}
 */
const sendSms = async ({ to, body }) => {
    if (!twilioConfigured()) {
        console.log(`[sms:console] To: ${to} | ${body}`);
        return { delivered: false, channel: 'console' };
    }
    try {
        await sendViaTwilio(to, body);
        return { delivered: true, channel: 'twilio' };
    } catch (err) {
        console.error('[sms] send failed:', err.message);
        return { delivered: false, channel: 'twilio-error' };
    }
};

const isSmsConfigured = () => twilioConfigured();

module.exports = { sendSms, isSmsConfigured };
