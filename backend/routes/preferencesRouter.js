/**
 * preferencesRouter.js
 * 
 * Demonstrates:
 * - Express Routing: Modular express.Router() architecture
 * - Middleware Integration: Route-level validator, logger, and param parsers
 * - Request / Response Objects: req.params, req.query, req.body, res.status(), res.json()
 * - RESTful API contracts for User Notification & AI Preferences
 */

const express = require('express');
const router = express.Router();

const { PreferenceStore } = require('../modules/preferences/PreferenceStore');
const { preferenceValidator } = require('../middleware/preferenceValidator');

const store = new PreferenceStore();

// Router-level Logging Middleware
router.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  res.setHeader('X-Preference-Engine', 'Cynaris-Express-Router-v1');
  next();
});

/**
 * GET /api/preferences
 * List all registered user preference profiles
 */
router.get('/', async (req, res, next) => {
  try {
    const list = await store.getAll();
    res.json({
      success: true,
      count: list.length,
      preferences: list,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/preferences/:userId
 * Retrieve preferences for a specific recruiter or hiring manager
 */
router.get('/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const userPrefs = await store.get(userId);

    if (!userPrefs) {
      return res.status(404).json({
        success: false,
        error: `User preference profile '${userId}' not found`,
      });
    }

    const isCurrentlyQuiet = store.isQuietHour(userPrefs, new Date());

    res.json({
      success: true,
      preferences: userPrefs,
      computed: {
        isCurrentlyQuiet,
        activeChannelCount: Object.values(userPrefs.channels).filter(Boolean).length,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/preferences/:userId
 * Update preferences for a user (validated by preferenceValidator)
 */
router.put('/:userId', preferenceValidator, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const updates = req.validatedPreferences;

    const updated = await store.update(userId, updates);

    res.json({
      success: true,
      message: 'User preferences updated successfully',
      preferences: updated,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/preferences/:userId/channels/:channel
 * Fast toggle for specific communication channel
 */
router.patch('/:userId/channels/:channel', async (req, res, next) => {
  try {
    const { userId, channel } = req.params;
    const { enabled } = req.body || {};

    const updated = await store.toggleChannel(userId, channel.toLowerCase(), enabled);
    if (!updated) {
      return res.status(404).json({
        success: false,
        error: `User profile '${userId}' not found`,
      });
    }

    res.json({
      success: true,
      message: `Channel '${channel}' updated for user '${userId}'`,
      preferences: updated,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/preferences/:userId/reset
 * Reset user preferences back to default enterprise template
 */
router.post('/:userId/reset', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const resetUser = await store.reset(userId);

    if (!resetUser) {
      return res.status(404).json({
        success: false,
        error: `Default template not found for '${userId}'`,
      });
    }

    res.json({
      success: true,
      message: `Preferences for '${userId}' reset to enterprise defaults`,
      preferences: resetUser,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/preferences/:userId/quiet-hours/check
 * Verifies if a given timestamp falls in quiet hours and auto-shifts it to working window
 */
router.get('/:userId/quiet-hours/check', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const targetDateStr = req.query.timestamp || new Date().toISOString();

    const userPrefs = await store.get(userId);
    if (!userPrefs) {
      return res.status(404).json({ success: false, error: 'User profile not found' });
    }

    const targetDate = new Date(targetDateStr);
    const isQuiet = store.isQuietHour(userPrefs, targetDate);
    const workingWindow = store.adjustToWorkingWindow(userPrefs, targetDate);

    res.json({
      success: true,
      userId,
      requestedTimestamp: targetDateStr,
      isQuietHours: isQuiet,
      workingWindow,
    });
  } catch (err) {
    next(err);
  }
});

// Router-Level Error Handling Middleware
router.use((err, req, res, next) => {
  console.error(`[PreferencesRouter Error] ${err.message}`);
  res.status(500).json({
    success: false,
    error: 'Internal Preferences Router Error',
    message: err.message,
  });
});

module.exports = {
  preferencesRouter: router,
  preferenceStore: store,
};
