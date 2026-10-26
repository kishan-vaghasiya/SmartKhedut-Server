const express = require('express');
const { submitAppRating, adminListAppRatings } = require('../controllers/appRatingController');
const { protectUser, protectAdmin } = require('../middleware/auth');
const appRatingRateLimit = require('../middleware/appRatingRateLimit');
const { error } = require('../utils/apiResponse');

const router = express.Router();

router.post('/app-ratings', protectUser, appRatingRateLimit, submitAppRating);
router.get('/admin/app-ratings', protectAdmin, adminListAppRatings);

router.use(['/app-ratings', '/admin/app-ratings'], (err, _req, res, _next) => {
  console.error('[app-ratings] Request failed', {
    name: err.name || 'Error',
    code: err.code || 'UNKNOWN',
  });
  return error(res, {
    statusCode: 500,
    message: 'Unable to process app rating request',
  });
});

module.exports = router;
