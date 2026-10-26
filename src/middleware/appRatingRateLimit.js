const { error } = require('../utils/apiResponse');

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 5;
const windows = new Map();
let requestCount = 0;

function appRatingRateLimit(req, res, next) {
  const now = Date.now();
  const userId = String(req.user._id);
  let window = windows.get(userId);

  if (!window || now >= window.resetAt) {
    window = { count: 0, resetAt: now + WINDOW_MS };
    windows.set(userId, window);
  }

  window.count += 1;
  requestCount += 1;
  if (requestCount % 500 === 0) {
    for (const [id, entry] of windows) {
      if (now >= entry.resetAt) windows.delete(id);
    }
  }

  if (window.count > MAX_REQUESTS) {
    res.set('Retry-After', String(Math.ceil((window.resetAt - now) / 1000)));
    return error(res, {
      statusCode: 429,
      message: 'Too many rating submissions. Please try again later.',
    });
  }

  return next();
}

module.exports = appRatingRateLimit;
