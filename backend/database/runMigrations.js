/**
 * runMigrations.js
 * 
 * Standalone database migration runner for Cynaris Recruitment Platform.
 * Executed inside Docker containers or CI/CD pipelines to ensure database
 * tables, indexes, and initial seeds are provisioned before the application starts.
 */

const { mysqlClient } = require('./mysqlClient');

async function main() {
  console.log('================================================================');
  console.log('🚀 Cynaris Platform: Running Database Migrations');
  console.log('================================================================');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Database Host: ${process.env.MYSQL_HOST || process.env.ESPOCRM_DATABASE_HOST || 'localhost'}`);
  console.log(`Database Name: ${process.env.MYSQL_DATABASE || process.env.ESPOCRM_DATABASE_NAME || 'espocrm'}`);

  try {
    const result = await mysqlClient.runMigrations();
    console.log(`\n[SUCCESS] Migrations completed successfully!`);
    console.log(`Statements Executed: ${result.appliedStatements}`);
    console.log(`Database Driver: ${result.driver}`);
    console.log(`Tables Migrated: job_applicant, automation_rules, smart_reminders, audit_logs`);
    console.log('================================================================\n');
    return result;
  } catch (err) {
    console.error(`\n[ERROR] Migration failed:`, err.message);
    if (require.main === module) {
      process.exit(1);
    }
    throw err;
  }
}

if (require.main === module) {
  main().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { main };
