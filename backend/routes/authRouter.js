/**
 * authRouter.js
 * 
 * Week 4 Day 5: Stateless JWT Authentication Router
 * 
 * Endpoints:
 * - POST /api/auth/register: Registers new user, hashes password, returns JWT
 * - POST /api/auth/login: Authenticates credentials, returns signed JWT
 * - GET  /api/auth/me: Protected profile endpoint returning authenticated user
 * - GET  /api/auth/admin/users: Protected administrative endpoint (RBAC: 'admin')
 * - POST /api/auth/verify: Verifies token validity
 */

const express = require('express');
const router = express.Router();

const { userStore } = require('../modules/auth/UserStore');
const { generateToken, authenticateToken, requireRole } = require('../middleware/authMiddleware');

// 1. User Registration
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, department } = req.body || {};

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Name is required', field: 'name' });
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Valid email address is required', field: 'email' });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long',
        field: 'password',
      });
    }

    const existing = await userStore.findByEmail(email);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: `User with email '${email}' already exists. Please log in instead.`,
        statusCode: 409,
      });
    }

    const safeUser = await userStore.createUser({
      name,
      email,
      password,
      role: role || 'recruiter',
      department: department || 'Talent Acquisition',
    });

    const token = generateToken(safeUser);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: safeUser,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. User Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are both required',
      });
    }

    const user = await userStore.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials. User not found.',
        statusCode: 401,
      });
    }

    const isValid = await userStore.verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials. Password incorrect.',
        statusCode: 401,
      });
    }

    const { passwordHash: _, ...safeUser } = user;
    const token = generateToken(safeUser);

    res.status(200).json({
      success: true,
      message: 'Authentication successful',
      token,
      user: safeUser,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Current User Profile (Protected)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await userStore.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User profile not found' });
    }

    const { passwordHash: _, ...safeUser } = user;
    res.status(200).json({
      success: true,
      user: safeUser,
      authClaims: req.user,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Admin Users Directory (Protected + RBAC)
router.get('/admin/users', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const users = await userStore.getAllSafe();
    res.status(200).json({
      success: true,
      count: users.length,
      users,
      requestedBy: req.user.email,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = {
  authRouter: router,
};
