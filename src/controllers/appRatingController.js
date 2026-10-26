const AppRating = require('../models/AppRating');
const asyncHandler = require('../middleware/asyncHandler');
const { success, error } = require('../utils/apiResponse');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');

const languages = ['en', 'gu', 'hi', 'pa', 'mr'];
const platforms = ['android', 'ios'];

function validateRatingBody(body = {}) {
  const errors = [];
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return ['request body must be a JSON object'];
  }

  if (body.rating === undefined) {
    errors.push('rating is required');
  } else if (!Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5) {
    errors.push('rating must be an integer between 1 and 5');
  }

  if (body.review !== undefined) {
    if (typeof body.review !== 'string') errors.push('review must be a string');
    else if (body.review.length > 2000) errors.push('review must not exceed 2000 characters');
  }

  if (body.language !== undefined && !languages.includes(body.language)) {
    errors.push('language must be one of en, gu, hi, pa, mr');
  }

  if (body.platform !== undefined && !platforms.includes(body.platform)) {
    errors.push('platform must be android or ios');
  }

  if (body.appVersion !== undefined && typeof body.appVersion !== 'string') {
    errors.push('appVersion must be a string');
  }

  return errors;
}

const submitAppRating = asyncHandler(async (req, res) => {
  const validationErrors = validateRatingBody(req.body);
  if (validationErrors.length) {
    return error(res, {
      statusCode: 400,
      message: 'Validation failed',
      errors: validationErrors,
    });
  }

  const { rating, review, appVersion } = req.body;
  const filter = { user: req.user._id };
  const fieldsToSet = {
    rating,
    review: review === undefined ? '' : review,
    appVersion: appVersion === undefined ? '' : appVersion,
  };
  const fieldsToUnset = {};
  if (req.body.language !== undefined) fieldsToSet.language = req.body.language;
  else fieldsToUnset.language = 1;
  if (req.body.platform !== undefined) fieldsToSet.platform = req.body.platform;
  else fieldsToUnset.platform = 1;
  const update = {
    $set: fieldsToSet,
    ...(Object.keys(fieldsToUnset).length ? { $unset: fieldsToUnset } : {}),
    $setOnInsert: { user: req.user._id },
  };
  const options = { new: true, upsert: true, runValidators: true };

  let savedRating;
  try {
    savedRating = await AppRating.findOneAndUpdate(filter, update, options);
  } catch (err) {
    if (err.code !== 11000) throw err;
    savedRating = await AppRating.findOneAndUpdate(filter, update, {
      ...options,
      upsert: false,
    });
    if (!savedRating) throw err;
  }

  return success(res, {
    statusCode: 200,
    message: 'App rating saved',
    data: {
      id: savedRating._id,
      rating: savedRating.rating,
      createdAt: savedRating.createdAt,
    },
  });
});

const adminListAppRatings = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.query.rating !== undefined) {
    const rating = Number(req.query.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return error(res, {
        statusCode: 400,
        message: 'rating filter must be an integer between 1 and 5',
        errors: ['rating must be an integer between 1 and 5'],
      });
    }
    filter.rating = rating;
  }

  if (req.query.language !== undefined) {
    if (!languages.includes(req.query.language)) {
      return error(res, {
        statusCode: 400,
        message: 'Invalid language filter',
        errors: ['language must be one of en, gu, hi, pa, mr'],
      });
    }
    filter.language = req.query.language;
  }

  if (req.query.platform !== undefined) {
    if (!platforms.includes(req.query.platform)) {
      return error(res, {
        statusCode: 400,
        message: 'Invalid platform filter',
        errors: ['platform must be android or ios'],
      });
    }
    filter.platform = req.query.platform;
  }

  const { page, limit, skip } = getPagination(req.query);
  const [ratings, total] = await Promise.all([
    AppRating.find(filter)
      .select('rating review language platform appVersion createdAt')
      .populate('user', 'username mobile location verified')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    AppRating.countDocuments(filter),
  ]);

  return success(res, {
    message: 'App ratings retrieved',
    data: ratings,
    pagination: buildPaginationMeta({ page, limit, total }),
  });
});

module.exports = { submitAppRating, adminListAppRatings };
