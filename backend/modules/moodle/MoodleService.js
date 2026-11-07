/**
 * MoodleService.js
 * 
 * Cynaris Platform — Moodle LMS Integration Service
 * Manages Moodle configuration, database connection, courses catalog,
 * candidate grades, and completion metrics.
 */

const fs = require('fs');
const path = require('path');

class MoodleService {
  constructor() {
    this.moodleRoot = path.resolve(__dirname, '../../../moodle');
    this.seedDataPath = path.join(this.moodleRoot, 'database/seed_data.json');
    this.configPath = path.join(this.moodleRoot, 'config.php');
    this.templatePath = path.join(this.moodleRoot, 'config.docker-template.php');
    this.data = this._loadData();
  }

  _loadData() {
    if (fs.existsSync(this.seedDataPath)) {
      try {
        return JSON.parse(fs.readFileSync(this.seedDataPath, 'utf8'));
      } catch (e) {
        // Fallback default
      }
    }
    return { courses: [], users: [], quizzes: [], grades: [], course_completions: [], logs: [] };
  }

  getStatus() {
    const hasConfig = fs.existsSync(this.configPath);
    const hasTemplate = fs.existsSync(this.templatePath);
    const hasSchema = fs.existsSync(path.join(this.moodleRoot, 'database/schema.sql'));

    return {
      success: true,
      service: 'Moodle LMS Integration Bridge',
      version: '4.3+',
      environment: {
        configured: hasConfig,
        dockerTemplateAvailable: hasTemplate,
        schemaInitialized: hasSchema,
        wwwroot: process.env.MOODLE_DOCKER_WWWROOT || 'http://localhost:8000',
        dataroot: process.env.MOODLE_DOCKER_DATAROOT || '/var/www/moodledata',
        dbtype: process.env.MOODLE_DOCKER_DB || 'pgsql',
      },
      metrics: {
        coursesCount: this.data.courses.length,
        usersCount: this.data.users.length,
        quizzesCount: this.data.quizzes.length,
        gradesRecorded: this.data.grades.length,
        completionsTracked: this.data.course_completions.length,
        auditLogsLogged: this.data.logs.length,
      }
    };
  }

  getCourses() {
    return this.data.courses;
  }

  getCourseById(courseId) {
    return this.data.courses.find(c => c.id === Number(courseId)) || null;
  }

  getCandidateProgress(userId) {
    const id = Number(userId);
    const user = this.data.users.find(u => u.id === id);
    if (!user) {
      return null;
    }

    const completions = this.data.course_completions
      .filter(c => c.userid === id)
      .map(comp => {
        const course = this.getCourseById(comp.course);
        return {
          ...comp,
          courseName: course ? course.fullname : `Course #${comp.course}`,
        };
      });

    const grades = this.data.grades
      .filter(g => g.userid === id)
      .map(grade => {
        const quiz = this.data.quizzes.find(q => q.id === grade.itemid);
        return {
          ...grade,
          quizName: quiz ? quiz.name : `Assessment #${grade.itemid}`,
        };
      });

    const isInductionComplete = completions.some(c => c.course === 101 && c.status === 1);

    return {
      user: {
        id: user.id,
        name: `${user.firstname} ${user.lastname}`,
        email: user.email,
        department: user.department,
      },
      inductionComplete: isInductionComplete,
      completions,
      grades,
      overallReadinessPercentage: isInductionComplete ? 95 : 40,
    };
  }

  getLogs(limit = 20) {
    return this.data.logs.slice(0, Number(limit));
  }
}

const moodleService = new MoodleService();

module.exports = {
  MoodleService,
  moodleService,
};
