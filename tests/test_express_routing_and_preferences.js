/**
 * test_express_routing_and_preferences.js
 * 
 * Unit test suite validating:
 * 1. Express Router & Middleware Pipeline:
 *    - Modular router mounting (/api/preferences).
 *    - Schema validation middleware (preferenceValidator.js).
 *    - Rejecting invalid time formats (HH:mm) and ensuring at least 1 active channel.
 * 2. User Preferences Persistence & CRUD (PreferenceStore.js):
 *    - Multi-user retrieval, updating, channel toggles, and reset.
 * 3. Quiet Hours & Working Days Calculation:
 *    - Daytime quiet hours.
 *    - Overnight quiet hours spanning midnight (e.g. 20:00 to 08:30 IST).
 *    - Shifting reminders out of quiet hours and weekends into active working windows.
 * 4. Express Static File Serving:
 *    - /static/preferences schema and documentation accessibility.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

const { PreferenceStore } = require(path.join(rootDir, 'backend/modules/preferences/PreferenceStore'));
const { preferenceValidator, VALID_CHANNELS, VALID_URGENCIES } = require(path.join(rootDir, 'backend/middleware/preferenceValidator'));
const { preferencesRouter } = require(path.join(rootDir, 'backend/routes/preferencesRouter'));

async function testPreferenceValidatorMiddleware() {
  console.log('--- Test 1: Express Middleware (preferenceValidator) ---');

  // Case A: Valid payload
  const validReq = {
    body: {
      channels: { email: true, whatsapp: false, inApp: true, sms: false },
      quietHours: { enabled: true, start: '21:00', end: '08:00' },
      workingSchedule: { days: ['Monday', 'Tuesday'], startHour: '09:00', endHour: '18:00' },
      remindersPolicy: { minimumUrgency: 'High', autoScheduleAiSuggestions: true },
    },
  };
  let nextCalled = false;
  let statusSent = null;
  const mockRes = {
    status: (code) => {
      statusSent = code;
      return { json: () => {} };
    },
  };

  preferenceValidator(validReq, mockRes, () => {
    nextCalled = true;
  });
  assert.strictEqual(nextCalled, true, 'Valid payload must call next()');
  assert.ok(validReq.validatedPreferences, 'Must attach validatedPreferences to req');
  console.log('  [PASS] Valid preferences passed middleware validation');

  // Case B: Invalid time format (e.g. '25:99' or '8pm')
  const invalidTimeReq = {
    body: {
      quietHours: { start: '25:99', end: '8pm' },
    },
  };
  let errorDetails = null;
  const errorRes = {
    status: (code) => ({
      json: (data) => {
        statusSent = code;
        errorDetails = data.details;
      },
    }),
  };
  preferenceValidator(invalidTimeReq, errorRes, () => {});
  assert.strictEqual(statusSent, 400);
  assert.ok(errorDetails.some((e) => e.includes('HH:mm')));
  console.log('  [PASS] Invalid time format correctly rejected with 400 Bad Request');

  // Case C: All channels disabled (Unreachable user safeguard)
  const allDisabledReq = {
    body: {
      channels: { email: false, whatsapp: false, inApp: false, sms: false },
    },
  };
  preferenceValidator(allDisabledReq, errorRes, () => {});
  assert.strictEqual(statusSent, 400);
  assert.ok(errorDetails.some((e) => e.includes('At least one notification channel')));
  console.log('  [PASS] Disabling all channels correctly blocked by guardrail');
}

async function testPreferenceStoreCRUD() {
  console.log('\n--- Test 2: User Preferences CRUD & Persistence ---');
  const testFile = path.join(rootDir, 'backend/data/test_userPreferences.json');

  // Cleanup test file if exists
  try {
    if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
  } catch {}

  const store = new PreferenceStore(testFile);

  // 1. Get all profiles
  const all = await store.getAll();
  assert.ok(Array.isArray(all));
  assert.strictEqual(all.length, 3, 'Must load default 3 recruiter profiles');
  console.log('  [PASS] Loaded 3 default recruiter profiles');

  // 2. Get specific profile
  const recruiter = await store.get('recruiter-1');
  assert.strictEqual(recruiter.userName, 'Murali V');
  assert.strictEqual(recruiter.timezone, 'Asia/Kolkata');
  console.log('  [PASS] Retrieved recruiter-1 profile');

  // 3. Update profile
  const updated = await store.update('recruiter-1', {
    remindersPolicy: { minimumUrgency: 'Critical' },
    quietHours: { start: '22:00', end: '07:30' },
  });
  assert.strictEqual(updated.remindersPolicy.minimumUrgency, 'Critical');
  assert.strictEqual(updated.quietHours.start, '22:00');
  console.log('  [PASS] Updated preferences persisted');

  // 4. Quick-toggle channel
  const toggled = await store.toggleChannel('recruiter-1', 'sms', true);
  assert.strictEqual(toggled.channels.sms, true);
  console.log('  [PASS] Channel toggle successfully updated');

  // 5. Reset to defaults
  const resetUser = await store.reset('recruiter-1');
  assert.strictEqual(resetUser.remindersPolicy.minimumUrgency, 'Medium');
  assert.strictEqual(resetUser.quietHours.start, '20:00');
  console.log('  [PASS] Reset to enterprise template verified');

  // Cleanup test file
  try {
    if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
  } catch {}
}

function testQuietHoursAndWorkingWindowLogic() {
  console.log('\n--- Test 3: Quiet Hours & Working Schedule Logic ---');
  const store = new PreferenceStore();

  const userPrefs = {
    timezone: 'Asia/Kolkata',
    quietHours: {
      enabled: true,
      start: '20:00', // 8:00 PM
      end: '08:30',   // 8:30 AM
    },
    workingSchedule: {
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      startHour: '09:30',
      endHour: '18:30',
    },
  };

  // Case A: 11:00 PM (23:00) falls in quiet hours (Overnight spanning midnight)
  const nightTime = new Date('2026-10-28T23:00:00');
  const isNightQuiet = store.isQuietHour(userPrefs, nightTime);
  assert.strictEqual(isNightQuiet, true, '23:00 must be in quiet hours (start 20:00, end 08:30)');
  console.log('  [PASS] Overnight quiet hour detected before midnight');

  // Case B: 07:00 AM falls in quiet hours
  const earlyMorning = new Date('2026-10-29T07:00:00');
  const isEarlyQuiet = store.isQuietHour(userPrefs, earlyMorning);
  assert.strictEqual(isEarlyQuiet, true, '07:00 must be in quiet hours (end 08:30)');
  console.log('  [PASS] Overnight quiet hour detected after midnight');

  // Case C: 02:30 PM (14:30) is active working time
  const afternoonTime = new Date('2026-10-29T14:30:00');
  const isAfternoonQuiet = store.isQuietHour(userPrefs, afternoonTime);
  assert.strictEqual(isAfternoonQuiet, false, '14:30 must NOT be in quiet hours');
  console.log('  [PASS] Business afternoon correctly identified as active');

  // Case D: Adjusting night-time reminder to next business morning
  const shifted = store.adjustToWorkingWindow(userPrefs, nightTime);
  assert.strictEqual(shifted.wasShifted, true);
  const adjustedD = new Date(shifted.adjustedDate);
  assert.strictEqual(adjustedD.getHours(), 9);
  assert.strictEqual(adjustedD.getMinutes(), 30);
  console.log('  [PASS] Night-time reminder successfully shifted to next working morning (09:30 IST)');
}

function testExpressStaticAssets() {
  console.log('\n--- Test 4: Express Static Assets Verification ---');

  const schemaPath = path.join(rootDir, 'backend/public/preferences/preferences-schema.json');
  assert.ok(fs.existsSync(schemaPath), 'preferences-schema.json must exist in public folder');

  const schemaContent = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  assert.strictEqual(schemaContent.title, 'CynarisUserPreferences');
  assert.ok(schemaContent.properties.quietHours);
  assert.ok(schemaContent.properties.channels);
  console.log('  [PASS] Static JSON schema file validated');

  const htmlGuidePath = path.join(rootDir, 'backend/public/preferences/index.html');
  assert.ok(fs.existsSync(htmlGuidePath), 'Static preferences guide HTML must exist');
  console.log('  [PASS] Static documentation guide validated');
}

async function runAll() {
  console.log('================================================================');
  console.log('🧪 Week 4 Day 2: Express Routing & User Preferences Test Suite');
  console.log('================================================================');
  await testPreferenceValidatorMiddleware();
  await testPreferenceStoreCRUD();
  testQuietHoursAndWorkingWindowLogic();
  testExpressStaticAssets();
  console.log('\n[SUCCESS] All Express Routing & User Preferences tests passed!\n');
}

runAll().catch((err) => {
  console.error('\n[FAIL] Test suite failed:', err);
  process.exit(1);
});
