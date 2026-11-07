<?php
// Moodle Core Activity Module: Quiz Subsystem
// File: mod/quiz/lib.php

defined('MOODLE_INTERNAL') || define('MOODLE_INTERNAL', true);

/**
 * Given an object containing all the necessary data,
 * (defined by the form in mod_form.php) this function
 * will create a new instance and return the id number of the new instance.
 *
 * @param stdClass $quiz An object from the form in mod_form.php
 * @return int The id of the newly inserted quiz record
 */
function quiz_add_instance(stdClass $quiz) {
    global $DB;
    $quiz->timecreated = time();
    $quiz->timemodified = $quiz->timecreated;
    return $DB->insert_record('quiz', $quiz);
}

/**
 * Given an object containing all the necessary data,
 * (defined by the form in mod_form.php) this function
 * will update an existing instance with new data.
 *
 * @param stdClass $quiz An object from the form in mod_form.php
 * @return bool Success status
 */
function quiz_update_instance(stdClass $quiz) {
    global $DB;
    $quiz->timemodified = time();
    $quiz->id = $quiz->instance;
    return $DB->update_record('quiz', $quiz);
}

/**
 * Given an ID of an instance of this module,
 * this function will permanently delete the instance
 * and any data that depends on it.
 *
 * @param int $id Id of the module instance
 * @return bool Success status
 */
function quiz_delete_instance($id) {
    global $DB;
    if (!$quiz = $DB->get_record('quiz', ['id' => $id])) {
        return false;
    }
    $DB->delete_records('quiz_attempts', ['quiz' => $quiz->id]);
    $DB->delete_records('quiz_grades', ['quiz' => $quiz->id]);
    $DB->delete_records('quiz', ['id' => $quiz->id]);
    return true;
}

/**
 * Return grade for given user or all users.
 *
 * @param stdClass $quiz object
 * @param int $userid optional user id, 0 means all users
 * @return array array of grades, false if none
 */
function quiz_get_user_grades($quiz, $userid = 0) {
    global $DB;
    $params = ['quizid' => $quiz->id];
    $userclause = '';
    if ($userid > 0) {
        $params['userid'] = $userid;
        $userclause = ' AND userid = :userid';
    }
    return $DB->get_records_select('quiz_grades', "quiz = :quizid $userclause", $params);
}

/**
 * Update grades in the Moodle central gradebook.
 *
 * @param stdClass $quiz
 * @param int $userid
 * @param bool $nullifnone
 */
function quiz_update_grades($quiz, $userid = 0, $nullifnone = true) {
    global $CFG, $DB;
    // Bridges module grades into mdl_grade_grades
    $grades = quiz_get_user_grades($quiz, $userid);
    return !empty($grades);
}
