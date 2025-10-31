#!/usr/bin/env node
/**
 * Test script to verify all imports work correctly
 * This doesn't connect to database, just tests syntax and module structure
 */

console.log('🧪 Testing module imports...\n');

async function testImports() {
  const tests = [
    // Core modules
    { name: 'DatabaseManager', path: './src/core/database/DatabaseManager.js' },
    { name: 'QueryBuilder', path: './src/core/database/QueryBuilder.js' },
    { name: 'SchemaBuilder', path: './src/core/database/SchemaBuilder.js' },
    { name: 'MigrationManager', path: './src/core/database/MigrationManager.js' },
    { name: 'ConfigManager', path: './src/core/config/ConfigManager.js' },
    { name: 'ErrorHandler', path: './src/core/errors/ErrorHandler.js' },
    { name: 'AppErrors', path: './src/core/errors/AppError.js' },
    { name: 'Response', path: './src/core/http/Response.js' },
    { name: 'Validator', path: './src/core/validation/Validator.js' },
    { name: 'Security', path: './src/core/security/Security.js' },
    { name: 'BaseModel', path: './src/core/base/BaseModel.js' },
    { name: 'BaseService', path: './src/core/base/BaseService.js' },
    { name: 'BaseController', path: './src/core/base/BaseController.js' },
    { name: 'StorageManager', path: './src/core/storage/StorageManager.js' },
    { name: 'QueueManager', path: './src/core/queue/QueueManager.js' },
    { name: 'AuthMiddleware', path: './src/core/middleware/AuthMiddleware.js' },
    { name: 'EmailService', path: './src/core/email/EmailService.js' },
    { name: 'SessionManager', path: './src/core/session/SessionManager.js' },
    { name: 'Logger', path: './src/core/logging/Logger.js' },
    { name: 'CacheManager', path: './src/core/cache/CacheManager.js' },
    { name: 'NotificationService', path: './src/core/notification/NotificationService.js' },
    { name: 'EventBus', path: './src/core/events/EventBus.js' },

    // Core index
    { name: 'Core Index', path: './src/core/index.js' },

    // Database utilities
    { name: 'Migration', path: './src/database/migrations/001_initial_schema.js' },
    { name: 'Seeder', path: './src/database/seeders/001_initial_data.js' }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      await import(test.path);
      console.log(`✅ ${test.name.padEnd(25)} - OK`);
      passed++;
    } catch (error) {
      console.log(`❌ ${test.name.padEnd(25)} - FAILED`);
      console.log(`   Error: ${error.message}`);
      failed++;
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Total: ${tests.length} | Passed: ${passed} | Failed: ${failed}`);

  if (failed === 0) {
    console.log('\n🎉 All imports successful! Code structure is valid.\n');
    return true;
  } else {
    console.log('\n❌ Some imports failed. Check errors above.\n');
    return false;
  }
}

testImports().then(success => {
  process.exit(success ? 0 : 1);
});
