# Moodle Block Plugin Architecture Guide — `block_cynaris_stats`

**Author:** Murali  
**Course:** Cynaris Full Stack Development Internship — Project 3: Moodle LMS  
**Component:** `block_cynaris_stats`  
**Plugin Type:** Block Plugin (`blocks/`)  
**Moodle Release Parity:** Moodle 4.3+ (Build: 20231009)  

---

## 1. Overview & Architectural Role

In the Cynaris Recruitment Platform, Moodle serves as the enterprise Learning Management System (LMS) responsible for candidate induction, technical skill assessments (`mod/quiz`), and milestone tracking (`mdl_course_completions`).

To provide candidates and recruiters with immediate visibility into learning progress directly from their primary Moodle dashboard (`/my/`), we developed **`block_cynaris_stats`** — a modular Moodle block plugin following official Moodle Block development guidelines:
- **Pluggable Architecture:** Self-contained within `blocks/cynaris_stats/` without modifying core Moodle kernel files.
- **Frankenstyle Convention:** Conforms to Moodle's standardized component naming: `block_cynaris_stats`.
- **Headless Upgradability:** Fully discoverable and installable through the Moodle command-line interface via `php admin/cli/upgrade.php`.
- **Initial Scaffold Presentation:** In accordance with sprint objectives, `get_content()` initially delivers structured, styled recruitment and candidate training telemetry.

---

## 2. Plugin Directory Structure

```text
blocks/cynaris_stats/
├── block_cynaris_stats.php        # Primary controller class extending block_base
├── version.php                    # Plugin metadata, component name & compatibility
├── db/
│   └── access.php                 # Moodle capabilities & RBAC permissions
└── lang/
    └── en/
        └── block_cynaris_stats.php # Internationalized English language string catalog
```

*(Note: In the Cynaris repository, the plugin is maintained in both `blocks/cynaris_stats/` and `moodle/blocks/cynaris_stats/` to ensure parity across local CLI utilities, Docker mounts, and testing suites).*

---

## 3. Code Implementation & File Walkthrough

### 1. `block_cynaris_stats.php` — Core Block Controller

The controller defines the block's lifecycle contracts by subclassing Moodle's core `block_base`:

```php
<?php
// Moodle Block Plugin: Cynaris Recruitment & Training Statistics
// Plugin Name: block_cynaris_stats
// Core Moodle Block Architecture: https://docs.moodle.org/dev/Blocks

defined('MOODLE_INTERNAL') || define('MOODLE_INTERNAL', true);

class block_cynaris_stats extends block_base {

    /**
     * Initialize block attributes and title.
     */
    public function init() {
        $this->title = get_string('pluginname', 'block_cynaris_stats');
    }

    /**
     * Generate and return block content.
     * Initially returns hardcoded statistics content string as specified in the scaffold task,
     * with structured presentation for candidate onboarding metrics.
     *
     * @return stdClass Block content object containing text and footer.
     */
    public function get_content() {
        global $USER, $DB;

        // Content caching check — avoid regenerating if already populated
        if ($this->content !== null) {
            return $this->content;
        }

        $this->content = new stdClass();
        $this->content->text = '';
        $this->content->footer = '';

        // Scaffold statistics content
        $html = '<div class="cynaris-stats-block" style="font-family: inherit; font-size: 13px; line-height: 1.5;">';
        $html .= '<div style="padding: 10px; background: #f8fafc; border-left: 4px solid #0284c7; border-radius: 4px; margin-bottom: 8px;">';
        $html .= '<strong style="color: #0f172a; font-size: 14px;">' . get_string('stats_summary', 'block_cynaris_stats') . '</strong>';
        $html .= '</div>';
        $html .= '<ul style="list-style: none; padding-left: 0; margin: 0 0 10px 0;">';
        $html .= '<li style="padding: 4px 0; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between;">';
        $html .= '<span>👥 ' . get_string('active_candidates', 'block_cynaris_stats') . ':</span>';
        $html .= '<strong style="color: #0284c7;">5 Active</strong>';
        $html .= '</li>';
        $html .= '<li style="padding: 4px 0; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between;">';
        $html .= '<span>📚 ' . get_string('completed_courses', 'block_cynaris_stats') . ':</span>';
        $html .= '<strong style="color: #10b981;">3 Completed</strong>';
        $html .= '</li>';
        $html .= '<li style="padding: 4px 0; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between;">';
        $html .= '<span>📊 ' . get_string('average_assessment_score', 'block_cynaris_stats') . ':</span>';
        $html .= '<strong style="color: #6366f1;">91.0% Avg</strong>';
        $html .= '</li>';
        $html .= '<li style="padding: 4px 0; display: flex; justify-content: space-between;">';
        $html .= '<span>🚀 ' . get_string('onboarding_readiness', 'block_cynaris_stats') . ':</span>';
        $html .= '<strong style="color: #059669;">95% Ready</strong>';
        $html .= '</li>';
        $html .= '</ul>';
        $html .= '<div style="background: #e2e8f0; border-radius: 4px; height: 8px; overflow: hidden; margin-bottom: 6px;">';
        $html .= '<div style="background: #10b981; width: 95%; height: 100%;"></div>';
        $html .= '</div>';
        $html .= '<small style="color: #64748b;">Cynaris Talent Intelligence • Scaffold Active</small>';
        $html .= '</div>';

        $this->content->text = $html;
        $this->content->footer = '<div style="text-align: right; margin-top: 6px;"><a href="/my/" style="font-size: 11px; color: #0284c7; text-decoration: none;">' . get_string('view_dashboard', 'block_cynaris_stats') . ' &rarr;</a></div>';

        return $this->content;
    }

    /**
     * Formats and pages where this block is applicable.
     */
    public function applicable_formats() {
        return [
            'all' => true,
            'my' => true,
            'course-view' => true,
            'site' => true,
        ];
    }

    /**
     * Prevent multiple instances of this block on the same page.
     */
    public function instance_allow_multiple() {
        return false;
    }

    /**
     * Indicates whether the block has a global settings page.
     */
    public function has_config() {
        return false;
    }
}
```

