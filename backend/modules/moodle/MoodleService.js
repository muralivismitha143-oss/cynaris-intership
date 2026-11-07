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
   * Supports 'chartjs' mode for Week 5 Day 4 dynamic dashboard visualization.
   */
  getStatsBlockContent(mode = 'chartjs') {
    const title = 'Cynaris Recruitment & Training Stats';
    const chartData = this.getChartDashboardData();

    // If scaffold-only requested, return simple scaffold
    if (mode === 'scaffold') {
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
        scaffoldMode: true,
      };
    }

    // Default: Week 5 Day 4 Chart.js Dynamic Visual Dashboard
    const studentRows = chartData.studentGradeStats.map(s => {
      const badge = s.hasGrades
        ? `<span style="background:#dcfce7; color:#15803d; padding:2px 6px; border-radius:4px; font-size:11px;">${s.averageGrade}%</span>`
        : `<span style="background:#f1f5f9; color:#64748b; padding:2px 6px; border-radius:4px; font-size:11px;">No Grades</span>`;
      return `<tr style="border-bottom:1px solid #e2e8f0;">` +
        `<td style="padding:6px 4px; font-weight:500;">${s.name}</td>` +
        `<td style="padding:6px 4px; text-align:center;">${s.gradedAttempts}</td>` +
        `<td style="padding:6px 4px; text-align:right;">${badge}</td>` +
        `</tr>`;
    }).join('');

    const html = `
<div class="cynaris-stats-dashboard" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px;">
  <!-- Header & Live Status Badge -->
  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid #e2e8f0;">
    <span style="font-weight:600; color:#0f172a;">📊 Training Performance Telemetry</span>
    <span id="cynaris-live-badge" style="background:#e0f2fe; color:#0369a1; padding:2px 8px; border-radius:12px; font-size:11px; font-weight:500;">
      🟢 Live Telemetry
    </span>
  </div>

  <!-- Chart 1: Course Completion % (Bar Chart) -->
  <div style="margin-bottom:16px;">
    <div style="font-size:12px; font-weight:600; color:#334155; margin-bottom:6px;">📈 Course Completion Rates</div>
    <div style="position:relative; height:180px; width:100%;">
      <canvas id="cynaris-completion-chart"></canvas>
    </div>
  </div>

  <!-- Chart 2: Login Frequency (Line Chart) -->
  <div style="margin-bottom:16px;">
    <div style="font-size:12px; font-weight:600; color:#334155; margin-bottom:6px;">⚡ Candidate Login Frequency</div>
    <div style="position:relative; height:180px; width:100%;">
      <canvas id="cynaris-login-chart"></canvas>
    </div>
  </div>

  <!-- Candidate Assessment Grades Table (Demonstrating students with and without grades) -->
  <div style="margin-bottom:12px;">
    <div style="font-size:12px; font-weight:600; color:#334155; margin-bottom:6px;">👥 Candidate Grade Averages</div>
    <table style="width:100%; border-collapse:collapse; font-size:12px;">
      <thead>
        <tr style="background:#f8fafc; color:#64748b; font-size:11px; text-transform:uppercase;">
          <th style="padding:6px 4px; text-align:left;">Student</th>
          <th style="padding:6px 4px; text-align:center;">Attempts</th>
          <th style="padding:6px 4px; text-align:right;">Avg Grade</th>
        </tr>
      </thead>
      <tbody id="cynaris-student-grade-rows">
        ${studentRows}
      </tbody>
    </table>
  </div>

  <!-- Dynamic Update Action Controls -->
  <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; padding-top:8px; border-top:1px solid #e2e8f0;">
    <button id="cynaris-refresh-btn" type="button" style="background:#0284c7; color:#ffffff; border:none; border-radius:4px; padding:4px 10px; font-size:11px; font-weight:500; cursor:pointer;">
      🔄 Refresh Telemetry
    </button>
    <small id="cynaris-last-updated" style="color:#94a3b8; font-size:10px;">Updated: Just now</small>
  </div>
</div>

<!-- Chart.js CDN Library Inclusion -->
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

<!-- Dynamic Chart Rendering & Live Update Engine (No Page Reload) -->
<script>
(function() {
  let completionChartInstance = null;
  let loginChartInstance = null;

  const initialData = ${JSON.stringify(chartData)};

  function initCharts(data) {
    if (typeof Chart === 'undefined') {
      console.warn('[CynarisStats] Chart.js CDN not yet loaded, retrying...');
      setTimeout(() => initCharts(data), 200);
      return;
    }

    const completionCtx = document.getElementById('cynaris-completion-chart');
    const loginCtx = document.getElementById('cynaris-login-chart');

    if (!completionCtx || !loginCtx) return;

    // Destroy existing instances if updating dynamically without reload
    if (completionChartInstance) completionChartInstance.destroy();
    if (loginChartInstance) loginChartInstance.destroy();

    // 1. Render Bar Chart (Course Completion %)
    completionChartInstance = new Chart(completionCtx.getContext('2d'), {
      type: 'bar',
      data: data.charts.barChart,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => 'Completion: ' + ctx.raw + '%'
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: { callback: (v) => v + '%' }
          }
        }
      }
    });

    // 2. Render Line Chart (Login Frequency)
    loginChartInstance = new Chart(loginCtx.getContext('2d'), {
      type: 'line',
      data: data.charts.lineChart,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1 }
          }
        }
      }
    });
  }

  // Dynamic AJAX Update Function without Page Reload
  async function refreshDashboardDynamically() {
    const badge = document.getElementById('cynaris-live-badge');
    const updatedLabel = document.getElementById('cynaris-last-updated');
    if (badge) badge.innerText = '⏳ Syncing...';

    try {
      const response = await fetch('/api/moodle/blocks/cynaris_stats/chart-data');
      if (response.ok) {
        const freshData = await response.json();
        initCharts(freshData);
        if (updatedLabel) updatedLabel.innerText = 'Updated: ' + new Date().toLocaleTimeString();
        if (badge) badge.innerText = '🟢 Live Telemetry';
      }
    } catch (err) {
      console.error('[CynarisStats] Dynamic update failed:', err);
      if (badge) badge.innerText = '⚠️ Sync Failed';
    }
  }

  // Initialize charts with seed payload
  initCharts(initialData);

  // Bind refresh button for on-demand dynamic polling
  const refreshBtn = document.getElementById('cynaris-refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', refreshDashboardDynamically);
  }

  // Dynamic auto-polling interval every 30 seconds
  setInterval(refreshDashboardDynamically, 30000);
})();
</script>
`;

    return {
      success: true,
      component: 'block_cynaris_stats',
      title,
      content: {
        text: html,
        footer: '<div style="text-align: right; margin-top: 6px;"><a href="/blocks/cynaris_stats/ajax.php" target="_blank" style="font-size: 11px; color: #0284c7; text-decoration: none;">View Raw JSON Stream &rarr;</a></div>',
      },
      chartData,
      formats: {
        all: true,
        my: true,
        'course-view': true,
        site: true,
      },
      scaffoldMode: false,
    };
  }

  /**
   * ==============================================================================
   * Week 5 Day 4: Dynamic Chart.js Analytics from 5 Core Moodle Tables
   * ==============================================================================
   */

  /**
   * Queries the 5 approved Moodle tables and prepares structured Chart.js payload:
   * 1. Completion % per course (mdl_course + mdl_course_completions)
   * 2. Average grade per student (mdl_user + mdl_grade_grades), handling students without grades
   * 3. Last login per user & login frequency (mdl_user + mdl_log)
   */
  getChartDashboardData() {
    // 1. Completion % per course (mdl_course + mdl_course_completions)
    const courses = this.data.courses || [];
    const completions = this.data.course_completions || [];
    const courseCompletionStats = courses.map(course => {
      const courseComps = completions.filter(c => c.course === course.id);
      const totalEnrolled = courseComps.length;
      const completedCount = courseComps.filter(c => c.status === 1 || (c.timecompleted && c.timecompleted > 0)).length;
      const completionPercentage = totalEnrolled > 0 ? Number(((completedCount / totalEnrolled) * 100).toFixed(1)) : 0.0;
      return {
        courseId: course.id,
        courseCode: course.shortname,
        courseName: course.fullname,
        totalEnrolled,
        completedCount,
        completionPercentage,
      };
    });

    // 2. Average grade per student (mdl_user + mdl_grade_grades)
    // 3+ students enrolled, some with grades, some without
    const users = (this.data.users || []).filter(u => !u.deleted && u.role !== 'admin');
    const grades = this.data.grades || [];
    const studentGradeStats = users.map(user => {
      const userGrades = grades.filter(g => g.userid === user.id);
      const gradedAttempts = userGrades.length;
      const hasGrades = gradedAttempts > 0;
      const averageGrade = hasGrades
        ? Number((userGrades.reduce((acc, g) => acc + Number(g.finalgrade), 0) / gradedAttempts).toFixed(2))
        : 0.00;
      return {
        userId: user.id,
        name: `${user.firstname} ${user.lastname}`,
        email: user.email,
        department: user.department || 'Intern',
        gradedAttempts,
        averageGrade,
        hasGrades,
      };
    }).sort((a, b) => b.averageGrade - a.averageGrade || a.name.localeCompare(b.name));

    // 3. Last login per user & login frequency (mdl_user + mdl_log)
    const logs = (this.data.logs || []).filter(l => l.module === 'login' && l.action === 'login');
    const loginFrequencyStats = users.map(user => {
      const userLogs = logs.filter(l => l.userid === user.id);
      const loginCount = userLogs.length;
      const maxTime = userLogs.reduce((max, l) => Math.max(max, l.time), 0);
      return {
        userId: user.id,
        name: `${user.firstname} ${user.lastname}`,
        loginCount,
        lastLoginTime: maxTime > 0 ? maxTime : null,
        lastLoginDate: maxTime > 0 ? new Date(maxTime * 1000).toISOString().replace('T', ' ').slice(0, 19) : 'Never',
      };
    }).sort((a, b) => b.loginCount - a.loginCount || a.name.localeCompare(b.name));

    // Chart.js data structures
    const barChartData = {
      labels: courseCompletionStats.map(c => c.courseCode),
      datasets: [
        {
          label: 'Course Completion Rate (%)',
          data: courseCompletionStats.map(c => c.completionPercentage),
          backgroundColor: 'rgba(2, 132, 199, 0.75)',
          borderColor: 'rgba(2, 132, 199, 1)',
          borderWidth: 1.5,
          borderRadius: 4,
        }
      ]
    };

    const lineChartData = {
      labels: loginFrequencyStats.map(u => u.name),
      datasets: [
        {
          label: 'User Login Frequency',
          data: loginFrequencyStats.map(u => u.loginCount),
          borderColor: 'rgba(16, 185, 129, 1)',
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          fill: true,
          tension: 0.35,
          pointRadius: 5,
          pointBackgroundColor: 'rgba(16, 185, 129, 1)',
        }
      ]
    };

    return {
      success: true,
      timestamp: new Date().toISOString(),
      courseCompletionStats,
      studentGradeStats,
      loginFrequencyStats,
      charts: {
        barChart: barChartData,
        lineChart: lineChartData,
      }
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
