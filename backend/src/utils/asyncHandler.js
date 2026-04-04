function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      console.error('AsyncHandler Error:', err);
      next(err);
    });
  };
}

module.exports = {
  asyncHandler
};
