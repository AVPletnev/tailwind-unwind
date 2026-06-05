#!/usr/bin/env node

import('../dist/cli/index.js').catch((error) => {
  console.error('Failed to start tailwind-unwind:', error);
  process.exit(1);
});