---

### 2. `version.php` — Plugin Metadata & Moodle Requirements

Declares plugin release number, maturity level, and minimum required Moodle engine build:

```php
<?php
// Moodle Block Plugin Version Specification
// Component: block_cynaris_stats
// Standard Moodle version format: YYYYMMDDXX

defined('MOODLE_INTERNAL') || define('MOODLE_INTERNAL', true);

$plugin->component = 'block_cynaris_stats';
$plugin->version   = 2023100900;       // Plugin release date + 2-digit counter
$plugin->requires  = 2023042400;       // Requires Moodle 4.2+ (Build: 20230424)
$plugin->maturity  = MATURITY_STABLE;  // Stable production release
$plugin->release   = 'v1.0.0';         // Semantic version
```

---

### 3. `lang/en/block_cynaris_stats.php` — Internationalized Language Pack

Eliminates hardcoded UI strings, preparing the block for localization across multiple languages:

```php
<?php
// English Language Strings for block_cynaris_stats
// Frankenstyle: block_cynaris_stats

defined('MOODLE_INTERNAL') || define('MOODLE_INTERNAL', true);

$string['pluginname'] = 'Cynaris Recruitment & Training Stats';
$string['cynaris_stats:addinstance'] = 'Add a new Cynaris Stats block';
$string['cynaris_stats:myaddinstance'] = 'Add a new Cynaris Stats block to My Moodle';
$string['stats_summary'] = 'Cynaris Candidate & Training Telemetry';
$string['active_candidates'] = 'Active Enrolled Candidates';
$string['completed_courses'] = 'Completed Induction Courses';
$string['average_assessment_score'] = 'Average Assessment Score';
$string['onboarding_readiness'] = 'Candidate Onboarding Readiness';
$string['view_dashboard'] = 'Open Recruiter Dashboard';
$string['default_scaffold_content'] = 'Cynaris Stats: 5 Enrolled Candidates, 3 Active Courses, 91.0% Avg Score.';
```

---

### 4. `db/access.php` — Role-Based Access Control & Capabilities

Defines granular capabilities for regular candidates (adding the block to their personal My Moodle dashboard) and course managers/teachers (placing the block on course and site views):

```php
<?php
// Moodle Block Capabilities Definition for block_cynaris_stats
// Defines access control permissions for adding and managing block instances

defined('MOODLE_INTERNAL') || define('MOODLE_INTERNAL', true);

$capabilities = [
    'block/cynaris_stats:myaddinstance' => [
        'captype' => 'write',
        'contextlevel' => CONTEXT_SYSTEM,
        'archetypes' => [
            'user' => CAP_ALLOW,
        ],
        'clonepermissionsfrom' => 'moodle/my:manageblocks',
    ],
    'block/cynaris_stats:addinstance' => [
        'riskbitmask' => RISK_SPAM | RISK_XSS,
        'captype' => 'write',
        'contextlevel' => CONTEXT_BLOCK,
        'archetypes' => [
            'editingteacher' => CAP_ALLOW,
            'manager' => CAP_ALLOW,
        ],
        'clonepermissionsfrom' => 'moodle/site:manageblocks',
    ],
];
```

---

## 4. Headless CLI Upgrade Execution (`admin/cli/upgrade.php`)

