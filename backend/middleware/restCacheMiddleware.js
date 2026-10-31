/**
 * restCacheMiddleware.js
 * 
 * Demonstrates:
 * - Express Middleware: Conditional HTTP Request Handling (ETag & If-None-Match)
 * - Bandwidth Optimization: Returning HTTP 304 Not Modified for unchanged resources
 * - Tracking REST API Performance & Cache Hit Metrics
 */

const crypto = require('crypto');

const restCacheMetrics = {
  totalEvaluated: 0,
  cached304Count: 0,
  bytesSaved: 0,
};

function restCacheMiddleware(req, res, next) {
  // Only apply conditional ETag caching to idempotent read requests
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return next();
  }

  const originalJson = res.json;

  res.json = function (body) {
    restCacheMetrics.totalEvaluated++;

    try {
      const jsonString = typeof body === 'string' ? body : JSON.stringify(body);
      const etag = `W/"${crypto.createHash('md5').update(jsonString).digest('hex')}"`;

      res.setHeader('ETag', etag);
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');

      const clientEtag = req.headers['if-none-match'];

      if (clientEtag && clientEtag === etag) {
        restCacheMetrics.cached304Count++;
        const savedBytes = Buffer.byteLength(jsonString, 'utf8');
        restCacheMetrics.bytesSaved += savedBytes;

        res.setHeader('X-Cache-Status', 'HIT-304');
        return res.status(304).end();
      }

      res.setHeader('X-Cache-Status', 'MISS-200');
      return originalJson.call(this, body);
    } catch (err) {
      // In case of serialization error, proceed without caching
      return originalJson.call(this, body);
    }
  };

  next();
}

module.exports = {
  restCacheMiddleware,
  restCacheMetrics,
};
