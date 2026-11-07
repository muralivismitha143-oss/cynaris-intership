<?php  // Moodle configuration file

unset($CFG);
global $CFG;
$CFG = new stdClass();

$CFG->dbtype    = getenv('MOODLE_DOCKER_DB') ?: 'pgsql';
$CFG->dblibrary = 'native';
$CFG->dbhost    = getenv('MOODLE_DOCKER_DB_HOST') ?: 'moodle-db';
$CFG->dbname    = getenv('MOODLE_DOCKER_DB_NAME') ?: 'moodle';
$CFG->dbuser    = getenv('MOODLE_DOCKER_DB_USER') ?: 'moodle';
$CFG->dbpass    = getenv('MOODLE_DOCKER_DB_PASSWORD') ?: 'moodle_secret_pw';
$CFG->prefix    = 'mdl_';
$CFG->dboptions = array (
  'dbpersist' => 0,
  'dbport' => getenv('MOODLE_DOCKER_DB_PORT') ?: 5432,
  'dbsocket' => '',
);

$CFG->wwwroot   = getenv('MOODLE_DOCKER_WWWROOT') ?: 'http://localhost:8000';
$CFG->dataroot  = getenv('MOODLE_DOCKER_DATAROOT') ?: '/var/www/moodledata';
$CFG->admin     = 'admin';

$CFG->directorypermissions = 02777;

// Prevent local debugging warnings in automated test runners if setup.php is not yet loaded
if (file_exists(__DIR__ . '/lib/setup.php')) {
    require_once(__DIR__ . '/lib/setup.php');
}
