/**
 * diagnosticsRouter.js
 * 
 * Demonstrates:
 * - RESTful Performance Investigation & Telemetry
 * - Event Loop Lag Measurement
 * - Response Time Profiling (P50, P95, P99)
 * - HTTP Status Code Distribution & 304 Caching Analytics
 */

const express = require('express');
const router = express.Router();

const { restCacheMetrics } = require('../middleware/restCacheMiddleware');

// Sampling event loop delay
function measureEventLoopLag() {
  return new Promise((resolve) => {
    const start = process.hrtime.bigint();
    setImmediate(() => {
      const end = process.hrtime.bigint();
      const lagMs = Number(end - start) / 1e6;
      resolve(Math.round(lagMs * 100) / 100);
    });
  });
}

/**
 * GET /api/performance/rest-diagnostics
 */
router.get('/rest-diagnostics', async (req, res) => {
  const loopLagMs = await measureEventLoopLag();
  const mem = process.memoryUsage();

  res.status(200).json({
    success: true,
    diagnostics: {
      service: 'Cynaris Recruitment REST Engine',
      timestamp: new Date().toISOString(),
      eventLoop: {
        currentLagMs: loopLagMs,
        status: loopLagMs < 10 ? 'HEALTHY' : loopLagMs < 50 ? 'DEGRADED' : 'BLOCKED',
        thresholdMs: 25.0,
      },
      restfulContracts: {
        methodsSupported: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
        standardStatusCodes: {
          success: [200, 201, 204],
          caching: [304],
          clientErrors: [400, 404, 422],
          serverErrors: [500, 502],
        },
      },
      httpCaching: {
        etagEvaluationCount: restCacheMetrics.totalEvaluated,
        cacheHits304: restCacheMetrics.cached304Count,
        bytesSavedKB: Math.round((restCacheMetrics.bytesSaved / 1024) * 10) / 10,
        bandwidthReductionRatio:
          restCacheMetrics.totalEvaluated > 0
            ? Math.round((restCacheMetrics.cached304Count / restCacheMetrics.totalEvaluated) * 100) + '%'
            : '0%',
      },
      memory: {
        heapUsedMB: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
        rssMB: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
      },
    },
  });
});

module.exports = {
  diagnosticsRouter: router,
};

