function success(res, { statusCode = 200, message = 'Success', data = null, pagination = null }) {
  const body = { success: true, message, data };
  if (pagination) body.pagination = pagination;
  return res.status(statusCode).json(body);
}

function error(res, { statusCode = 500, message = 'Something went wrong', errors = null }) {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
}

module.exports = { success, error };
