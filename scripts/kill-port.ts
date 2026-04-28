#!/usr/bin/env node
/**
 * Cross-platform utility to kill a process on a specific port.
 * Works on Linux, macOS, and Windows.
 * Usage: node kill-port.js <port>
 */

import { exec } from 'child_process';
import os from 'os';

const port: string = process.argv[2] || '';

if (!port) {
  console.error('Usage: node kill-port.js <port>');
  process.exit(1);
}

const platform: string = os.platform();
let command: string;

if (platform === 'win32') {
  // Windows
  command = `netstat -ano | findstr :${port} | for /f "tokens=5" %a in ('findstr :${port}') do taskkill /PID %a /F`;
} else if (platform === 'darwin' || platform === 'linux') {
  // macOS and Linux
  command = `lsof -ti :${port} | xargs kill -9 2>/dev/null || true`;
} else {
  console.error(`Unsupported platform: ${platform}`);
  process.exit(1);
}

exec(command, (error: Error | null) => {
  // Don't fail if no process is found on the port
  if (error && !error.message.includes('No such process')) {
    console.error(`Error: ${error.message}`);
    // Don't exit with error code - port might have just been free
  }
});

export {};
