import type { NextApiRequest, NextApiResponse } from 'next';
import { exec } from 'child_process';
import * as util from 'util';
import * as path from 'path';

const execPromise = util.promisify(exec);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Execute the stop script
    const scriptPath = path.join(process.cwd(), 'stop-scheduler.sh');
    
    // Execute the script
    const { stdout, stderr } = await execPromise(`bash ${scriptPath}`);
    
    if (stderr) {
      console.error('Error stopping scheduler:', stderr);
      return res.status(500).json({ error: 'Failed to stop scheduler', stderr });
    }
    
    return res.status(200).json({ 
      success: true, 
      message: 'Scheduler stopped successfully',
      output: stdout
    });
  } catch (error) {
    console.error('Error stopping scheduler:', error);
    return res.status(500).json({ 
      error: 'Failed to stop scheduler',
      message: error instanceof Error ? error.message : String(error)
    });
  }
} 