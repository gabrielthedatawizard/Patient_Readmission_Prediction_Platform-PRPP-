const { validationResult } = require('express-validator');

function validateRequest(req, res, next) {
  const result = validationResult(req);

  if (result.isEmpty()) {
    return next();
  }

  const details = result.array().map((entry) => ({
    field: entry.path,
    message: entry.msg,
    location: entry.location
  }));

  return res.status(400).json({
    error: 'ValidationError',
    message: details[0]?.message || 'Request validation failed.',
    details
  });
}

module.exports = {
  validateRequest
};
