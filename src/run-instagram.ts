#!/usr/bin/env ts-node
/**
 * Script to run the Instagram data fetcher with command-line arguments
 * Usage:
 *   ts-node src/run-instagram.ts [--max-users=10] [--posts-per-user=2]
 */

import * as dotenv from 'dotenv';
import { getInstagramData } from './instagram';
import * as fs from 'fs';

// Load environment variables
dotenv.config();

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options: { [key: string]: number } = {
    maxUsers: 10,
    postsPerUser: 2,
  };

  args.forEach(arg => {
    const match = arg.match(/^--([a-z-]+)=(\d+)$/);
    if (match) {
      const [, key, value] = match;
      switch (key) {
        case 'max-users':
          options.maxUsers = parseInt(value, 10);
          break;
        case 'posts-per-user':
          options.postsPerUser = parseInt(value, 10);
          break;
      }
    }
  });

  return options;
}

async function main() {
  try {
    const options = parseArgs();
    const username = process.env.INSTAGRAM_USERNAME;
    const password = process.env.INSTAGRAM_PASSWORD;

    if (!username || !password) {
      console.error('Error: Instagram credentials not found in environment variables.');
      console.error('Please set INSTAGRAM_USERNAME and INSTAGRAM_PASSWORD in your .env file.');
      process.exit(1);
    }

    console.log(`
Instagram Data Fetcher
=====================
Username: ${username}
Max users to process: ${options.maxUsers === 0 ? 'All' : options.maxUsers}
Posts per user: ${options.postsPerUser}
`);

    console.log('Starting data collection...');
    const data = await getInstagramData(username, password, options.maxUsers, options.postsPerUser);
    
    console.log(`\nResults: ${data.length} users processed`);
    
    // Count total posts fetched
    const totalPosts = data.reduce((sum, user) => sum + user.posts.length, 0);
    console.log(`Total posts fetched: ${totalPosts}`);
    
    // Save to JSON file
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    const filename = `instagram-data-${timestamp}.json`;
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    console.log(`\nData saved to ${filename}`);
    
  } catch (error) {
    console.error('Script failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main(); 