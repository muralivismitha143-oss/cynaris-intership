/**
 * authMiddleware.js
 * 
 * Week 4 Day 5: Stateless JWT Authentication & Role-Based Authorization
 * 
 * Implements:
 * 1. Token Generation: Signs payload with HMAC SHA256 and configurable expiration.
 * 2. Token Authentication: Validates `Authorization: Bearer <token>` header.
 *    - Emits 401 Unauthorized for missing or malformed headers.
 *    - Emits 403 Forbidden for invalid, tampered, or expired tokens.
 * 3. Role-Based Access Control (RBAC): Guards administrative endpoints based on user roles.
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'cynaris_jwt_production_secret_key_2026';
const DEFAULT_EXPIRATION = process.env.JWT_EXPIRATION || '2h';

/**
 * Generate a signed JSON Web Token (JWT).
 */
function generateToken(user, expiresIn = DEFAULT_EXPIRATION) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn,
    issuer: 'cynaris-recruitment-platform',
    audience: 'cynaris-api-consumers',
  });
}

/**
 * Authentication Middleware: Validates Bearer token in Authorization header.
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: 'Access denied. No authorization header provided.',
      statusCode: 401,
    });
  }

  const parts = authHeader.trim().split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return res.status(401).json({
      success: false,
      error: 'Malformed authorization header. Format must be: Bearer <token>',
      statusCode: 401,
    });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'cynaris-recruitment-platform',
      audience: 'cynaris-api-consumers',
    });
    req.user = decoded;
    next();
  } catch (err) {
    const isExpired = err.name === 'TokenExpiredError';
    return res.status(403).json({
      success: false,
      error: isExpired ? 'Authentication token has expired.' : 'Invalid authentication token.',
      tokenError: err.name,
      statusCode: 403,
    });
  }
}

/**
 * Authorization Middleware: Checks if authenticated user possesses one of the required roles.
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required before role verification.',
        statusCode: 401,
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access forbidden. Required role(s): [${allowedRoles.join(', ')}]. Current role: '${req.user.role}'`,
        statusCode: 403,
      });
    }

    next();
  };
}

module.exports = {
  JWT_SECRET,
  generateToken,
  authenticateToken,
  requireRole,
};
