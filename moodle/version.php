<?php
// Moodle Version Specification
// This file defines the current version of the Moodle code that is being used.

defined('MOODLE_INTERNAL') || define('MOODLE_INTERNAL', true);

$version  = 2023100900.00;             // 20231009      = Branch release date YYYYMMDD
                                       //         .00   = Micro version within branch.
$release  = '4.3+ (Build: 20231009)';  // Human-friendly version name.
$branch   = '403';                     // This version's branch.
$maturity = 200;                       // MATURITY_STABLE.
$requires = 2023042400;                // Requires this Moodle version.
