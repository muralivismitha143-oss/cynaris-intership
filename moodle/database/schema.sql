-- ==============================================================================
-- Moodle LMS Core Relational Database Schema
-- Database Target: PostgreSQL / MySQL / MariaDB (mdl_ table prefix)
-- Key Tables for Candidate Induction & Assessment Tracking:
--   1. mdl_course: Course catalog and structure
--   2. mdl_grade_grades: Grade outcomes for activities and quizzes
--   3. mdl_course_completions: User course completion criteria and timestamps
--   4. mdl_user: User profile and learner accounts
--   5. mdl_log / mdl_logstore_standard_log: Audit trail of user actions
-- ==============================================================================

-- 1. Course Master Catalog Table
CREATE TABLE IF NOT EXISTS mdl_course (
    id SERIAL PRIMARY KEY,
    category BIGINT NOT NULL DEFAULT 0,
    sortorder BIGINT NOT NULL DEFAULT 0,
    fullname VARCHAR(254) NOT NULL DEFAULT '',
    shortname VARCHAR(100) NOT NULL DEFAULT '',
    idnumber VARCHAR(100) NOT NULL DEFAULT '',
    summary TEXT,
    summaryformat SMALLINT NOT NULL DEFAULT 0,
    format VARCHAR(21) NOT NULL DEFAULT 'topics',
    showgrades SMALLINT NOT NULL DEFAULT 1,
    newsitems SMALLINT NOT NULL DEFAULT 1,
    startdate BIGINT NOT NULL DEFAULT 0,
    enddate BIGINT NOT NULL DEFAULT 0,
    visible SMALLINT NOT NULL DEFAULT 1,
    timecreated BIGINT NOT NULL DEFAULT 0,
    timemodified BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS mdl_course_cat_idx ON mdl_course(category);
CREATE INDEX IF NOT EXISTS mdl_course_idnum_idx ON mdl_course(idnumber);

-- 2. User Directory & Learner Account Table
CREATE TABLE IF NOT EXISTS mdl_user (
    id SERIAL PRIMARY KEY,
    auth VARCHAR(20) NOT NULL DEFAULT 'manual',
    confirmed SMALLINT NOT NULL DEFAULT 1,
    policyagreed SMALLINT NOT NULL DEFAULT 1,
    deleted SMALLINT NOT NULL DEFAULT 0,
    suspended SMALLINT NOT NULL DEFAULT 0,
    mnethostid BIGINT NOT NULL DEFAULT 1,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL DEFAULT '',
    idnumber VARCHAR(255) NOT NULL DEFAULT '',
    firstname VARCHAR(100) NOT NULL DEFAULT '',
    lastname VARCHAR(100) NOT NULL DEFAULT '',
    email VARCHAR(100) NOT NULL UNIQUE,
    phone1 VARCHAR(20) NOT NULL DEFAULT '',
    institution VARCHAR(255) NOT NULL DEFAULT 'Cynaris',
    department VARCHAR(255) NOT NULL DEFAULT 'Engineering',
    city VARCHAR(120) NOT NULL DEFAULT 'Bangalore',
    country VARCHAR(2) NOT NULL DEFAULT 'IN',
    lang VARCHAR(30) NOT NULL DEFAULT 'en',
    timecreated BIGINT NOT NULL DEFAULT 0,
    timemodified BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS mdl_user_email_idx ON mdl_user(email);
CREATE INDEX IF NOT EXISTS mdl_user_username_idx ON mdl_user(username);

-- 3. Grade Grades Table (Assessment Scores)
CREATE TABLE IF NOT EXISTS mdl_grade_grades (
    id SERIAL PRIMARY KEY,
    itemid BIGINT NOT NULL,
    userid BIGINT NOT NULL,
    rawgrade DECIMAL(10, 5),
    rawgrademax DECIMAL(10, 5) NOT NULL DEFAULT 100.00000,
    rawgrademin DECIMAL(10, 5) NOT NULL DEFAULT 0.00000,
    rawscaleid BIGINT,
    usermodified BIGINT,
    finalgrade DECIMAL(10, 5),
    hidden BIGINT NOT NULL DEFAULT 0,
    locked BIGINT NOT NULL DEFAULT 0,
    locktime BIGINT NOT NULL DEFAULT 0,
    exported BIGINT NOT NULL DEFAULT 0,
    overridden BIGINT NOT NULL DEFAULT 0,
    feedback TEXT,
    feedbackformat BIGINT NOT NULL DEFAULT 0,
    information TEXT,
    informationformat BIGINT NOT NULL DEFAULT 0,
    timecreated BIGINT,
    timemodified BIGINT
);
CREATE INDEX IF NOT EXISTS mdl_grade_item_user_idx ON mdl_grade_grades(itemid, userid);
CREATE INDEX IF NOT EXISTS mdl_grade_user_idx ON mdl_grade_grades(userid);

-- 4. Course Completions Table
CREATE TABLE IF NOT EXISTS mdl_course_completions (
    id SERIAL PRIMARY KEY,
    userid BIGINT NOT NULL DEFAULT 0,
    course BIGINT NOT NULL DEFAULT 0,
    timeenrolled BIGINT NOT NULL DEFAULT 0,
    timestarted BIGINT NOT NULL DEFAULT 0,
    timecompleted BIGINT,
    reaggregate BIGINT NOT NULL DEFAULT 0,
    status SMALLINT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS mdl_completions_user_course_idx ON mdl_course_completions(userid, course);
CREATE INDEX IF NOT EXISTS mdl_completions_course_idx ON mdl_course_completions(course);

-- 5. Standard Event & Action Log Table
CREATE TABLE IF NOT EXISTS mdl_log (
    id SERIAL PRIMARY KEY,
    time BIGINT NOT NULL DEFAULT 0,
    userid BIGINT NOT NULL DEFAULT 0,
    ip VARCHAR(45) NOT NULL DEFAULT '',
    course BIGINT NOT NULL DEFAULT 0,
    module VARCHAR(20) NOT NULL DEFAULT '',
    cmid BIGINT NOT NULL DEFAULT 0,
    action VARCHAR(40) NOT NULL DEFAULT '',
    url VARCHAR(100) NOT NULL DEFAULT '',
    info VARCHAR(255) NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS mdl_log_course_module_action_idx ON mdl_log(course, module, action);
CREATE INDEX IF NOT EXISTS mdl_log_time_idx ON mdl_log(time);
CREATE INDEX IF NOT EXISTS mdl_log_user_idx ON mdl_log(userid);

-- 5b. Modern Standard Logstore
CREATE TABLE IF NOT EXISTS mdl_logstore_standard_log (
    id SERIAL PRIMARY KEY,
    eventname VARCHAR(255) NOT NULL,
    component VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    target VARCHAR(100) NOT NULL,
    objecttable VARCHAR(50),
    objectid BIGINT,
    crud CHAR(1) NOT NULL,
    edulevel SMALLINT NOT NULL,
    contextid BIGINT NOT NULL,
    userid BIGINT NOT NULL,
    relateduserid BIGINT,
    anonymous SMALLINT NOT NULL DEFAULT 0,
    other TEXT,
    timecreated BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS mdl_logstore_timecreated_idx ON mdl_logstore_standard_log(timecreated);
