/**
 * preferenceValidator.js
 * 
 * Demonstrates:
 * - Express Middleware: Request inspection, validation, and sanitization
 * - Strict schema guardrails for user preference updates
 * - Custom error generation before passing to route handlers
 */

const VALID_CHANNELS = ['email', 'whatsapp', 'inApp', 'sms'];
const VALID_URGENCIES = ['All', 'Medium', 'High', 'Critical'];
const VALID_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

function validateTime(timeStr, fieldName) {
  if (typeof timeStr !== 'string' || !TIME_REGEX.test(timeStr)) {
    return `${fieldName} must follow 24-hour HH:mm format (e.g., '09:30', '20:00')`;
  }
  return null;
}

function preferenceValidator(req, res, next) {
  const body = req.body;
  if (!body || typeof body !== 'object') {
    return res.status(400).json({
      success: false,
      error: 'Invalid payload: Request body must be a JSON object',
    });
  }

  const errors = [];

  // 1. Validate Channels
  if (body.channels) {
    if (typeof body.channels !== 'object' || Array.isArray(body.channels)) {
      errors.push('channels must be an object of boolean flags');
    } else {
      const keys = Object.keys(body.channels);
      for (const k of keys) {
        if (!VALID_CHANNELS.includes(k)) {
          errors.push(`Unknown notification channel '${k}'. Allowed: ${VALID_CHANNELS.join(', ')}`);
        } else if (typeof body.channels[k] !== 'boolean') {
          errors.push(`Channel '${k}' must be a boolean`);
        }
      }

      // Safeguard: Ensure user doesn't disable ALL channels
      const allDisabled = keys.length === VALID_CHANNELS.length && keys.every((k) => body.channels[k] === false);
      if (allDisabled) {
        errors.push('At least one notification channel must remain active');
      }
    }
  }

  // 2. Validate Quiet Hours
  if (body.quietHours) {
    if (body.quietHours.enabled !== undefined && typeof body.quietHours.enabled !== 'boolean') {
      errors.push('quietHours.enabled must be a boolean');
    }
    if (body.quietHours.start) {
      const err = validateTime(body.quietHours.start, 'quietHours.start');
      if (err) errors.push(err);
    }
    if (body.quietHours.end) {
      const err = validateTime(body.quietHours.end, 'quietHours.end');
      if (err) errors.push(err);
    }
  }

  // 3. Validate Working Schedule
  if (body.workingSchedule) {
    if (body.workingSchedule.days) {
      if (!Array.isArray(body.workingSchedule.days) || body.workingSchedule.days.length === 0) {
        errors.push('workingSchedule.days must be a non-empty array of day names');
      } else {
        for (const day of body.workingSchedule.days) {
          if (!VALID_DAYS.includes(day)) {
            errors.push(`Invalid working day '${day}'. Allowed: ${VALID_DAYS.join(', ')}`);
          }
        }
      }
    }
    if (body.workingSchedule.startHour) {
      const err = validateTime(body.workingSchedule.startHour, 'workingSchedule.startHour');
      if (err) errors.push(err);
    }
    if (body.workingSchedule.endHour) {
      const err = validateTime(body.workingSchedule.endHour, 'workingSchedule.endHour');
      if (err) errors.push(err);
    }
  }

  // 4. Validate Reminders Policy
  if (body.remindersPolicy) {
    if (body.remindersPolicy.minimumUrgency) {
      if (!VALID_URGENCIES.includes(body.remindersPolicy.minimumUrgency)) {
        errors.push(
          `Invalid minimumUrgency '${body.remindersPolicy.minimumUrgency}'. Allowed: ${VALID_URGENCIES.join(', ')}`
        );
      }
    }
    if (body.remindersPolicy.autoScheduleAiSuggestions !== undefined) {
      if (typeof body.remindersPolicy.autoScheduleAiSuggestions !== 'boolean') {
        errors.push('remindersPolicy.autoScheduleAiSuggestions must be a boolean');
      }
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Preference validation failed',
      details: errors,
    });
  }

  req.validatedPreferences = body;
  next();
}

module.exports = {
  preferenceValidator,
  VALID_CHANNELS,
  VALID_URGENCIES,
  VALID_DAYS,
};
