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
        // Initial scaffold output with hardcoded recruitment & training telemetry
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
     *
     * @return array
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
     *
     * @return bool
     */
    public function instance_allow_multiple() {
        return false;
    }

    /**
     * Indicates whether the block has a global settings page.
     *
     * @return bool
     */
    public function has_config() {
        return false;
    }
}
