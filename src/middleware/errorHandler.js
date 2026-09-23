const { error } = require('../utils/apiResponse');

// Catches errors thrown inside multer (file too big, too many files, bad
// type) as well as anything passed to next(err) from controllers.
function errorHandler(err, _req, res, _next) {
  console.error(err);

  if (err.name === 'MulterError') {
    let message = err.message;
    if (err.code === 'LIMIT_FILE_SIZE') message = 'Each photo must be smaller than 5MB';
    if (err.code === 'LIMIT_UNEXPECTED_FILE') message = 'Too many photos uploaded';
    return error(res, { statusCode: 400, message });
  }

  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => e.message);
    return error(res, { statusCode: 400, message: 'Validation failed', errors });
  }

  if (err.code === 11000) {
    const rawField = Object.keys(err.keyValue || {})[0] || 'field';
    const field = rawField === 'phone' ? 'mobile' : rawField;
    return error(res, { statusCode: 409, message: `This ${field} is already in use` });
  }

  if (err.name === 'CastError') {
    return error(res, { statusCode: 400, message: `Invalid id: ${err.value}` });
  }

  return error(res, {
    statusCode: err.statusCode || 500,
    message: err.message || 'Internal server error',
  });
}

function notFound(req, res) {
  return error(res, { statusCode: 404, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

module.exports = { errorHandler, notFound };
