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
