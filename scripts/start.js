#!/usr/bin/env node
const { execSync } = require('child_process');

console.log('[Startup] Running database migrations...');

try {
  execSync('npx prisma db push', { 
    stdio: 'inherit',
    env: process.env 
  });
  console.log('[Startup] Database migrations complete');
} catch (error) {
  console.error('[Startup] Migration failed:', error.message);
  // Continue anyway - tables might already exist
}

console.log('[Startup] Starting Next.js server...');
execSync('npx next start', { 
  stdio: 'inherit',
  env: process.env 
});
