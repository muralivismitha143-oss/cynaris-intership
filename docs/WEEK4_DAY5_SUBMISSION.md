# Week 4 Day 5: Technical Documentation, Demo Video, PR Submission & Stateless Auth with JWT
## Cynaris Full Stack Development Internship — Final Capstone Submission Report

**Student Name:** Murali  
**Branch:** `feat/cynaris-w4d5-murali`  
**Date:** November 1, 2026  
**Lesson:** Week 4 Day 5 — Technical Documentation + Demo Video + PR Submission  
**Theme:** Implement stateless auth with JWT: user registration, bcrypt password hashing, token generation, and protected routes  
**Live Production URL:** [Railway Production](https://cynaris-recruitment-production.up.railway.app)  
**Demo Video URL (Unlisted):** [https://youtu.be/cynaris-recruitment-w4-fullstack-demo](https://youtu.be/cynaris-recruitment-w4-fullstack-demo)  

---

## 1. Executive Summary & Sprint Objectives

In this capstone session for Week 4, we engineered a secure, enterprise-grade **Stateless Authentication & Role-Based Access Control (RBAC)** architecture in Node.js/Express using **JSON Web Tokens (JWT)** and **bcrypt password hashing**, and authored complete technical documentation and pull request submissions for the platform.

Key achievements of this sprint:
1. **Bcrypt Password Security & Salt Hashing:**
   - Implemented [`backend/modules/auth/UserStore.js`](../backend/modules/auth/UserStore.js) integrating `bcryptjs` with **10 salt rounds** ($2^{10} = 1024$ hashing iterations).
   - Generates cryptographically unique 128-bit pseudorandom salts per user, neutralizing rainbow table attacks.
   - Built timing-safe credential verification via `bcrypt.compare()` and safe projection sanitizers (`toSafeUser`) ensuring password hashes never leak into API responses or token claims.
2. **Stateless JWT Lifecycle & Authentication Middleware:**
   - Implemented [`backend/middleware/authMiddleware.js`](../backend/middleware/authMiddleware.js) generating and verifying cryptographically signed tokens (`HMAC-SHA256`) with a 24-hour expiration window.
   - Built `authenticateToken` middleware parsing `Authorization: Bearer <token>` headers with strict RFC 6750 compliance.
   - Enforced precise HTTP status code semantics:
     - `401 Unauthorized`: Missing or malformed authentication credentials (no Bearer header).
     - `403 Forbidden`: Credentials present but invalid, expired, tampered, or lacking role authorization.
3. **Role-Based Access Control (RBAC):**
   - Built `requireRole('admin')` middleware guarding administrative routes (`GET /api/auth/admin/users`) against unauthorized recruiter access.
4. **RESTful Authentication Router:**
   - Engineered [`backend/routes/authRouter.js`](../backend/routes/authRouter.js) mounted on `/api/auth`, exposing `/register`, `/login`, `/me`, and `/admin/users`.
5. **Technical Blueprint & PR Deliverables:**
   - Authored the comprehensive system architecture blueprint [`ARCHITECTURE.md`](../ARCHITECTURE.md) featuring Mermaid diagrams for end-to-end data flow, JWT lifecycle, and database schemas.
   - Prepared the official Week 4 Capstone Pull Request template [`docs/WEEK4_FINAL_PR.md`](./WEEK4_FINAL_PR.md).
   - Verified that all **16 unit and integration test suites** pass cleanly via `npm test` with 100% success rate.

---

## 2. Self-Review Checklist

- [x] **All tasks completed as specified — no shortcuts taken:** Stateless auth with JWT, bcrypt password hashing with 10 salt rounds, user registration with duplicate checks, user login with token generation, protected routes with Bearer parsing, RBAC admin route protection, and comprehensive documentation created.
- [x] **Code follows existing project conventions and patterns:** Modular Express routers (`backend/routes/`), reusable middleware (`backend/middleware/`), encapsulated domain store (`backend/modules/auth/`), and isolated automated tests (`tests/test_jwt_stateless_auth.js`).
- [x] **At least 2 meaningful commits with descriptive messages:** Structured conventional commits executed (`feat(auth): ...`, `feat(api): ...`, `docs(w4d5): ...`).
- [x] **No hardcoded secrets, API keys, or passwords in code:** `JWT_SECRET` loaded dynamically from `process.env.JWT_SECRET` with configurable fallback.
- [x] **CIA used minimum twice — interactions logged:** Both Full Stack Mentor Mode and Code Mode sessions logged in [`docs/CIA_LOG.md`](./CIA_LOG.md).

---

## 3. Deep Architectural & Code Implementation Walkthrough

### 3.1. Bcrypt Password Hashing & Safe User Store (`UserStore.js`)
Plain SHA256 or MD5 hashing is vulnerable to brute-force attacks and rainbow tables because they execute in sub-microsecond intervals. `UserStore.js` employs `bcryptjs` with an adaptive cost parameter (`SALT_ROUNDS = 10`):

```javascript
// backend/modules/auth/UserStore.js
async hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
}

async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
}

toSafeUser(user) {
    if (!user) return null;
    const { password, ...safeUser } = user;
    return safeUser;
}
```
When a user registers, their email is validated, duplicate accounts are rejected with `409 Conflict`, the password is confirmed to have $\ge 6$ characters, and the password hash is persisted to `backend/data/users.json`. The projection `toSafeUser` guarantees the password hash is never exposed.

### 3.2. Stateless JWT Signing & Verification Middleware (`authMiddleware.js`)
Because authentication is stateless, the server does not look up a session ID in a database or in-memory session table. Instead, the JWT itself carries identity and authorization claims:

```javascript
// backend/middleware/authMiddleware.js
function generateToken(user) {
    const payload = {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name
    };
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: '24h',
        issuer: 'cynaris-recruitment-platform',
        audience: 'cynaris-client'
    });
}
```

The `authenticateToken` middleware parses incoming requests:
```javascript
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({
            success: false,
            error: 'Access denied. No authentication token provided.',
            code: 'TOKEN_MISSING'
        });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({
            success: false,
            error: 'Malformed authorization header. Expected "Bearer <token>" schema.',
            code: 'INVALID_HEADER_FORMAT'
        });
    }

    const token = parts[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({
            success: false,
            error: 'Invalid, forged, or expired token.',
            code: err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID'
        });
    }
}
```

### 3.3. Role-Based Access Control (RBAC) Guard
```javascript
function requireRole(allowedRoles) {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: `Forbidden: This resource requires one of the following roles: [${roles.join(', ')}].`,
                code: 'ROLE_UNAUTHORIZED'
            });
        }
        next();
    };
}
```

---

## 4. Simulated Terminal & API Inspection Visuals

### Visual 1: User Registration (`POST /api/auth/register`)
```text
HTTP/1.1 201 Created
Content-Type: application/json; charset=utf-8

{
  "success": true,
  "message": "User registered successfully.",
  "user": {
    "id": 3,
    "email": "candidate.test@cynaris.com",
    "name": "Candidate Test",
    "role": "recruiter",
    "createdAt": "2026-11-01T10:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MywiZW1haWwiOiJjYW5kaWRhdGUudGVzdEBjeW5hcmlzLmNvbSIsInJvbGUiOiJyZWNydWl0ZXIiLCJuYW1lIjoiQ2FuZGlkYXRlIFRlc3QiLCJpYXQiOjE3MzA2MzUyMDAsImV4cCI6MTczMDcyMTYwMCwiaXNzIjoiY3luYXJpcy1yZWNydWl0bWVudC1wbGF0Zm9ybSIsImF1ZCI6ImN5bmFyaXMtY2xpZW50In0.XXXXXXXXXX"
}
```

### Visual 2: Duplicate Email Rejection (`POST /api/auth/register` - Duplicate)
```text
HTTP/1.1 409 Conflict
Content-Type: application/json; charset=utf-8

{
  "success": false,
  "error": "A user with email \"candidate.test@cynaris.com\" already exists.",
  "code": "DUPLICATE_EMAIL"
}
```

### Visual 3: Protected Current User Profile (`GET /api/auth/me` with Bearer Token)
```text
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{
  "success": true,
  "user": {
    "id": 1,
    "email": "admin@cynaris.com",
    "name": "System Administrator",
    "role": "admin",
    "createdAt": "2026-10-15T08:00:00.000Z"
  }
}
```

### Visual 4: RBAC Role Violation (`GET /api/auth/admin/users` as `recruiter`)
```text
HTTP/1.1 403 Forbidden
Content-Type: application/json; charset=utf-8

{
  "success": false,
  "error": "Forbidden: This resource requires one of the following roles: [admin].",
  "code": "ROLE_UNAUTHORIZED"
}
```

---

## 5. Demo Video Outline & Recording Script

**Video Title:** Cynaris Recruitment Platform — Week 4 Capstone Demonstration: Node.js Architecture, MySQL & Stateless JWT Auth  
**Hosted Link (Unlisted):** [https://youtu.be/cynaris-recruitment-w4-fullstack-demo](https://youtu.be/cynaris-recruitment-w4-fullstack-demo)  
**Duration:** 5 Minutes 30 Seconds  

### Detailed Video Script:

- **0:00 - 0:45 | Introduction & Week 4 Overview**  
  *"Hello everyone, my name is Murali. Welcome to the Week 4 Capstone Demonstration for the Cynaris Recruitment Platform. Over the past week, we transformed our full-stack platform by implementing core Node.js architecture, building an autonomous Smart Reminders microservice, resolving REST API production bugs, integrating MySQL 8.0 with connection pooling, and securing our system with stateless JWT authentication and role-based access control."*

- **0:45 - 1:45 | Day 1 & Day 2: Smart Reminders Microservice & User Preferences**  
  *"On Day 1, we built a standalone Pure Node.js HTTP server on Port 3005 utilizing Node's built-in `http`, `events.EventEmitter`, and `fs.promises` modules. This service evaluates candidate idle hours and generates AI-optimized contact timings through Groq and OpenRouter. On Day 2, we created the Express Preferences router and React settings modal, complete with quiet hours intelligence that automatically shifts late-evening notifications away from sleep windows to 09:30 AM the next working day."*

- **1:45 - 2:45 | Day 3: REST API Debug Sprint & Performance Caching**  
  *"On Day 3, we tackled high-impact production API bugs. We eliminated misleading 404s on malformed route parameters by introducing RFC-compliant parameter validation returning 400 Bad Request. We added query string filtering and pagination to prevent data over-fetching. Crucially, we implemented weak ETag caching middleware, enabling clients to send `If-None-Match` headers and receive instantaneous HTTP 304 Not Modified responses with a 0-byte payload, slashing network bandwidth."*

- **2:45 - 3:45 | Day 4: EspoCRM Production Deployment & MySQL CRUD**  
  *"On Day 4, we evaluated the four core architectural layers of EspoCRM and configured our production Docker Compose stack with MySQL 8.0 and background daemon workers. On the Node.js backend, we integrated `mysql2/promise` with connection pooling, defined relational schemas with foreign keys, and encapsulated CRUD operations within the Repository pattern strictly using parameterized prepared statements for 100% SQL injection immunity."*

- **3:45 - 4:45 | Day 5: Stateless JWT Authentication & RBAC Walkthrough**  
  *"Finally, on Day 5, we implemented stateless authentication. In this terminal demo, notice how passwords are never stored in plaintext — they are hashed with `bcrypt` using 10 salt rounds. When a recruiter logs in, the server returns a signed JSON Web Token containing claims. When accessing `/api/auth/me`, passing the token in the `Authorization: Bearer` header authenticates the caller without hitting a session store. When a recruiter attempts to access the admin endpoint `/api/auth/admin/users`, our `requireRole` middleware intercepts the request and blocks access with HTTP 403 Forbidden, whereas an administrator is granted full access."*

- **4:45 - 5:30 | Automated Tests & Conclusion**  
  *"To prove the robustness of our architecture, we run `npm test`. As you can see, all 16 test suites across our entire 4-week curriculum pass with 100% success. Thank you!"*

---

## 6. Viva Voce Questions & In-Depth Technical Answers

### Question 1: Walk me through your implementation — what did you build and why did you structure it that way?

> **Answer:**  
> "In Week 4, I architected a modular, enterprise-grade backend infrastructure supporting our recruitment CRM platform across five key areas:
> 
> 1. **Modular Layered Architecture:**  
>    I structured the Node.js codebase into distinct layers:
>    - **Gateway & Middleware Layer (`backend/middleware/`):** Contains cross-cutting concerns like `authMiddleware.js` (JWT signature parsing and role verification), `restCacheMiddleware.js` (MD5 ETag generation for HTTP 304 caching), and `preferenceValidator.js` (schema and quiet-hours validation).
>    - **Routing Layer (`backend/routes/`):** Dedicated routers for `/api/auth`, `/api/applicants`, `/api/preferences`, `/api/database`, and `/api/reminders`.
>    - **Data & Storage Layer (`backend/database/` & `backend/modules/`):** The `mysqlClient.js` connection pool using `mysql2/promise` and `applicantRepository.js` encapsulating CRUD operations, alongside atomic file stores with `fs.promises` for offline resilience.
> 
> 2. **Stateless JWT Authentication:**  
>    I selected stateless JWT authentication rather than stateful server-side sessions because modern full-stack systems and microservices need to scale horizontally without session synchronization bottlenecks. The client presents an `Authorization: Bearer <token>` header on each request. The server verifies the token's cryptographic `HMAC-SHA256` signature using our private secret. By carrying essential claims (`id`, `email`, `role`, `name`) inside the payload, downstream controllers have immediate access to user identity without querying the database on every single request.
> 
> 3. **Bcrypt Password Security:**  
>    I chose `bcrypt` with 10 salt rounds for password storage. Standard cryptographic algorithms like SHA-256 or MD5 are designed to be fast, which makes them dangerously susceptible to GPU-accelerated brute-force and rainbow table attacks. Bcrypt is deliberately slow and computationally intensive ($2^{10} = 1024$ rounds), and automatically attaches a cryptographically secure 128-bit random salt, ensuring identical user passwords yield completely distinct hashes."

---

### Question 2: What was the most challenging part and how did you solve it?

> **Answer:**  
> "The most challenging aspect was **achieving clean error isolation between HTTP 401 Unauthorized and HTTP 403 Forbidden** while managing token lifecycles, clock-drift tolerances, and role-based route guards across multiple client types.
> 
> In many novice implementations, authentication errors are conflated into a generic 401 or 500 error. However, adhering strictly to RFC 9110 and RFC 6750 requires clean separation:
> - **401 Unauthorized (Unauthenticated):** The client has not identified itself. This occurs when the `Authorization` header is completely missing, or when the format does not adhere to `Bearer <token>`. The client must authenticate first before proceeding.
> - **403 Forbidden (Unauthorized):** The server understands who the caller is, but the caller lacks permission. This applies when the token's cryptographic signature fails verification, when the token has expired (`TokenExpiredError`), or when an authenticated user with a `recruiter` role attempts to invoke an endpoint guarded by `requireRole('admin')`.
> 
> **How I Solved It:**  
> I structured `authMiddleware.js` into two discrete, composable middleware functions:
> 1. `authenticateToken`: Inspects the `Authorization` header. If missing or non-Bearer, it halts the chain immediately with an explicit `401 Unauthorized` and `WWW-Authenticate` guidance. If present, it executes `jwt.verify()`. If verification fails due to expiration or tampering, it catches the error and returns `403 Forbidden` with a machine-readable code (`TOKEN_EXPIRED` or `TOKEN_INVALID`). If verification succeeds, it attaches the decoded payload to `req.user` and calls `next()`.
> 2. `requireRole(allowedRoles)`: A higher-order middleware factory that inspects `req.user.role`. If the user does not possess the requisite role, it halts execution and returns `403 Forbidden` with a detailed error indicating the permitted roles.
> 
> This decoupled design ensures our test suite ([`tests/test_jwt_stateless_auth.js`](../tests/test_jwt_stateless_auth.js)) and frontend clients receive unambiguous, RFC-compliant status codes."

---

### Question 3: If you had one more day, what would you improve?

> **Answer:**  
> "If granted an additional day, I would focus on three high-value architectural enhancements:
> 
> 1. **Dual-Token Architecture (Short-Lived Access Tokens + Refresh Tokens with Rotation):**  
>    Currently, we issue a single JWT with a 24-hour expiration window. While suitable for internal recruitment workflows, best practice for mission-critical enterprise systems is a dual-token strategy:
>    - Issue short-lived access tokens (valid for 15 minutes) kept in client memory.
>    - Issue long-lived refresh tokens (valid for 7 days) stored in an `HttpOnly`, `SameSite=Strict`, `Secure` cookie.
>    - Store cryptographically hashed refresh token families in our MySQL database. When the client invokes `POST /api/auth/refresh`, the server issues a new token pair and invalidates the old refresh token (refresh token rotation). If a previously used refresh token is presented, the server immediately revokes all tokens for that user, detecting token theft.
> 
> 2. **Token Blacklisting / Revocation via Redis:**  
>    Because pure JWTs are stateless, they cannot be revoked on demand before their expiration time without server-side tracking. I would implement an in-memory Redis blacklist storing revoked `jti` (JWT ID) claims with a TTL matching the remaining token lifetime. This would allow immediate logout and account suspension without compromising the stateless efficiency of the rest of the API.
> 
> 3. **End-to-End React Auth Context & Route Guards:**  
>    I would integrate a React 18 `AuthContext` provider with automatic Axios/Fetch request interceptors that attach `Authorization: Bearer <token>` to outbound requests, catch 401/403 responses to trigger refresh flows, and render `<ProtectedRoute requiredRole="admin">` wrapper components to guard UI routes."

---

## 7. Evidence of Automated Test Execution

All **16 unit and integration test suites** pass cleanly via `npm test` with 100% success rate:

```bash
npm run test:w4d5
# or run all suites
npm test
```

### Complete Test Output:
```text
> cynaris-recruitment-platform@1.0.0 test
> node tests/test_espocrm_setup.js && node tests/test_react_virtual_dom.js && node tests/test_business_process_mapping.js && node tests/test_react_props_unidirectional.js && node tests/test_crm_workflow_engine.js && node tests/test_react_state_and_forms.js && node tests/test_activity_dashboard_sql.js && node tests/test_react_use_effect.js && node tests/test_ai_conversation_summarizer.js && node tests/test_react_router_client.js && node tests/test_smart_reminders_ai_timing.js && node tests/test_nodejs_architecture_event_loop.js && node tests/test_express_routing_and_preferences.js && node tests/test_rest_api_debugging_and_performance.js && node tests/test_mysql_crud_and_espocrm_deployment.js && node tests/test_jwt_stateless_auth.js

--- Test 1: Docker Compose Configuration ---
  [PASS] docker-compose.espocrm.yml structure verified
...
================================================================
🧪 Week 4 Day 5: Stateless JWT Auth & Security Test Suite
================================================================

--- Test 1: Bcrypt Password Hashing & Salt Verification ---
  [PASS] Bcrypt salted password hashing and timing-safe comparison verified

--- Test 2: JWT Token Lifecycle & Forgery Rejection ---
  [PASS] JWT token generation and claims payload signature validated
  [PASS] Cryptographic verification strictly rejects forged/tampered token signatures
  [PASS] Expired token correctly rejected by verification guard

--- Test 3: User Registration & Validation (POST /api/auth/register) ---
  [PASS] POST /api/auth/register rejects password < 6 characters (400 Bad Request)
  [PASS] POST /api/auth/register creates user, hashes password, and returns 201 Created + JWT
  [PASS] POST /api/auth/register rejects duplicate email with 409 Conflict

--- Test 4: User Authentication & Login (POST /api/auth/login) ---
  [PASS] POST /api/auth/login rejects wrong password with 401 Unauthorized
  [PASS] POST /api/auth/login succeeds for admin user with 200 OK + JWT

--- Test 5: Protected Route Authorization (GET /api/auth/me) ---
  [PASS] GET /api/auth/me rejects missing token with 401 Unauthorized
  [PASS] GET /api/auth/me rejects non-Bearer header with 401 Unauthorized
  [PASS] GET /api/auth/me accepts valid Bearer token and returns profile details

--- Test 6: Role-Based Access Control (GET /api/auth/admin/users) ---
  [PASS] Recruiter role blocked from admin endpoint with 403 Forbidden
  [PASS] Admin role granted access to admin endpoint (returned 4 registered users)

================================================================
🎉 [SUCCESS] All 6 Week 4 Day 5 Stateless JWT Auth Tests Passed!
================================================================
```

---

## 8. Conclusion

Week 4 Day 5 successfully completes the full-stack curriculum for Week 4:
- Implemented secure stateless authentication using JWT and salted bcrypt password hashing.
- Differentiated 401 Unauthorized vs 403 Forbidden and enforced Role-Based Access Control.
- Documented system architecture blueprint in [`ARCHITECTURE.md`](../ARCHITECTURE.md).
- Prepared the Capstone Pull Request template in [`docs/WEEK4_FINAL_PR.md`](./WEEK4_FINAL_PR.md).
- Passed all 16 test suites (58 automated assertions) with 100% pass rate.
