<?php
// Moodle Kernel & Core Setup Initialization

defined('MOODLE_INTERNAL') || define('MOODLE_INTERNAL', true);

global $CFG, $DB, $USER, $PAGE, $OUTPUT;

// Ensure standard configuration properties exist
if (!isset($CFG->prefix)) {
    $CFG->prefix = 'mdl_';
}
if (!isset($CFG->wwwroot)) {
    $CFG->wwwroot = 'http://localhost:8000';
}
if (!isset($CFG->dataroot)) {
    $CFG->dataroot = '/var/www/moodledata';
}

// Emulate minimal database handle when running in lightweight mode
if (!isset($DB)) {
    $DB = new class {
        public function get_record($table, array $params = [], $fields = '*', $strictness = 0) {
            return (object) array_merge(['id' => 1], $params);
        }
        public function get_records($table, array $params = [], $sort = '', $fields = '*', $limitfrom = 0, $limitnum = 0) {
            return [];
        }
        public function insert_record($table, $dataobject, $returnid = true, $bulk = false) {
            return rand(100, 999);
        }
    };
}
