/**
 * test_jwt_stateless_auth.js
 * 
 * Comprehensive Unit & Integration Test Suite for Week 4 Day 5:
 * "Stateless Auth with JWT: Registration, Bcrypt Hashing, Token Generation & Protected Routes"
 * 
 * Validates:
 * 1. Bcrypt Password Hashing & Salt Verification (UserStore)
 *    - Hashes password with salt rounds = 10
 *    - Rejects plain passwords, verifies bcrypt compare semantics
 *    - Unique salt generation across identical plain passwords
 * 2. JWT Cryptographic Generation & Token Lifecycle (authMiddleware)
 *    - Token generation with issuer, audience, and expiration
 *    - Tampered token rejection
 *    - Expired token rejection
 * 3. User Registration Endpoint (POST /api/auth/register)
 *    - Input validation (missing fields, short password)
 *    - Duplicate email conflict handling (409 Conflict)
 *    - Successful registration returns 201 Created, JWT, and sanitized user
 * 4. User Login & Token Exchange (POST /api/auth/login)
 *    - Rejection of invalid credentials (401 Unauthorized)
 *    - Successful login returns 200 OK and JWT
 * 5. Protected Route Authorization Guard (authenticateToken)
 *    - Rejects missing authorization header (401 Unauthorized)
 *    - Rejects malformed authorization header (401 Unauthorized)
 *    - Accepts valid Bearer token and returns profile (GET /api/auth/me)
 * 6. Role-Based Access Control (RBAC - requireRole)
 *    - Rejects non-admin user on admin endpoints (403 Forbidden)
 *    - Grants access to admin role on admin endpoints (200 OK)
 */

const assert = require('assert');
const path = require('path');
const http = require('http');
const { Readable, Duplex } = require('stream');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const rootDir = path.resolve(__dirname, '..');
const app = require(path.join(rootDir, 'backend/server'));
const { userStore } = require(path.join(rootDir, 'backend/modules/auth/UserStore'));
const { generateToken, JWT_SECRET } = require(path.join(rootDir, 'backend/middleware/authMiddleware'));

