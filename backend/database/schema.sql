-- ==============================================================================
-- Cynaris Recruitment Platform & EspoCRM Integration Schema
-- Database: espocrm (MySQL 8.0)
-- ==============================================================================

-- 1. Job Applicant Table (Recruitment Pipeline)
CREATE TABLE IF NOT EXISTS `job_applicant` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `job_title` VARCHAR(150) NOT NULL,
  `pipeline_stage` VARCHAR(50) NOT NULL DEFAULT 'Screening',
  `experience_years` DECIMAL(4, 1) NOT NULL DEFAULT 1.0,
  `skills` TEXT NOT NULL,
  `education` VARCHAR(255) DEFAULT 'B.Tech Computer Science',
  `resume_text` TEXT,
  `ai_resume_summary` TEXT,
  `ai_summary_provider` VARCHAR(100),
  `ai_analyzed_at` DATETIME,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_stage` (`pipeline_stage`),
  INDEX `idx_stage_updated` (`pipeline_stage`, `updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Automation Rules Table (Smart Reminders Engine)
CREATE TABLE IF NOT EXISTS `automation_rules` (
  `id` VARCHAR(64) PRIMARY KEY,
  `name` VARCHAR(200) NOT NULL,
  `entity_type` VARCHAR(50) NOT NULL DEFAULT 'JobApplicant',
  `trigger_stage` VARCHAR(50) NOT NULL,
  `idle_threshold_hours` INT NOT NULL DEFAULT 24,
  `urgency` VARCHAR(20) NOT NULL DEFAULT 'Medium',
  `channel_preference` VARCHAR(30) NOT NULL DEFAULT 'Email',
  `description` TEXT,
  `enabled` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Scheduled Smart Reminders Queue
CREATE TABLE IF NOT EXISTS `smart_reminders` (
  `id` VARCHAR(64) PRIMARY KEY,
  `rule_id` VARCHAR(64) NOT NULL,
  `entity_id` INT NOT NULL,
  `recipient_name` VARCHAR(150) NOT NULL,
  `role` VARCHAR(150) NOT NULL,
  `pipeline_stage` VARCHAR(50) NOT NULL,
  `hours_idle` INT NOT NULL DEFAULT 0,
  `recommended_slot` VARCHAR(100) NOT NULL,
  `recommended_channel` VARCHAR(30) NOT NULL,
  `rationale` TEXT,
  `customized_message` TEXT,
  `provider` VARCHAR(100) NOT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'Scheduled',
  `scheduled_at` DATETIME NOT NULL,
  `dispatched_at` DATETIME,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_status` (`status`),
  INDEX `idx_rule` (`rule_id`),
  CONSTRAINT `fk_reminder_rule` FOREIGN KEY (`rule_id`) REFERENCES `automation_rules` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Audit & Event Loop Log Table
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `event_type` VARCHAR(50) NOT NULL,
  `action` VARCHAR(100) NOT NULL,
  `entity_type` VARCHAR(50) NOT NULL,
  `entity_id` VARCHAR(64) NOT NULL,
  `details` JSON,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_event_entity` (`event_type`, `entity_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Intern Placement & Interview Readiness Scores Table (Week 8 Day 2: Module 6 & 7)
CREATE TABLE IF NOT EXISTS `intern_readiness_scores` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `intern_id` INT NOT NULL,
  `intern_name` VARCHAR(150) NOT NULL,
  `intern_email` VARCHAR(150),
  `target_role` VARCHAR(150) NOT NULL DEFAULT 'Full Stack Developer',
  `project_completion_pct` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  `assessment_score` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  `cia_usage_hours` DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
  `documentation_quality` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  `placement_readiness_score` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  `placement_grade` CHAR(1) NOT NULL DEFAULT 'D',
  `viva_score` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  `code_review_score` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  `demo_clarity_score` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  `git_workflow_score` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  `interview_readiness_score` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  `interview_grade` CHAR(1) NOT NULL DEFAULT 'D',
  `improvement_recommendations` JSON,
  `ai_provider` VARCHAR(100) DEFAULT 'Groq',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_intern_id` (`intern_id`),
  INDEX `idx_placement_score` (`placement_readiness_score`),
  INDEX `idx_interview_score` (`interview_readiness_score`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- Initial Seed Data
-- ==============================================================================
INSERT IGNORE INTO `automation_rules` (`id`, `name`, `entity_type`, `trigger_stage`, `idle_threshold_hours`, `urgency`, `channel_preference`, `description`, `enabled`)
VALUES
('rule-1', 'Stalled Technical Round Follow-up', 'JobApplicant', 'Technical Round 1', 48, 'High', 'Email', 'Trigger when applicant in Technical Round 1 has had no scorecard update for > 48 hours.', TRUE),
('rule-2', 'Offer Decision & Acceptance Check-in', 'JobApplicant', 'Offered', 72, 'Critical', 'WhatsApp', 'Trigger when offer letter pending acceptance > 72 hours.', TRUE),
('rule-3', 'Screening Feedback Acceleration', 'JobApplicant', 'Screening', 24, 'Medium', 'Email', 'Trigger when candidate remains unreviewed in Screening > 24 hours.', TRUE);

INSERT IGNORE INTO `job_applicant` (`id`, `name`, `job_title`, `pipeline_stage`, `experience_years`, `skills`, `education`, `resume_text`)
VALUES
(1, 'Rahul Kumar', 'Full Stack Developer', 'Screening', 2.0, 'JavaScript, Node.js, Express, React, MongoDB, Git', 'B.Tech Computer Science (2024)', 'Full Stack Engineer with 2 years of experience building web applications using React, Node.js, and Express.'),
(2, 'Priya Sharma', 'Backend Engineer', 'Technical Round 1', 3.5, 'Python, FastAPI, Django, PostgreSQL, Docker, Redis', 'M.Tech Software Engineering (2023)', 'Backend Developer specializing in high-throughput microservices using Python, FastAPI, and PostgreSQL.'),
(3, 'Arun Kumar', 'Frontend Developer', 'HR Round', 1.5, 'Vue.js 3, TypeScript, Tailwind CSS, Vite', 'B.Sc Computer Science (2025)', 'Frontend Engineer passionate about responsive UX and state management.'),
(4, 'Neha Gupta', 'Senior DevOps Specialist', 'Offered', 5.0, 'Kubernetes, Terraform, AWS, Prometheus', 'B.Tech IT (2021)', 'Cloud DevOps Engineer designing resilient multi-region infrastructure.');

INSERT IGNORE INTO `intern_readiness_scores` (
  `intern_id`, `intern_name`, `intern_email`, `target_role`,
  `project_completion_pct`, `assessment_score`, `cia_usage_hours`, `documentation_quality`,
  `placement_readiness_score`, `placement_grade`,
  `viva_score`, `code_review_score`, `demo_clarity_score`, `git_workflow_score`,
  `interview_readiness_score`, `interview_grade`, `ai_provider`
)
VALUES
(1, 'Murali V', 'murali@cynaris.dev', 'Senior Full Stack Engineer', 94.00, 91.00, 19.50, 92.00, 93.10, 'A', 90.00, 92.00, 89.00, 95.00, 90.90, 'A', 'Groq'),
(2, 'Priya Sharma', 'priya.sharma@cynaris.dev', 'Backend Systems Architect', 88.00, 86.00, 16.00, 84.00, 85.80, 'A', 84.00, 88.00, 82.00, 90.00, 85.40, 'A', 'Groq'),
(3, 'Rahul Kumar', 'rahul.kumar@cynaris.dev', 'Full Stack Developer', 76.00, 74.00, 12.00, 70.00, 72.60, 'B', 72.00, 75.00, 74.00, 80.00, 74.10, 'B', 'Groq'),
(4, 'Arun Kumar', 'arun.kumar@cynaris.dev', 'Frontend Engineer', 62.00, 65.00, 8.00, 58.00, 59.90, 'C', 60.00, 62.00, 65.00, 68.00, 62.40, 'C', 'OpenRouter (Fallback)'),
(5, 'Vikram Nair', 'vikram.nair@cynaris.dev', 'Junior Cloud Intern', 48.00, 50.00, 5.00, 45.00, 45.70, 'D', 46.00, 48.00, 52.00, 55.00, 48.70, 'D', 'Local Deterministic Engine');
