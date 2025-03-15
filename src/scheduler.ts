#!/usr/bin/env ts-node
/**
 * Script to schedule the execution of Instagram scripts with proper intervals
 */

import * as schedule from 'node-schedule';
import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { promisify } from 'util';

// Load environment variables
dotenv.config();

// Convert exec to promise-based
const execPromise = promisify(exec);

// Constants
const EVENT_DETECTOR_INTERVAL_HOURS = 2;                   // Run every 2 hours
const FOLLOWINGS_MIN_INTERVAL_HOURS = 3.5;                // Min interval: 3.5 hours
const FOLLOWINGS_MAX_INTERVAL_HOURS = 4.5;                // Max interval: 4.5 hours

// Configure process ID
const PID_FILE = path.join(process.cwd(), 'scheduler.pid');
fs.writeFileSync(PID_FILE, process.pid.toString());

// Clean up on exit
process.on('exit', () => {
  try {
    if (fs.existsSync(PID_FILE)) {
      fs.unlinkSync(PID_FILE);
    }
    console.log(`[${new Date().toISOString()}] [INFO] Scheduler shutting down`);
  } catch (err) {
    // Fail silently on exit
  }
});

// Catch termination signals
process.on('SIGINT', () => {
  console.log(`[${new Date().toISOString()}] [INFO] Received SIGINT signal`);
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(`[${new Date().toISOString()}] [INFO] Received SIGTERM signal`);
  process.exit(0);
});

/**
 * Log a message with timestamp and level
 */
function log(message: string, level: 'INFO' | 'WARN' | 'ERROR' = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  
  // Log to console with color
  if (level === 'ERROR') {
    console.error(`\x1b[31m${logMessage}\x1b[0m`); // Red for errors
  } else if (level === 'WARN') {
    console.warn(`\x1b[33m${logMessage}\x1b[0m`); // Yellow for warnings
  } else {
    console.log(`\x1b[36m${logMessage}\x1b[0m`); // Cyan for info
  }
}

/**
 * Execute a script and log its output
 */
async function executeScript(scriptName: string, args: string[] = []): Promise<void> {
  const scriptPath = path.join(__dirname, scriptName);
  const command = `npx ts-node --transpile-only ${scriptPath} ${args.join(' ')}`;
  
  log(`Executing: ${command}`);
  
  try {
    const { stdout, stderr } = await execPromise(command);
    
    if (stdout) {
      log(`[${scriptName}] Output: ${stdout.trim()}`);
    }
    
    if (stderr) {
      log(`[${scriptName}] Error: ${stderr.trim()}`, 'ERROR');
    }
    
    log(`Finished executing: ${scriptName}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`Error executing ${scriptName}: ${errorMessage}`, 'ERROR');
  }
}

/**
 * Schedule the followings retrieval job with random interval
 */
function scheduleFollowingsJob(): void {
  const randomizeInterval = () => {
    // Calculate random interval in milliseconds between min and max
    const minMs = FOLLOWINGS_MIN_INTERVAL_HOURS * 60 * 60 * 1000;
    const maxMs = FOLLOWINGS_MAX_INTERVAL_HOURS * 60 * 60 * 1000;
    return minMs + Math.random() * (maxMs - minMs);
  };

  const scheduleNext = () => {
    const intervalMs = randomizeInterval();
    const nextRun = new Date(Date.now() + intervalMs);
    const hours = (intervalMs / (1000 * 60 * 60)).toFixed(2);
    
    log(`Scheduled next followings retrieval in ${hours} hours at ${nextRun.toISOString()}`);
    
    setTimeout(() => {
      executeScript('get-followings.ts')
        .finally(() => {
          scheduleNext(); // Schedule the next run after completion
        });
    }, intervalMs);
  };

  // Start the first run immediately, then schedule the next run
  log('Starting initial followings retrieval...');
  executeScript('get-followings.ts')
    .finally(() => {
      scheduleNext();
    });
}

/**
 * Schedule the event detector job to run every 2 hours
 */
function scheduleEventDetectorJob(): void {
  // Schedule to run every 2 hours
  schedule.scheduleJob(`0 */2 * * *`, async () => {
    log('Running scheduled event detection...');
    await executeScript('event-detector.ts', []);
  });
  
  log(`Event detector scheduled to run every ${EVENT_DETECTOR_INTERVAL_HOURS} hours`);
  
  // Also run it immediately on startup
  log('Starting initial event detection...');
  executeScript('event-detector.ts', []);
}

/**
 * Main function to start all schedulers
 */
function main(): void {
  log('Instagram script scheduler starting...');
  
  // Schedule both jobs
  scheduleFollowingsJob();
  scheduleEventDetectorJob();
  
  log('Scheduler initialized and running...');
}

// Run the scheduler
main(); 