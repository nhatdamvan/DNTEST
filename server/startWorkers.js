require('dotenv').config();

console.log('Starting workers...');

// Start demographic worker
require('./workers/demographicWorker');
console.log('✅ Demographic worker started');

// Keep the process running
process.on('SIGINT', () => {
  console.log('Shutting down workers...');
  process.exit(0);
});

console.log('Workers are running. Press Ctrl+C to stop.');