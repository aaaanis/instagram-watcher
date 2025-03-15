import { IgApiClient } from 'instagram-private-api';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

// Load environment variables from .env file
dotenv.config();

// Interface for the result structure
export interface UserPostContent {
  username: string;
  posts: string[];
}

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
 * Fetches Instagram data for users that the authenticated user follows
 * @param username Instagram username
 * @param password Instagram password
 * @param maxFollowings Maximum number of followings to process (0 for all)
 * @param postsPerUser Number of recent posts to fetch per user
 * @returns Promise with array of user post content
 */
export async function getInstagramData(
  username: string, 
  password: string, 
  maxFollowings: number = 0, 
  postsPerUser: number = 3
): Promise<UserPostContent[]> {
  // Initialize the Instagram client
  const ig = new IgApiClient();
  ig.state.generateDevice(username); // Generate a device ID for session consistency

  try {
    // Log in to your account
    console.log('Logging in...');
    await ig.account.login(username, password);
    console.log('Logged in successfully!');

    // Get your user ID from the session
    const myUserId = ig.state.cookieUserId;

    // Fetch the list of users you're following
    console.log('Fetching following list...');
    const followingFeed = ig.feed.accountFollowing(myUserId);
    const followings = [];

    // Paginate through the following list until all are retrieved
    let batchCount = 0;
    do {
      const items = await followingFeed.items();
      followings.push(...items);
      batchCount++;
      console.log(`Fetched batch ${batchCount}: ${items.length} users. Total: ${followings.length}`);
      
      // Break if we've reached the maximum number of followings to process
      if (maxFollowings > 0 && followings.length >= maxFollowings) {
        followings.splice(maxFollowings); // Trim the list to the max size
        break;
      }
      
      // Add a short delay between pagination requests
      await sleep(500);
    } while (followingFeed.isMoreAvailable());

    console.log(`Processing ${followings.length} followings.`);

    // Collect results
    const results: UserPostContent[] = [];

    // Process each following
    for (let i = 0; i < followings.length; i++) {
      const user = followings[i];
      const userId = user.pk; // User ID
      const username = user.username;

      try {
        // Get the user's feed
        console.log(`[${i + 1}/${followings.length}] Fetching posts for ${username}...`);
        const userFeed = ig.feed.user(userId);
        
        // Get posts one batch at a time until we have the desired number or no more are available
        const allPosts = [];
        while (allPosts.length < postsPerUser && userFeed.isMoreAvailable()) {
          const posts = await userFeed.items();
          allPosts.push(...posts);
          
          // Add a small delay between requests
          if (allPosts.length < postsPerUser && userFeed.isMoreAvailable()) {
            await sleep(300);
          }
        }
        
        // Limit to the requested number of posts
        const limitedPosts = allPosts.slice(0, postsPerUser);

        // Extract captions (or handle missing captions)
        const postContents = limitedPosts.map(post => post.caption?.text || 'No caption available');

        // Store the result
        results.push({ username, posts: postContents });
      } catch (error) {
        console.error(`Error fetching posts for ${username}:`, error instanceof Error ? error.message : String(error));
        results.push({ username, posts: ['Error fetching posts'] });
      }

      // Add a delay to avoid rate limits
      await sleep(1000);
    }

    return results;
  } catch (error) {
    console.error('An error occurred:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

// Execute the script if run directly
if (require.main === module) {
  async function main() {
    const username = process.env.INSTAGRAM_USERNAME || '';
    const password = process.env.INSTAGRAM_PASSWORD || '';

    if (!username || !password) {
      console.error('Error: Instagram credentials not found in environment variables.');
      console.error('Please set INSTAGRAM_USERNAME and INSTAGRAM_PASSWORD in your .env file.');
      process.exit(1);
    }

    try {
      // Process all followings and a reasonable number of posts for production
      const maxFollowings = 0; // 0 means fetch all followings
      const postsPerUser = 5; // Reasonable number of posts per user
      
      console.log(`Starting Instagram data fetch for ${username}`);
      const data = await getInstagramData(username, password, maxFollowings, postsPerUser);
      
      console.log('\nResults:');
      data.forEach(result => {
        console.log(`\nUser: ${result.username}`);
        result.posts.forEach((post, index) => {
          // Truncate long captions for display
          const truncatedPost = post.length > 100 ? post.substring(0, 100) + '...' : post;
          console.log(`  Post ${index + 1}: ${truncatedPost}`);
        });
      });
      
      // Save results to a file for reference
      fs.writeFileSync('./instagram-data.json', JSON.stringify(data, null, 2));
      console.log('\nData saved to instagram-data.json');
      
    } catch (error) {
      console.error('Script failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  main();
} 