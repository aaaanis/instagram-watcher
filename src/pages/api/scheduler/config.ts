import type { NextApiRequest, NextApiResponse } from 'next';
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';

const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const access = util.promisify(fs.access);

// Default configuration
const defaultConfig = {
  followingsMinIntervalHours: 3.5,
  followingsMaxIntervalHours: 4.5,
  eventDetectorIntervalHours: 2,
  postsPerAccount: 5,
  minConfidenceThreshold: 90,
  maxRetries: 3,
  retryDelay: 5000
};

// Config file path
const CONFIG_FILE = path.join(process.cwd(), 'scheduler-config.json');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'GET':
      return handleGetConfig(req, res);
    case 'POST':
      return handleSetConfig(req, res);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * Handle GET request to retrieve current configuration
 */
async function handleGetConfig(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Try to read config file
    try {
      await access(CONFIG_FILE, fs.constants.R_OK);
      
      // File exists, read it
      const configData = await readFile(CONFIG_FILE, 'utf8');
      const config = JSON.parse(configData);
      
      return res.status(200).json(config);
    } catch (error) {
      // File doesn't exist or isn't readable, return default config
      console.log('Config file not found, using defaults');
      
      // Create default config file for future use
      await writeFile(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2), 'utf8');
      
      return res.status(200).json(defaultConfig);
    }
  } catch (error) {
    console.error('Error reading config:', error);
    return res.status(500).json({ error: 'Failed to read configuration' });
  }
}

/**
 * Handle POST request to update configuration
 */
async function handleSetConfig(req: NextApiRequest, res: NextApiResponse) {
  try {
    const newConfig = req.body;
    
    // Validate the configuration
    if (!validateConfig(newConfig)) {
      return res.status(400).json({ error: 'Invalid configuration format' });
    }
    
    // Save to config file
    await writeFile(CONFIG_FILE, JSON.stringify(newConfig, null, 2), 'utf8');
    
    // Update the scheduler script to use the new configuration
    // For a real implementation, you would modify environment variables or script parameters
    
    return res.status(200).json({ 
      success: true, 
      message: 'Configuration updated successfully',
      config: newConfig
    });
  } catch (error) {
    console.error('Error saving config:', error);
    return res.status(500).json({ 
      error: 'Failed to save configuration',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Validate configuration object
 */
function validateConfig(config: any): boolean {
  if (!config || typeof config !== 'object') return false;
  
  // Required fields
  const requiredFields = [
    'followingsMinIntervalHours',
    'followingsMaxIntervalHours',
    'eventDetectorIntervalHours',
    'postsPerAccount',
    'minConfidenceThreshold',
    'maxRetries',
    'retryDelay'
  ];
  
  // Check if all required fields exist and have the right type
  for (const field of requiredFields) {
    if (!(field in config) || typeof config[field] !== 'number') {
      return false;
    }
  }
  
  // Domain-specific validations
  if (config.followingsMinIntervalHours >= config.followingsMaxIntervalHours) return false;
  if (config.followingsMinIntervalHours < 1) return false;
  if (config.eventDetectorIntervalHours < 0.5) return false;
  if (config.postsPerAccount < 1 || config.postsPerAccount > 100) return false;
  if (config.minConfidenceThreshold < 50 || config.minConfidenceThreshold > 100) return false;
  if (config.maxRetries < 1 || config.maxRetries > 100) return false;
  if (config.retryDelay < 1000) return false;
  
  return true;
} 