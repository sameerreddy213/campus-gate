const crypto = require('crypto');

// Generate a high-entropy temporary password for provisioned accounts.
// ~12 url-safe chars from 9 random bytes (~72 bits) — not guessable, unlike the
// old "password = rollNumber" default. Delivered out-of-band; the account is
// flagged `mustChangePassword` so it must be rotated on first login.
const generateTempPassword = () => crypto.randomBytes(9).toString('base64url');

module.exports = { generateTempPassword };
