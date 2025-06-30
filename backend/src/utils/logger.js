/**
 * Logger Utility
 * 
 * Centralized logging configuration
 */

/**
 * Formats timestamp for logging
 * @returns {string} - ISO timestamp
 */
function getTimestamp() {
  return new Date().toISOString();
}

/**
 * Log info level message
 * @param {string} message - Log message
 * @param {Object} metadata - Additional metadata
 */
function info(message, metadata = {}) {
  console.log(`[${getTimestamp()}] INFO: ${message}`, 
    Object.keys(metadata).length > 0 ? metadata : ''
  );
}

/**
 * Log warning level message
 * @param {string} message - Log message
 * @param {Object} metadata - Additional metadata
 */
function warn(message, metadata = {}) {
  console.warn(`[${getTimestamp()}] WARN: ${message}`, 
    Object.keys(metadata).length > 0 ? metadata : ''
  );
}

/**
 * Log error level message
 * @param {string} message - Log message
 * @param {Object} metadata - Additional metadata
 */
function error(message, metadata = {}) {
  console.error(`[${getTimestamp()}] ERROR: ${message}`, 
    Object.keys(metadata).length > 0 ? metadata : ''
  );
}

/**
 * Log debug level message
 * @param {string} message - Log message
 * @param {Object} metadata - Additional metadata
 */
function debug(message, metadata = {}) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${getTimestamp()}] DEBUG: ${message}`, 
      Object.keys(metadata).length > 0 ? metadata : ''
    );
  }
}

/**
 * Log HTTP request
 * @param {Object} req - Express request object
 */
function logRequest(req) {
  const user = req.user ? req.user.email || req.user.id : "anonymous";
  info(`${req.method} ${req.path} by ${user}`, {
    method: req.method,
    path: req.path,
    user: user,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
}

const logger = {
  info,
  warn,
  error,
  debug,
  logRequest
};

module.exports = { logger }; 