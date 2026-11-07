/**
 * UserStore.js
 * 
 * Week 4 Day 5: Stateless Auth with JWT & Bcrypt Password Hashing
 * 
 * Implements:
 * - Asynchronous file persistence for user accounts (backend/data/users.json)
 * - Bcrypt password hashing (bcryptjs) with salt rounds = 10
 * - Password comparison and duplicate email detection
 * - Default seed accounts (Admin and Recruiter)
 */

const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.resolve(__dirname, '../../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Default enterprise users with pre-hashed passwords
// Password for Admin: 'Admin@123'
// Password for Recruiter: 'Recruiter@123'
const DEFAULT_USERS = [
  {
    id: 'user-admin-1',
    name: 'Murali V',
    email: 'admin@cynaris.com',
    passwordHash: bcrypt.hashSync('Admin@123', 10),
    role: 'admin',
    department: 'Engineering & Architecture',
    createdAt: new Date('2026-10-01T09:00:00Z').toISOString(),
  },
  {
    id: 'user-recruiter-1',
    name: 'Priya Sharma',
    email: 'priya.sharma@cynaris.com',
    passwordHash: bcrypt.hashSync('Recruiter@123', 10),
    role: 'recruiter',
    department: 'Technical Talent Acquisition',
    createdAt: new Date('2026-10-15T10:30:00Z').toISOString(),
  },
];

class UserStore {
  constructor(filePath = USERS_FILE) {
    this.filePath = filePath;
    this.dirPath = path.dirname(filePath);
    this.memoryCache = null;
  }

  async ensureDirectory() {
    try {
      await fs.mkdir(this.dirPath, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
  }

  async load() {
    if (this.memoryCache) return this.memoryCache;

    await this.ensureDirectory();
    try {
      const content = await fs.readFile(this.filePath, 'utf8');
      this.memoryCache = JSON.parse(content);
      return this.memoryCache;
    } catch (err) {
      if (err.code === 'ENOENT') {
        this.memoryCache = JSON.parse(JSON.stringify(DEFAULT_USERS));
        await this.save(this.memoryCache);
        return this.memoryCache;
      }
      throw err;
    }
  }

  async save(data) {
    await this.ensureDirectory();
    this.memoryCache = data;
    const tempFile = `${this.filePath}.tmp.${Date.now()}`;
    await fs.writeFile(tempFile, JSON.stringify(data, null, 2), 'utf8');
    await fs.rename(tempFile, this.filePath);
    return data;
  }

  async findByEmail(email) {
    if (!email) return null;
    const users = await this.load();
    const cleanEmail = email.trim().toLowerCase();
    return users.find((u) => u.email.toLowerCase() === cleanEmail) || null;
  }

  async findById(id) {
    if (!id) return null;
    const users = await this.load();
    return users.find((u) => u.id === id) || null;
  }

  async createUser({ name, email, password, role = 'recruiter', department = 'Talent Acquisition' }) {
    const existing = await this.findByEmail(email);
    if (existing) {
      throw new Error(`User with email '${email}' already exists`);
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const newId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const newUser = {
      id: newId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      role: role === 'admin' ? 'admin' : 'recruiter',
      department,
      createdAt: new Date().toISOString(),
    };

    const users = await this.load();
    users.push(newUser);
    await this.save(users);

    // Return safe user object (omit passwordHash)
    const { passwordHash: _, ...safeUser } = newUser;
    return safeUser;
  }

  async verifyPassword(plainPassword, passwordHash) {
    if (!plainPassword || !passwordHash) return false;
    return bcrypt.compare(plainPassword, passwordHash);
  }

  async getAllSafe() {
    const users = await this.load();
    return users.map(({ passwordHash, ...safe }) => safe);
  }
}

const userStore = new UserStore();

module.exports = {
  UserStore,
  userStore,
  DEFAULT_USERS,
};
