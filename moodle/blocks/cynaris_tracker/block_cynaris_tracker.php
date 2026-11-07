<?php
// Moodle Block Plugin: Candidate Training Progress Tracker
// Plugin Name: block_cynaris_tracker

defined('MOODLE_INTERNAL') || define('MOODLE_INTERNAL', true);

class block_cynaris_tracker extends block_base {
    public function init() {
        $this->title = get_string('pluginname', 'block_cynaris_tracker');
    }

    public function get_content() {
        global $USER, $DB;

        if ($this->content !== null) {
            return $this->content;
        }

        $this->content = new stdClass();
        $this->content->text = '';
        $this->content->footer = '';

        if (!isloggedin() || isguestuser()) {
            $this->content->text = '<p>' . get_string('login_required', 'block_cynaris_tracker') . '</p>';
            return $this->content;
        }

        // Query candidate course completions and quiz scores
        $completedCourses = $DB->get_records('course_completions', ['userid' => $USER->id, 'status' => 1]);
        $grades = $DB->get_records('grade_grades', ['userid' => $USER->id]);

        $html = '<div class="cynaris-tracker-block">';
        $html .= '<p><strong>Candidate:</strong> ' . htmlspecialchars($USER->firstname . ' ' . $USER->lastname) . '</p>';
        $html .= '<p><strong>Completed Courses:</strong> ' . count($completedCourses) . '</p>';
        $html .= '<p><strong>Quiz Assessments Taken:</strong> ' . count($grades) . '</p>';
        $html .= '<div class="progress" style="background:#e2e8f0; border-radius:4px; height:12px; margin-top:8px;">';
        $html .= '<div style="background:#0284c7; width:75%; height:100%; border-radius:4px;"></div>';
        $html .= '</div>';
        $html .= '<small style="color:#64748b;">Overall Onboarding Readiness: 75%</small>';
        $html .= '</div>';

        $this->content->text = $html;
        $this->content->footer = '<a href="/blocks/cynaris_tracker/view.php">View Detailed Viva Report</a>';

        return $this->content;
    }

    public function applicable_formats() {
        return [
            'all' => true,
            'my' => true,
            'course-view' => true,
        ];
    }
}
