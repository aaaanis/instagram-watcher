import type { NextApiRequest, NextApiResponse } from 'next';
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';

const readFile = util.promisify(fs.readFile);
const access = util.promisify(fs.access);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Check if the scheduler PID file exists
    const pidFilePath = path.join(process.cwd(), 'scheduler.pid');
    let isRunning = false;
    let pid: string | null = null;
    let lastActive: string | null = null;
    
    // Initialize next run variables
    let nextFollowingsRun: Date | null = null;
    let nextEventDetectorRun: Date | null = null;
    
    try {
      // Check if PID file exists and is readable
      await access(pidFilePath, fs.constants.R_OK);
      
      // Read PID file to get the PID
      pid = (await readFile(pidFilePath, 'utf8')).trim();
      
      // Try to check if the process is running
      if (pid) {
        // On UNIX systems, you can check if a process is running by checking /proc/{pid}
        // On Windows, you would use a different approach
        // Here we'll just check if the PID file exists and has valid content
        isRunning = true;
      }
    } catch (error) {
      // PID file doesn't exist or isn't readable
      isRunning = false;
      pid = null;
    }
    
    // Try to get last active time and next run times from the log file
    const logFilePath = path.join(process.cwd(), 'scheduler.log');
    
    try {
      // Check if log file exists and is readable
      await access(logFilePath, fs.constants.R_OK);
      
      // Read log file to get last activity and scheduled runs
      const logContent = await readFile(logFilePath, 'utf8');
      const logLines = logContent.split('\n').filter(line => line.trim());
      
      if (logLines.length > 0) {
        // Extract timestamp from the last log line for last active time
        const lastLine = logLines[logLines.length - 1];
        const timestampMatch = lastLine.match(/\[(.*?)\]/);
        if (timestampMatch) {
          lastActive = timestampMatch[1];
        }
        
        // Find the latest next followings retrieval schedule
        let foundFollowingsSchedule = false;
        for (let i = logLines.length - 1; i >= 0; i--) {
          const line = logLines[i];
          if (line.includes('Scheduled next followings retrieval in')) {
            const dateMatch = line.match(/at (\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z)/);
            if (dateMatch) {
              nextFollowingsRun = new Date(dateMatch[1]);
              foundFollowingsSchedule = true;
              break;
            }
          }
        }
        
        // If no followings schedule was found, calculate a default one
        if (!foundFollowingsSchedule && isRunning) {
          // Default to every 6 hours from now if not found in logs
          const now = new Date();
          nextFollowingsRun = new Date(now);
          nextFollowingsRun.setHours(now.getHours() + 6);
        }
        
        // Find the latest next event detection schedule (cron-based, every 2 hours)
        // Since this is scheduled via cron, we need to calculate when the next run will be
        if (isRunning) {
          const now = new Date();
          const currentHour = now.getHours();
          const nextHour = (Math.floor(currentHour / 2) * 2 + 2) % 24;
          nextEventDetectorRun = new Date(now);
          nextEventDetectorRun.setHours(nextHour, 0, 0, 0);
          if (nextEventDetectorRun <= now) {
            nextEventDetectorRun.setDate(nextEventDetectorRun.getDate() + 1);
          }
        }
      }
    } catch (error) {
      // Log file doesn't exist or isn't readable
      // Use current time as fallback
      lastActive = new Date().toISOString();
      
      // Generate default schedules if the scheduler is running
      if (isRunning) {
        const now = new Date();
        
        // Default followings retrieval: 4 hours from now
        nextFollowingsRun = new Date(now);
        nextFollowingsRun.setHours(now.getHours() + 4);
        
        // Default event detection: next even hour
        const currentHour = now.getHours();
        const nextHour = (Math.floor(currentHour / 2) * 2 + 2) % 24;
        nextEventDetectorRun = new Date(now);
        nextEventDetectorRun.setHours(nextHour, 0, 0, 0);
        if (nextEventDetectorRun <= now) {
          nextEventDetectorRun.setDate(nextEventDetectorRun.getDate() + 1);
        }
      }
    }
    
    // Send the response
    return res.status(200).json({
      isRunning,
      pid,
      lastActive,
      nextRun: {
        followings: nextFollowingsRun ? nextFollowingsRun.toISOString() : null,
        eventDetector: nextEventDetectorRun ? nextEventDetectorRun.toISOString() : null
      }
    });
  } catch (error) {
    console.error('Error checking scheduler status:', error);
    return res.status(500).json({ error: 'Failed to check scheduler status' });
  }
} 