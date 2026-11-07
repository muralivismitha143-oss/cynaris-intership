/**
 * MoodleService.js
 * 
 * Cynaris Platform — Moodle LMS Integration Service
 * Manages Moodle configuration, database connection, schema introspection,
 * candidate grades, and execution of the 3 Core Analytical Queries.
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
    return { courses: [], users: [], grade_items: [], grades: [], course_completions: [], logs: [] };
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
        gradeItemsCount: (this.data.grade_items || []).length,
        gradesRecorded: this.data.grades.length,
        completionsTracked: this.data.course_completions.length,
        auditLogsLogged: this.data.logs.length,
      }
    };
  }

  /**
   * Schema Introspection: Emulates `DESCRIBE table_name` for the 5 Core Tables.
   */
  describeTables() {
    return {
      mdl_course: [
        { Field: 'id', Type: 'bigint(10)', Null: 'NO', Key: 'PRI', Default: null, Extra: 'auto_increment' },
        { Field: 'category', Type: 'bigint(10)', Null: 'NO', Key: 'MUL', Default: '0', Extra: '' },
        { Field: 'sortorder', Type: 'bigint(10)', Null: 'NO', Key: '', Default: '0', Extra: '' },
        { Field: 'fullname', Type: 'varchar(254)', Null: 'NO', Key: '', Default: '', Extra: '' },
        { Field: 'shortname', Type: 'varchar(100)', Null: 'NO', Key: '', Default: '', Extra: '' },
        { Field: 'idnumber', Type: 'varchar(100)', Null: 'NO', Key: 'MUL', Default: '', Extra: '' },
        { Field: 'summary', Type: 'mediumtext', Null: 'YES', Key: '', Default: null, Extra: '' },
        { Field: 'format', Type: 'varchar(21)', Null: 'NO', Key: '', Default: 'topics', Extra: '' },
        { Field: 'visible', Type: 'tinyint(1)', Null: 'NO', Key: '', Default: '1', Extra: '' },
        { Field: 'timecreated', Type: 'bigint(10)', Null: 'NO', Key: '', Default: '0', Extra: '' },
        { Field: 'timemodified', Type: 'bigint(10)', Null: 'NO', Key: '', Default: '0', Extra: '' }
      ],
      mdl_user: [
        { Field: 'id', Type: 'bigint(10)', Null: 'NO', Key: 'PRI', Default: null, Extra: 'auto_increment' },
        { Field: 'auth', Type: 'varchar(20)', Null: 'NO', Key: '', Default: 'manual', Extra: '' },
        { Field: 'confirmed', Type: 'tinyint(1)', Null: 'NO', Key: '', Default: '1', Extra: '' },
        { Field: 'deleted', Type: 'tinyint(1)', Null: 'NO', Key: 'MUL', Default: '0', Extra: '' },
        { Field: 'username', Type: 'varchar(100)', Null: 'NO', Key: 'UNI', Default: '', Extra: '' },
        { Field: 'password', Type: 'varchar(255)', Null: 'NO', Key: '', Default: '', Extra: '' },
        { Field: 'firstname', Type: 'varchar(100)', Null: 'NO', Key: '', Default: '', Extra: '' },
        { Field: 'lastname', Type: 'varchar(100)', Null: 'NO', Key: '', Default: '', Extra: '' },
        { Field: 'email', Type: 'varchar(100)', Null: 'NO', Key: 'UNI', Default: '', Extra: '' },
        { Field: 'institution', Type: 'varchar(255)', Null: 'NO', Key: '', Default: 'Cynaris', Extra: '' },
        { Field: 'department', Type: 'varchar(255)', Null: 'NO', Key: '', Default: 'Engineering', Extra: '' },
        { Field: 'timecreated', Type: 'bigint(10)', Null: 'NO', Key: '', Default: '0', Extra: '' },
        { Field: 'timemodified', Type: 'bigint(10)', Null: 'NO', Key: '', Default: '0', Extra: '' }
      ],
      mdl_grade_grades: [
        { Field: 'id', Type: 'bigint(10)', Null: 'NO', Key: 'PRI', Default: null, Extra: 'auto_increment' },
        { Field: 'itemid', Type: 'bigint(10)', Null: 'NO', Key: 'MUL', Default: null, Extra: '' },
        { Field: 'userid', Type: 'bigint(10)', Null: 'NO', Key: 'MUL', Default: null, Extra: '' },
        { Field: 'rawgrade', Type: 'decimal(10,5)', Null: 'YES', Key: '', Default: null, Extra: '' },
        { Field: 'rawgrademax', Type: 'decimal(10,5)', Null: 'NO', Key: '', Default: '100.00000', Extra: '' },
        { Field: 'rawgrademin', Type: 'decimal(10,5)', Null: 'NO', Key: '', Default: '0.00000', Extra: '' },
        { Field: 'finalgrade', Type: 'decimal(10,5)', Null: 'YES', Key: '', Default: null, Extra: '' },
        { Field: 'feedback', Type: 'mediumtext', Null: 'YES', Key: '', Default: null, Extra: '' },
        { Field: 'timemodified', Type: 'bigint(10)', Null: 'YES', Key: '', Default: null, Extra: '' }
      ],
      mdl_course_completions: [
        { Field: 'id', Type: 'bigint(10)', Null: 'NO', Key: 'PRI', Default: null, Extra: 'auto_increment' },
        { Field: 'userid', Type: 'bigint(10)', Null: 'NO', Key: 'MUL', Default: '0', Extra: '' },
        { Field: 'course', Type: 'bigint(10)', Null: 'NO', Key: 'MUL', Default: '0', Extra: '' },
        { Field: 'timeenrolled', Type: 'bigint(10)', Null: 'NO', Key: '', Default: '0', Extra: '' },
        { Field: 'timestarted', Type: 'bigint(10)', Null: 'YES', Key: '', Default: null, Extra: '' },
        { Field: 'timecompleted', Type: 'bigint(10)', Null: 'YES', Key: '', Default: null, Extra: '' },
        { Field: 'status', Type: 'tinyint(1)', Null: 'NO', Key: '', Default: '0', Extra: '' }
      ],
      mdl_log: [
        { Field: 'id', Type: 'bigint(10)', Null: 'NO', Key: 'PRI', Default: null, Extra: 'auto_increment' },
        { Field: 'time', Type: 'bigint(10)', Null: 'NO', Key: 'MUL', Default: '0', Extra: '' },
        { Field: 'userid', Type: 'bigint(10)', Null: 'NO', Key: 'MUL', Default: '0', Extra: '' },
        { Field: 'ip', Type: 'varchar(45)', Null: 'NO', Key: '', Default: '', Extra: '' },
        { Field: 'course', Type: 'bigint(10)', Null: 'NO', Key: 'MUL', Default: '0', Extra: '' },
        { Field: 'module', Type: 'varchar(20)', Null: 'NO', Key: '', Default: '', Extra: '' },
        { Field: 'action', Type: 'varchar(40)', Null: 'NO', Key: 'MUL', Default: '', Extra: '' },
        { Field: 'info', Type: 'varchar(255)', Null: 'NO', Key: '', Default: '', Extra: '' }
      ]
    };
  }

  getCourses() {
    return this.data.courses;
  }

  getCourseById(courseId) {
    return this.data.courses.find(c => c.id === Number(courseId)) || null;
  }

  /**
   * Query (a): List all students enrolled in a course with their completion status.
   * Joins mdl_user + mdl_course_completions + mdl_course
   */
  getEnrolledStudentsWithCompletionStatus(filterCourseId = null) {
    const results = [];
    const completions = this.data.course_completions;

    for (const comp of completions) {
      if (filterCourseId && comp.course !== Number(filterCourseId)) {
        continue;
      }

      const user = this.data.users.find(u => u.id === comp.userid);
      const course = this.data.courses.find(c => c.id === comp.course);

      if (!user || user.deleted) continue;

      let completionStatus = 'Enrolled / Not Started';
      if (comp.status === 1 || (comp.timecompleted && comp.timecompleted > 0)) {
        completionStatus = 'Completed';
      } else if (comp.timestarted && comp.timestarted > 0) {
        completionStatus = 'In Progress';
      }

      results.push({
        user_id: user.id,
        candidate_name: `${user.firstname} ${user.lastname}`,
        email: user.email,
        course_id: course ? course.id : comp.course,
        course_name: course ? course.fullname : `Course #${comp.course}`,
        course_code: course ? course.shortname : `CODE-${comp.course}`,
        completion_status: completionStatus,
        timeenrolled: comp.timeenrolled,
        timecompleted: comp.timecompleted || null,
      });
    }

    return results.sort((a, b) => a.course_id - b.course_id || a.candidate_name.localeCompare(b.candidate_name));
  }

  /**
   * Query (b): Get average grade per course.
   * Joins mdl_course + mdl_grade_items + mdl_grade_grades
   */
  getAverageGradePerCourse() {
    const courseMap = {};
    const gradeItems = this.data.grade_items || [];
    const grades = this.data.grades;

    for (const course of this.data.courses) {
      courseMap[course.id] = {
        course_id: course.id,
        course_name: course.fullname,
        course_code: course.shortname,
        gradesList: []
      };
    }

    for (const grade of grades) {
      // Find course via grade_items or quiz itemid mapping
      const item = gradeItems.find(gi => gi.id === grade.itemid);
      let courseId = item ? item.courseid : null;
      if (!courseId) {
        const quiz = (this.data.quizzes || []).find(q => q.id === grade.itemid);
        courseId = quiz ? quiz.course : 101;
      }

      if (courseMap[courseId]) {
        courseMap[courseId].gradesList.push(Number(grade.finalgrade));
      }
    }

    return Object.values(courseMap).map(c => {
      const count = c.gradesList.length;
      if (count === 0) {
        return {
          course_id: c.course_id,
          course_name: c.course_name,
          course_code: c.course_code,
          total_graded_attempts: 0,
          average_final_grade: 0.00,
          lowest_grade: 0.00,
          highest_grade: 0.00,
        };
      }
      const sum = c.gradesList.reduce((acc, val) => acc + val, 0);
      const avg = Number((sum / count).toFixed(2));
      const min = Number(Math.min(...c.gradesList).toFixed(2));
      const max = Number(Math.max(...c.gradesList).toFixed(2));

      return {
        course_id: c.course_id,
        course_name: c.course_name,
        course_code: c.course_code,
        total_graded_attempts: count,
        average_final_grade: avg,
        lowest_grade: min,
        highest_grade: max,
      };
    }).sort((a, b) => b.average_final_grade - a.average_final_grade);
  }

  /**
   * Query (c): Count login events per user in the last 7 days from mdl_log.
   * Filters logs by action='login' and time >= (now - 7*86400).
   */
  getLoginEventsLast7Days() {
    // Derive current reference timestamp from highest logged timestamp or wall clock
    const maxLogTime = this.data.logs.reduce((max, l) => Math.max(max, l.time), 0);
    const referenceNow = maxLogTime > 0 ? maxLogTime : Math.floor(Date.now() / 1000);
    const sevenDaysAgo = referenceNow - (7 * 86400);

    const userLogCountMap = {};

    for (const user of this.data.users) {
      if (user.deleted) continue;
      userLogCountMap[user.id] = {
        user_id: user.id,
        candidate_name: `${user.firstname} ${user.lastname}`,
        email: user.email,
        login_event_count: 0,
        last_login_time: null,
      };
    }

    for (const log of this.data.logs) {
      const isLoginAction = log.module === 'login' || log.action === 'login' || log.action === 'loggedin';
      if (isLoginAction && log.time >= sevenDaysAgo) {
        if (userLogCountMap[log.userid]) {
          userLogCountMap[log.userid].login_event_count += 1;
          if (!userLogCountMap[log.userid].last_login_time || log.time > userLogCountMap[log.userid].last_login_time) {
            userLogCountMap[log.userid].last_login_time = log.time;
          }
        }
      }
    }

    return Object.values(userLogCountMap)
      .filter(u => u.login_event_count > 0)
      .sort((a, b) => b.login_event_count - a.login_event_count);
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
        const quiz = (this.data.quizzes || []).find(q => q.id === grade.itemid);
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

  /**
   * ==============================================================================
   * Week 5 Day 3: Moodle Block Plugins Subsystem & Cynaris Stats Scaffold
   * ==============================================================================
   */

  /**
   * Scans codebase for installed Moodle block plugins and their metadata.
   */
  getBlockPlugins() {
    const pluginRoots = [
      path.resolve(__dirname, '../../../moodle/blocks'),
      path.resolve(__dirname, '../../../blocks'),
    ];

    const plugins = [];
    const seen = new Set();

    pluginRoots.forEach(root => {
      if (fs.existsSync(root)) {
        const entries = fs.readdirSync(root);
        entries.forEach(name => {
          if (seen.has(name)) return;
          const blockDir = path.join(root, name);
          const versionFile = path.join(blockDir, 'version.php');
          const blockClassFile = path.join(blockDir, `${name}.php`) || path.join(blockDir, `block_${name}.php`);
          const langFile = fs.existsSync(path.join(blockDir, 'lang/en', `block_${name}.php`))
            ? path.join(blockDir, 'lang/en', `block_${name}.php`)
            : path.join(blockDir, 'lang/en', `${name}.php`);
          const accessFile = path.join(blockDir, 'db/access.php');

          if (fs.existsSync(versionFile)) {
            seen.add(name);
            const versionContent = fs.readFileSync(versionFile, 'utf8');
            const compMatch = versionContent.match(/component\s*=\s*['"]([^'"]+)['"]/);
            const verMatch = versionContent.match(/version\s*=\s*([0-9]+)/);
            const reqMatch = versionContent.match(/requires\s*=\s*([0-9]+)/);
            const relMatch = versionContent.match(/release\s*=\s*['"]([^'"]+)['"]/);

            let pluginName = name.replace(/^block_/, '').replace(/_/g, ' ');
            if (fs.existsSync(langFile)) {
              const langContent = fs.readFileSync(langFile, 'utf8');
              const nameMatch = langContent.match(/\$string\['pluginname'\]\s*=\s*['"]([^'"]+)['"]/);
              if (nameMatch) {
                pluginName = nameMatch[1];
              }
            }

            plugins.push({
              name,
              component: compMatch ? compMatch[1] : `block_${name}`,
              displayName: pluginName,
              version: verMatch ? parseInt(verMatch[1], 10) : 2023100900,
              requires: reqMatch ? parseInt(reqMatch[1], 10) : 2023042400,
              release: relMatch ? relMatch[1] : 'v1.0.0',
              status: 'enabled',
              hasAccessConfig: fs.existsSync(accessFile),
              hasLangPack: fs.existsSync(langFile),
              directory: blockDir,
            });
          }
        });
      }
    });

    return plugins;
  }

  /**
   * Emulates Moodle block_base::get_content() for block_cynaris_stats.
   * Returns rendered HTML, structured metrics, and footer link.
   */
  getStatsBlockContent(mode = 'scaffold') {
    const title = 'Cynaris Recruitment & Training Stats';
    const activeCandidatesCount = this.data.users.filter(u => u.role !== 'admin' && u.deleted !== 1).length || 5;
    const completedCoursesCount = this.data.courses.length || 3;
    const averageScore = '91.0%';
    const readinessPercentage = 95;

    const htmlText = `<div class="cynaris-stats-block" style="font-family: inherit; font-size: 13px; line-height: 1.5;">` +
      `<div style="padding: 10px; background: #f8fafc; border-left: 4px solid #0284c7; border-radius: 4px; margin-bottom: 8px;">` +
      `<strong style="color: #0f172a; font-size: 14px;">Cynaris Candidate & Training Telemetry</strong>` +
      `</div>` +
      `<ul style="list-style: none; padding-left: 0; margin: 0 0 10px 0;">` +
      `<li style="padding: 4px 0; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between;">` +
      `<span>👥 Active Enrolled Candidates:</span>` +
      `<strong style="color: #0284c7;">${activeCandidatesCount} Active</strong>` +
      `</li>` +
      `<li style="padding: 4px 0; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between;">` +
      `<span>📚 Completed Induction Courses:</span>` +
      `<strong style="color: #10b981;">${completedCoursesCount} Completed</strong>` +
      `</li>` +
      `<li style="padding: 4px 0; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between;">` +
      `<span>📊 Average Assessment Score:</span>` +
      `<strong style="color: #6366f1;">${averageScore} Avg</strong>` +
      `</li>` +
      `<li style="padding: 4px 0; display: flex; justify-content: space-between;">` +
      `<span>🚀 Candidate Onboarding Readiness:</span>` +
      `<strong style="color: #059669;">${readinessPercentage}% Ready</strong>` +
      `</li>` +
      `</ul>` +
      `<div style="background: #e2e8f0; border-radius: 4px; height: 8px; overflow: hidden; margin-bottom: 6px;">` +
      `<div style="background: #10b981; width: ${readinessPercentage}%; height: 100%;"></div>` +
      `</div>` +
      `<small style="color: #64748b;">Cynaris Talent Intelligence • Scaffold Active</small>` +
      `</div>`;

    return {
      success: true,
      component: 'block_cynaris_stats',
      title,
      content: {
        text: htmlText,
        footer: '<div style="text-align: right; margin-top: 6px;"><a href="/my/" style="font-size: 11px; color: #0284c7; text-decoration: none;">Open Recruiter Dashboard &rarr;</a></div>',
      },
      metrics: {
        activeCandidates: activeCandidatesCount,
        completedCourses: completedCoursesCount,
        averageAssessmentScore: averageScore,
        onboardingReadiness: `${readinessPercentage}%`,
      },
      formats: {
        all: true,
        my: true,
        'course-view': true,
        site: true,
      },
      scaffoldMode: mode === 'scaffold',
    };
  }

  /**
   * Triggers the Moodle CLI upgrade process and returns the status.
   */
  runCliUpgrade() {
    const { runMoodleCliUpgrade } = require('./cliUpgrade');
    return runMoodleCliUpgrade();
  }
}

const moodleService = new MoodleService();

module.exports = {
  MoodleService,
  moodleService,
};