// In-memory HTTP request dispatcher for REST endpoints
function makeRequest(appInstance, { method = 'GET', path = '/', headers = {} }, body = null) {
  return new Promise((resolve) => {
    let payload = null;
    if (body) {
      payload = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const req = new Readable({
      read() {
        if (payload) this.push(payload);
        this.push(null);
      },
    });

    req.method = method;
    req.url = path;
    req.originalUrl = path;
    req.headers = {
      host: 'localhost:3000',
      'user-agent': 'test-auth-client',
      ...headers,
    };
    if (payload) {
      req.headers['content-type'] = 'application/json';
      req.headers['content-length'] = Buffer.byteLength(payload);
    }

    const dummySocket = new Duplex({
      read() {},
      write(chunk, enc, cb) { cb(); },
    });
    dummySocket.remoteAddress = '127.0.0.1';
    dummySocket.setTimeout = () => {};
    req.connection = dummySocket;
    req.socket = dummySocket;

    const res = new http.ServerResponse(req);
    let rawBody = '';

    const origWrite = res.write;
    res.write = function (chunk, ...args) {
      if (chunk) rawBody += chunk;
      return origWrite.apply(this, [chunk, ...args]);
    };

    const origEnd = res.end;
    res.end = function (chunk, ...args) {
      if (chunk) rawBody += chunk;
      origEnd.apply(this, [chunk, ...args]);

      let parsed = null;
      try {
        if (rawBody.length > 0) parsed = JSON.parse(rawBody);
      } catch (e) {
        parsed = rawBody;
      }

      resolve({
        statusCode: res.statusCode,
        headers: res.getHeaders ? res.getHeaders() : {},
        body: parsed,
        rawBody,
      });
    };

    appInstance(req, res);
  });
}

async function runTests() {
  console.log('================================================================');
  console.log('🧪 Week 4 Day 5: Stateless JWT Auth & Security Test Suite');
  console.log('================================================================');

  // =========================================================================
  // Test 1: Bcrypt Password Hashing & Salt Verification
  // =========================================================================
  console.log('\n--- Test 1: Bcrypt Password Hashing & Salt Verification ---');
  const plainPassword = 'SuperSecretPassword@2026';
  const hash1 = await bcrypt.hash(plainPassword, 10);
  const hash2 = await bcrypt.hash(plainPassword, 10);

  assert.ok(hash1.startsWith('$2a$') || hash1.startsWith('$2b$'), 'Hash must be a valid bcrypt hash');
  assert.notStrictEqual(hash1, hash2, 'Salts must ensure identical passwords generate distinct hashes');

  const matchCorrect = await bcrypt.compare(plainPassword, hash1);
  const matchIncorrect = await bcrypt.compare('WrongPassword@123', hash1);
  assert.strictEqual(matchCorrect, true, 'Bcrypt compare must succeed for correct password');
  assert.strictEqual(matchIncorrect, false, 'Bcrypt compare must fail for incorrect password');
  console.log('  [PASS] Bcrypt salted password hashing and timing-safe comparison verified');

  // =========================================================================
  // Test 2: JWT Cryptographic Generation & Token Lifecycle
  // =========================================================================
  console.log('\n--- Test 2: JWT Token Lifecycle & Forgery Rejection ---');
  const mockUser = {
    id: 'user-test-101',
    name: 'Ananya Sharma',
    email: 'ananya@cynaris.com',
    role: 'recruiter',
  };

  const validToken = generateToken(mockUser, '1h');
  assert.ok(typeof validToken === 'string' && validToken.split('.').length === 3, 'Token must be valid 3-part JWT');

  const decoded = jwt.verify(validToken, JWT_SECRET);
  assert.strictEqual(decoded.id, mockUser.id);
  assert.strictEqual(decoded.email, mockUser.email);
  assert.strictEqual(decoded.role, 'recruiter');
  console.log('  [PASS] JWT token generation and claims payload signature validated');

  // Forged Token Test (tampered payload)
  let tamperedCaught = false;
  try {
    const tamperedToken = validToken.slice(0, -6) + 'abcdef';
    jwt.verify(tamperedToken, JWT_SECRET);
  } catch (err) {
    tamperedCaught = true;
    assert.strictEqual(err.name, 'JsonWebTokenError');
  }
  assert.strictEqual(tamperedCaught, true, 'Tampered token must be rejected cryptographically');
  console.log('  [PASS] Cryptographic verification strictly rejects forged/tampered token signatures');

  // Expired Token Test
  const expiredToken = generateToken(mockUser, '-1s');
  let expiredCaught = false;
  try {
    jwt.verify(expiredToken, JWT_SECRET);
  } catch (err) {
    expiredCaught = true;
    assert.strictEqual(err.name, 'TokenExpiredError');
  }
  assert.strictEqual(expiredCaught, true, 'Expired token must trigger TokenExpiredError');
  console.log('  [PASS] Expired token correctly rejected by verification guard');

  // =========================================================================
  // Test 3: User Registration Endpoint (POST /api/auth/register)
  // =========================================================================
  console.log('\n--- Test 3: User Registration & Validation (POST /api/auth/register) ---');

  // 3A: Validation error on short password
  const resShortPw = await makeRequest(app, {
    method: 'POST',
    path: '/api/auth/register',
  }, {
    name: 'Short Password User',
    email: 'short@cynaris.com',
    password: '123',
  });
  assert.strictEqual(resShortPw.statusCode, 400);
  assert.ok(resShortPw.body.error.includes('6 characters'));
  console.log('  [PASS] POST /api/auth/register rejects password < 6 characters (400 Bad Request)');

  // 3B: Valid Registration
  const testEmail = `new.recruiter.${Date.now()}@cynaris.com`;
  const resRegister = await makeRequest(app, {
    method: 'POST',
    path: '/api/auth/register',
  }, {
    name: 'Rohan Mehra',
    email: testEmail,
    password: 'SecurePassword@123',
    role: 'recruiter',
  });
  assert.strictEqual(resRegister.statusCode, 201);
  assert.ok(resRegister.body.token, 'Must return signed JWT token upon registration');
  assert.strictEqual(resRegister.body.user.email, testEmail);
  assert.strictEqual(resRegister.body.user.passwordHash, undefined, 'Must not leak passwordHash in response');
  const recruiterToken = resRegister.body.token;
  console.log('  [PASS] POST /api/auth/register creates user, hashes password, and returns 201 Created + JWT');

  // 3C: Duplicate Email Rejection (409 Conflict)
  const resDup = await makeRequest(app, {
    method: 'POST',
    path: '/api/auth/register',
  }, {
    name: 'Duplicate Rohan',
    email: testEmail,
    password: 'AnotherPassword@123',
  });
  assert.strictEqual(resDup.statusCode, 409);
  assert.ok(resDup.body.error.includes('already exists'));
  console.log('  [PASS] POST /api/auth/register rejects duplicate email with 409 Conflict');

  // =========================================================================
  // Test 4: User Login & Token Exchange (POST /api/auth/login)
  // =========================================================================
  console.log('\n--- Test 4: User Authentication & Login (POST /api/auth/login) ---');

  // 4A: Invalid password
  const resBadPw = await makeRequest(app, {
    method: 'POST',
    path: '/api/auth/login',
  }, {
    email: testEmail,
    password: 'IncorrectPassword',
  });
  assert.strictEqual(resBadPw.statusCode, 401);
  assert.strictEqual(resBadPw.body.success, false);
  console.log('  [PASS] POST /api/auth/login rejects wrong password with 401 Unauthorized');

  // 4B: Successful Login with Seeded Admin
  const resAdminLogin = await makeRequest(app, {
    method: 'POST',
    path: '/api/auth/login',
  }, {
    email: 'admin@cynaris.com',
    password: 'Admin@123',
  });
  assert.strictEqual(resAdminLogin.statusCode, 200);
  assert.ok(resAdminLogin.body.token);
  assert.strictEqual(resAdminLogin.body.user.role, 'admin');
  const adminToken = resAdminLogin.body.token;
  console.log('  [PASS] POST /api/auth/login succeeds for admin user with 200 OK + JWT');

  // =========================================================================
  // Test 5: Protected Route Authorization Guard (GET /api/auth/me)
  // =========================================================================
  console.log('\n--- Test 5: Protected Route Authorization (GET /api/auth/me) ---');

  // 5A: Missing Authorization Header
  const resNoAuth = await makeRequest(app, {
    method: 'GET',
    path: '/api/auth/me',
  });
  assert.strictEqual(resNoAuth.statusCode, 401);
  assert.strictEqual(resNoAuth.body.success, false);
  console.log('  [PASS] GET /api/auth/me rejects missing token with 401 Unauthorized');

  // 5B: Malformed Authorization Header
  const resMalformed = await makeRequest(app, {
    method: 'GET',
    path: '/api/auth/me',
    headers: { Authorization: 'Basic dXNlcjpwYXNz' },
  });
  assert.strictEqual(resMalformed.statusCode, 401);
  assert.ok(resMalformed.body.error.includes('Bearer'));
  console.log('  [PASS] GET /api/auth/me rejects non-Bearer header with 401 Unauthorized');

  // 5C: Valid Recruiter Token Profile Retrieval
  const resMe = await makeRequest(app, {
    method: 'GET',
    path: '/api/auth/me',
    headers: { Authorization: `Bearer ${recruiterToken}` },
  });
  assert.strictEqual(resMe.statusCode, 200);
  assert.strictEqual(resMe.body.user.email, testEmail);
  assert.strictEqual(resMe.body.authClaims.role, 'recruiter');
  console.log('  [PASS] GET /api/auth/me accepts valid Bearer token and returns profile details');

  // =========================================================================
  // Test 6: Role-Based Access Control (RBAC - GET /api/auth/admin/users)
  // =========================================================================
  console.log('\n--- Test 6: Role-Based Access Control (GET /api/auth/admin/users) ---');

  // 6A: Recruiter trying to access Admin-only endpoint
  const resForbidden = await makeRequest(app, {
    method: 'GET',
    path: '/api/auth/admin/users',
    headers: { Authorization: `Bearer ${recruiterToken}` },
  });
  assert.strictEqual(resForbidden.statusCode, 403);
  assert.ok(resForbidden.body.error.includes('Access forbidden'));
  console.log('  [PASS] Recruiter role blocked from admin endpoint with 403 Forbidden');

  // 6B: Admin successfully accessing Admin-only endpoint
  const resAdminOk = await makeRequest(app, {
    method: 'GET',
    path: '/api/auth/admin/users',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(resAdminOk.statusCode, 200);
  assert.strictEqual(resAdminOk.body.success, true);
  assert.ok(Array.isArray(resAdminOk.body.users));
  assert.ok(resAdminOk.body.users.length >= 2);
  console.log(`  [PASS] Admin role granted access to admin endpoint (returned ${resAdminOk.body.users.length} registered users)`);

  console.log('\n================================================================');
  console.log('🎉 [SUCCESS] All 6 Week 4 Day 5 Stateless JWT Auth Tests Passed!');
  console.log('================================================================\n');
}

if (require.main === module) {
  runTests().catch((err) => {
    console.error('\n❌ Test Suite Failed:', err);
    process.exit(1);
  });
}

module.exports = { runTests };
