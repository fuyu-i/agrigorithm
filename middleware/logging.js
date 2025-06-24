// This middleware logs the request method and URL to the console

const loggingMiddleware = (req, res, next) => {
  console.log(`[${new Date().toISOString()}] - ${req.method} ${req.url}`);
  next();
};

module.exports = {
  loggingMiddleware
};