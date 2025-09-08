/**
 * Test Runner Script
 * This file helps organize and run different test suites
 */

const { execSync } = require('child_process');

const testSuites = {
  contexts: 'frontend/src/__tests__/contexts/**/*.test.{js,jsx}',
  hooks: 'frontend/src/__tests__/hooks/**/*.test.{js,jsx}',
  components: 'frontend/src/__tests__/components/**/*.test.{js,jsx}',
  utils: 'frontend/src/__tests__/utils/**/*.test.{js,jsx}',
  integration: 'frontend/src/__tests__/integration/**/*.test.{js,jsx}',
  all: 'frontend/src/__tests__/**/*.test.{js,jsx}'
};

function runTests(suite = 'all', options = '') {
  const testPath = testSuites[suite] || testSuites.all;
  const command = `npm test -- ${testPath} ${options}`;
  
  console.log(`Running tests for: ${suite}`);
  console.log(`Command: ${command}`);
  
  try {
    execSync(command, { stdio: 'inherit' });
  } catch (error) {
    console.error(`Tests failed for ${suite}:`, error.message);
    process.exit(1);
  }
}

function runCoverage() {
  console.log('Running test coverage...');
  try {
    execSync('npm run test:coverage', { stdio: 'inherit' });
  } catch (error) {
    console.error('Coverage failed:', error.message);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const suite = args[0] || 'all';
const options = args.slice(1).join(' ');

if (suite === 'coverage') {
  runCoverage();
} else {
  runTests(suite, options);
}

module.exports = { runTests, runCoverage, testSuites };