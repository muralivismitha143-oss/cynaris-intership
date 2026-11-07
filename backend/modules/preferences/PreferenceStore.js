/**
 * PreferenceStore.js
 * 
 * Demonstrates:
 * - Persistent storage for User Preference Settings (fs.promises and path)
 * - Atomic write file pattern with temporary file and rename
 * - Multi-user preference management (recruiters, interviewers, hiring managers)
 * - Quiet Hours & Working Day window calculation algorithms (handling midnight crossovers)
 */

const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '../../data');
const PREFERENCES_FILE = path.join(DATA_DIR, 'userPreferences.json');

const DEFAULT_PREFERENCES = {
  'recruiter-1': {
    userId: 'recruiter-1',
    userName: 'Murali V',
    role: 'Talent Acquisition Lead',
    email: 'murali.v@cynarissolutions.com',
    timezone: 'Asia/Kolkata',
    channels: {
      email: true,
      whatsapp: true,
      inApp: true,
      sms: false,
    },
    quietHours: {
      enabled: true,
      start: '20:00', // 8:00 PM IST
      end: '08:30',   // 8:30 AM IST
    },
    workingSchedule: {
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      startHour: '09:30',
      endHour: '18:30',
    },
    remindersPolicy: {
      minimumUrgency: 'Medium', // All, Medium, High, Critical
      autoScheduleAiSuggestions: false,
      batchDigest: false,
      digestFrequency: 'Daily 09:00 AM',
    },
    updatedAt: new Date().toISOString(),
  },
  'recruiter-2': {
    userId: 'recruiter-2',
    userName: 'Priya Sharma',
    role: 'Engineering Hiring Lead',
    email: 'priya.sharma@cynarissolutions.com',
    timezone: 'Asia/Kolkata',
    channels: {
      email: true,
      whatsapp: false,
      inApp: true,
      sms: false,
    },
    quietHours: {
      enabled: true,
      start: '19:00',
      end: '09:00',
    },
    workingSchedule: {
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      startHour: '10:00',
      endHour: '18:00',
    },
    remindersPolicy: {
      minimumUrgency: 'High',
      autoScheduleAiSuggestions: true,
      batchDigest: true,
      digestFrequency: 'Daily 09:00 AM',
    },
    updatedAt: new Date().toISOString(),
  },
  'recruiter-3': {
    userId: 'recruiter-3',
    userName: 'Rahul Deshmukh',
    role: 'Sales & CRM Talent Partner',
    email: 'rahul.deshmukh@cynarissolutions.com',
    timezone: 'Asia/Kolkata',
    channels: {
      email: true,
      whatsapp: true,
      inApp: true,
      sms: true,
    },
    quietHours: {
      enabled: true,
      start: '21:00',
      end: '08:00',
    },
    workingSchedule: {
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      startHour: '09:00',
      endHour: '19:00',
    },
    remindersPolicy: {
      minimumUrgency: 'All',
      autoScheduleAiSuggestions: false,
      batchDigest: false,
      digestFrequency: 'Instant',
    },
    updatedAt: new Date().toISOString(),
  },
};

class PreferenceStore {
  constructor(filePath = PREFERENCES_FILE) {
    this.filePath = filePath;
    this.dirPath = path.dirname(filePath);
    this.cache = null;
  }

