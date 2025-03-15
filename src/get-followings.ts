#!/usr/bin/env ts-node
/**
 * Script to retrieve Instagram followings list and store in Supabase
 */

import { IgApiClient } from 'instagram-private-api';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Load environment variables from .env file
dotenv.config();

/**
 * Helper function to pause execution for a specified time
 * @param ms Milliseconds to sleep
 */
const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
};

/**
 * Interface for the following user structure
 */
interface FollowingUser {
  pk: string | number;  // User ID
  username: string;     // Username
  full_name: string;    // Full name
  is_private: boolean;  // Whether the account is private
  profile_pic_url?: string; // Profile picture URL
}

/**
 * Interface for the watchlist table structure
 */
interface WatchlistEntry {
  account: string;
  followings: string[];
  last_checked: string;
}

/**
 * Initialize Supabase client
 * @returns Supabase client
 */
function initSupabase(): SupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials in environment variables');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Store followings in Supabase
 * @param supabase Supabase client
 * @param account Instagram account name
 * @param followings List of following usernames
 * @returns Result of the database operation
 */
async function storeFollowingsInSupabase(
  supabase: SupabaseClient,
  account: string,
  followings: string[]
): Promise<void> {
  const timestamp = new Date().toISOString();
  
  // Check if an entry for this account already exists
  const { data: existingEntry } = await supabase
    .from('watchlist')
    .select('*')
    .eq('account', account)
    .single();
  
  if (existingEntry) {
    // Compare with existing followings to detect changes
    const currentFollowings = existingEntry.followings || [];
    
    // Find new follows (accounts in the new list but not in the old list)
    const newFollows = followings.filter((username: string) => !currentFollowings.includes(username));
    
    // Find unfollows (accounts in the old list but not in the new list)
    const unfollows = currentFollowings.filter((username: string) => !followings.includes(username));
    
    // Log the changes
    if (newFollows.length > 0) {
      console.log(`New follows detected (${newFollows.length}):`, newFollows.join(', '));
    }
    
    if (unfollows.length > 0) {
      console.log(`Unfollows detected (${unfollows.length}):`, unfollows.join(', '));
    }
    
    // Update existing entry
    const { error } = await supabase
      .from('watchlist')
      .update({
        followings: followings,
        last_checked: timestamp
      })
      .eq('account', account);
      
    if (error) {
      throw new Error(`Error updating followings in Supabase: ${error.message}`);
    }
    
    console.log(`Updated existing entry for account: ${account}`);
    console.log(`Total followings: ${followings.length}`);
  } else {
    // Insert new entry
    const { error } = await supabase
      .from('watchlist')
      .insert({
        account: account,
        followings: followings,
        last_checked: timestamp
      });
      
    if (error) {
      throw new Error(`Error inserting followings in Supabase: ${error.message}`);
    }
    
    console.log(`Created new entry for account: ${account}`);
    console.log(`Total followings: ${followings.length}`);
  }
}

/**
 * Get the list of users that the authenticated user is following
 * @param username Instagram username
 * @param password Instagram password
 * @param maxFollowings Maximum number of followings to retrieve (0 for all)
 * @returns Promise with array of following users
 */
async function getFollowingsList(
  username: string,
  password: string,
  maxFollowings: number = 0
): Promise<FollowingUser[]> {
  // Initialize the Instagram client
  const ig = new IgApiClient();
  ig.state.generateDevice(username);

  try {
    // Log in to Instagram
    console.log('Logging in...');
    await ig.account.login(username, password);
    console.log('Logged in successfully!');

    // Get the authenticated user ID
    const myUserId = ig.state.cookieUserId;
    
    // Fetch followings list
    console.log('Fetching following list...');
    const followingFeed = ig.feed.accountFollowing(myUserId);
    const followings: FollowingUser[] = [];
    
    // Paginate through all followings
    let batchCount = 0;
    do {
      const items = await followingFeed.items();
      
      // Map to a simpler format
      const mappedItems = items.map(user => ({
        pk: user.pk,
        username: user.username,
        full_name: user.full_name,
        is_private: user.is_private,
        profile_pic_url: user.profile_pic_url
      }));
      
      followings.push(...mappedItems);
      batchCount++;
      console.log(`Fetched batch ${batchCount}: ${items.length} users. Total: ${followings.length}`);
      
      // Break if we've reached the maximum number of followings to process
      if (maxFollowings > 0 && followings.length >= maxFollowings) {
        followings.splice(maxFollowings); // Trim the list to the max size
        break;
      }
      
      // Add a delay between requests to avoid rate limiting
      if (followingFeed.isMoreAvailable()) {
        await sleep(1000);
      }
    } while (followingFeed.isMoreAvailable());
    
    console.log(`Retrieved ${followings.length} followings.`);
    return followings;
    
  } catch (error) {
    console.error('Error retrieving followings:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

// Main function
async function main() {
  const username = process.env.INSTAGRAM_USERNAME || '';
  const password = process.env.INSTAGRAM_PASSWORD || '';

  if (!username || !password) {
    console.error('Error: Instagram credentials not found in environment variables.');
    console.error('Please set INSTAGRAM_USERNAME and INSTAGRAM_PASSWORD in your .env file.');
    process.exit(1);
  }

  try {
    // Initialize Supabase client
    console.log('Initializing Supabase connection...');
    const supabase = initSupabase();
    
    // Parse command line arguments
    const maxArg = process.argv.find(arg => arg.startsWith('--max='));
    const maxFollowings = maxArg ? parseInt(maxArg.split('=')[1], 10) : 0;
    
    console.log(`Starting Instagram followings retrieval for ${username}`);
    console.log(`Max followings to retrieve: ${maxFollowings || 'All'}`);
    
    // Get followings
    const followings = await getFollowingsList(username, password, maxFollowings);
    
    // Print some stats
    console.log('\nFollowings Statistics:');
    console.log(`Total followings: ${followings.length}`);
    console.log(`Private accounts: ${followings.filter(user => user.is_private).length}`);
    
    // Export to JSON file
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    const filename = `instagram-followings-${timestamp}.json`;
    
    fs.writeFileSync(filename, JSON.stringify(followings, null, 2));
    console.log(`\nFollowings list saved to ${filename}`);
    
    // Print the first few followings as a sample
    console.log('\nSample of followings:');
    followings.slice(0, 5).forEach((user, index) => {
      console.log(`${index + 1}. ${user.username} (${user.full_name}) ${user.is_private ? '🔒' : ''}`);
    });
    
    // Store in Supabase
    console.log('\nStoring followings in Supabase...');
    // Extract just the usernames for the followings array
    const followingUsernames = followings.map(user => user.username);
    await storeFollowingsInSupabase(supabase, username, followingUsernames);
    console.log('Successfully stored followings in Supabase!');
    
  } catch (error) {
    console.error('Script failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  main();
}

// Export functions for use in other modules
export { getFollowingsList, storeFollowingsInSupabase };
export type { FollowingUser, WatchlistEntry }; 