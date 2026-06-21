// Lightweight input sanitizer replacing the abandoned `xss-clean` package
// (unmaintained since 2021). It walks request bodies and neutralizes the HTML
// metacharacters that enable stored/reflected XSS by escaping them to entities.
// Defense-in-depth only — the React frontend already escapes on render; this
// keeps payloads from ever being persisted in a dangerous form.
//
// Note: in Express 4 req.query/req.params are mutable; we sanitize body + params.
// We deliberately do NOT touch req.query keys used as Mongo operators — that's
// express-mongo-sanitize's job.

const escapeString = (str) =>
    str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

const sanitizeValue = (value) => {
    if (typeof value === 'string') return escapeString(value);
    if (Array.isArray(value)) return value.map(sanitizeValue);
    if (value && typeof value === 'object') {
        for (const key of Object.keys(value)) {
            value[key] = sanitizeValue(value[key]);
        }
        return value;
    }
    return value;
};

module.exports = function sanitize() {
    return (req, res, next) => {
        if (req.body) req.body = sanitizeValue(req.body);
        if (req.params) req.params = sanitizeValue(req.params);
        next();
    };
};