  async ensureDirectory() {
    try {
      await fs.mkdir(this.dirPath, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
  }

  async load() {
    if (this.cache) return this.cache;

    await this.ensureDirectory();
    try {
      const content = await fs.readFile(this.filePath, 'utf8');
      this.cache = JSON.parse(content);
      return this.cache;
    } catch (err) {
      if (err.code === 'ENOENT') {
        this.cache = JSON.parse(JSON.stringify(DEFAULT_PREFERENCES));
        await this.save(this.cache);
        return this.cache;
      }
      throw err;
    }
  }

  async save(data) {
    await this.ensureDirectory();
    this.cache = data;
    const tempFile = `${this.filePath}.tmp.${Date.now()}`;
    await fs.writeFile(tempFile, JSON.stringify(data, null, 2), 'utf8');
    await fs.rename(tempFile, this.filePath);
    return data;
  }

  async getAll() {
    const data = await this.load();
    return Object.values(data);
  }

  async get(userId) {
    const data = await this.load();
    return data[userId] || null;
  }

  async update(userId, updates) {
    const data = await this.load();
    const current = data[userId] || {
      userId,
      userName: updates.userName || 'Recruiter',
      role: updates.role || 'Recruitment Consultant',
      timezone: 'Asia/Kolkata',
      channels: { email: true, inApp: true, whatsapp: true, sms: false },
      quietHours: { enabled: true, start: '20:00', end: '08:30' },
      workingSchedule: {
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        startHour: '09:30',
        endHour: '18:30',
      },
      remindersPolicy: {
        minimumUrgency: 'Medium',
        autoScheduleAiSuggestions: false,
        batchDigest: false,
      },
    };

    const merged = {
      ...current,
      ...updates,
      channels: {
        ...current.channels,
        ...(updates.channels || {}),
      },
      quietHours: {
        ...current.quietHours,
        ...(updates.quietHours || {}),
      },
      workingSchedule: {
        ...current.workingSchedule,
        ...(updates.workingSchedule || {}),
      },
      remindersPolicy: {
        ...current.remindersPolicy,
        ...(updates.remindersPolicy || {}),
      },
      updatedAt: new Date().toISOString(),
    };

    data[userId] = merged;
    await this.save(data);
    return merged;
  }

  async toggleChannel(userId, channelKey, explicitState) {
    const data = await this.load();
    const user = data[userId];
    if (!user) return null;

    if (user.channels[channelKey] === undefined) {
      throw new Error(`Invalid notification channel: ${channelKey}`);
    }

    const nextState = explicitState !== undefined ? Boolean(explicitState) : !user.channels[channelKey];
    user.channels[channelKey] = nextState;
    user.updatedAt = new Date().toISOString();

    await this.save(data);
    return user;
  }

  async reset(userId) {
    const data = await this.load();
    if (DEFAULT_PREFERENCES[userId]) {
      data[userId] = JSON.parse(JSON.stringify(DEFAULT_PREFERENCES[userId]));
      data[userId].updatedAt = new Date().toISOString();
      await this.save(data);
      return data[userId];
    }
    return null;
  }

  /**
   * Evaluates if a given Date object or ISO string falls in the user's Quiet Hours.
   * Handles overnight intervals that span midnight (e.g. 20:00 to 08:30).
   */
  isQuietHour(userPrefs, date = new Date()) {
    if (!userPrefs || !userPrefs.quietHours || !userPrefs.quietHours.enabled) {
      return false;
    }

    const { start, end } = userPrefs.quietHours;
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);

    const d = new Date(date);
    const currentH = d.getHours();
    const currentM = d.getMinutes();

    const currentTotalMin = currentH * 60 + currentM;
    const startTotalMin = startH * 60 + startM;
    const endTotalMin = endH * 60 + endM;

    if (startTotalMin > endTotalMin) {
      // Spans midnight: e.g. 20:00 (1200) to 08:30 (510)
      return currentTotalMin >= startTotalMin || currentTotalMin < endTotalMin;
    } else {
      // Same-day: e.g. 13:00 to 14:00
      return currentTotalMin >= startTotalMin && currentTotalMin < endTotalMin;
    }
  }

  /**
   * Adjusts a reminder date to the next available working window if it falls
   * within Quiet Hours or outside working days.
   */
  adjustToWorkingWindow(userPrefs, inputDate = new Date()) {
    const date = new Date(inputDate);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const workingDays = userPrefs.workingSchedule?.days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const [startH, startM] = (userPrefs.workingSchedule?.startHour || '09:30').split(':').map(Number);
    const [endH, endM] = (userPrefs.workingSchedule?.endHour || '18:30').split(':').map(Number);

    let attempts = 0;
    while (attempts < 7) {
      const dayName = dayNames[date.getDay()];
      const isWorkingDay = workingDays.includes(dayName);
      const isQuiet = this.isQuietHour(userPrefs, date);

      const currentH = date.getHours();
      const currentM = date.getMinutes();
      const currentTotalMin = currentH * 60 + currentM;
      const workStartMin = startH * 60 + startM;
      const workEndMin = endH * 60 + endM;

      if (isWorkingDay && !isQuiet && currentTotalMin >= workStartMin && currentTotalMin <= workEndMin) {
        return {
          adjustedDate: date.toISOString(),
          wasShifted: attempts > 0 || date.getTime() !== new Date(inputDate).getTime(),
          reason: attempts > 0 ? 'Shifted outside quiet hours / non-working day' : 'Within working window',
        };
      }

      // If after working hours or in quiet hours, shift to next day's startHour
      if (currentTotalMin > workEndMin || isQuiet) {
        date.setDate(date.getDate() + 1);
        date.setHours(startH, startM, 0, 0);
      } else if (currentTotalMin < workStartMin) {
        date.setHours(startH, startM, 0, 0);
      } else if (!isWorkingDay) {
        date.setDate(date.getDate() + 1);
        date.setHours(startH, startM, 0, 0);
      }

      attempts++;
    }

    return {
      adjustedDate: date.toISOString(),
      wasShifted: true,
      reason: 'Shifted to earliest valid working slot',
    };
  }
}

module.exports = {
  PreferenceStore,
  DEFAULT_PREFERENCES,
};