In production environments, running `php admin/cli/upgrade.php` executes the plugin discovery, database version registration, capability compilation, and cache purging without requiring interactive browser sessions.

### CLI Execution Command:
```bash
php admin/cli/upgrade.php
# Or using the Cynaris NPM script:
npm run moodle:upgrade
```

### CLI Upgrade Console Output:
```text
== Moodle Command Line Upgrade Utility ==
Moodle Release: 4.3+ (Build: 20231009)
Scanning codebase for newly scaffolded plugins and database migrations...

--> Discovered 2 block plugins in codebase:
  • block_cynaris_stats (version: 2023100900, release: v1.0.0)
  • block_cynaris_tracker (version: 2023100900, release: v1.0.0)

--> Upgrading block_cynaris_stats...
    [DB] Registering component 'block_cynaris_stats' into mdl_config_plugins
    [DB] Setting block_cynaris_stats version to 2023100900
    [CAPABILITIES] Compiling default access permissions (myaddinstance, addinstance)
    [STRINGS] Cached English language catalog for block_cynaris_stats
    --> SUCCESS: block_cynaris_stats successfully installed & enabled!

--> Purging Moodle Universal Caches (MUC)...
--> Cache cleared.
== System upgrade completed successfully ==
```

---

## 5. Visual Dashboard Rendering

When enabled on the Moodle Dashboard (`http://localhost:8000/my/`), `block_cynaris_stats` renders cleanly in the right-hand sidebar column:

```text
+---------------------------------------------------------------------------------------------------------+
|  🎓 Cynaris Recruitment & Learning Management System                             [👤 Murali | ⚙️ Setup]  |
+---------------------------------------------------------------------------------------------------------+
|  [ Dashboard ]  [ 📚 My Courses ]  [ 👥 Candidates ]  [ 📝 Assessments ]  [ 📊 Reports ]  [ ⚙️ Admin ]     |
+--------------------------------------------------------------------+------------------------------------+
|  MAIN DASHBOARD CONTENT                                            |  SIDEBAR BLOCKS                    |
|                                                                    |                                    |
|  📚 WELCOME BACK, MURALI                                           |  +------------------------------+  |
|  You have 3 active training modules assigned for your internship.   |  | Cynaris Recruitment & Stats  |  |
|                                                                    |  +------------------------------+  |
|  Active Enrolled Courses:                                          |  | Cynaris Candidate Telemetry  |  |
|  1. Full Stack Developer Internship — Induction (CYN-FS-101)       |  | • 👥 Active Candidates: 5    |  |
|     Progress: 100% [Completed] • Grade: 96.5%                      |  | • 📚 Courses Completed: 3   |  |
|                                                                    |  | • 📊 Avg Assessment: 91.0%  |  |
|  2. Enterprise CRM & EspoCRM Integration (CYN-CRM-102)             |  | • 🚀 Readiness: 95% Ready    |  |
|     Progress: 100% [Completed] • Grade: 90.0%                      |  | [============ 95% ========]  |  |
|                                                                    |  |                              |  |
|  3. Production DevOps — Docker & CI/CD Pipelines (CYN-OPS-103)      |  | Scaffold Active              |  |
|     Progress: 100% [Completed] • Grade: 88.0%                      |  |       Open Dashboard ->      |  |
|                                                                    |  +------------------------------+  |
+--------------------------------------------------------------------+------------------------------------+
```

---

## 6. Cynaris REST API Bridge Integration

The Cynaris platform integrates with Moodle block plugins via [`backend/routes/moodleRouter.js`](../backend/routes/moodleRouter.js):

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/moodle/blocks` | **GET** | Scans codebase and returns all discovered Moodle block plugins with versions and capability flags. |
| `/api/moodle/blocks/cynaris_stats` | **GET** | Retrieves rendered HTML content, metrics, formats, and title for `block_cynaris_stats`. |
| `/api/moodle/admin/upgrade` | **POST** | Triggers headless CLI upgrade execution and returns registration status. |

### Sample Response (`GET /api/moodle/blocks/cynaris_stats`):
```json
{
  "success": true,
  "component": "block_cynaris_stats",
  "title": "Cynaris Recruitment & Training Stats",
  "content": {
    "text": "<div class=\"cynaris-stats-block\" ...> ... </div>",
    "footer": "<div style=\"text-align: right; margin-top: 6px;\"><a href=\"/my/\">Open Recruiter Dashboard &rarr;</a></div>"
  },
  "metrics": {
    "activeCandidates": 5,
    "completedCourses": 3,
    "averageAssessmentScore": "91.0%",
    "onboardingReadiness": "95%"
  },
  "formats": {
    "all": true,
    "my": true,
    "course-view": true,
    "site": true
  },
  "scaffoldMode": true
}
```
