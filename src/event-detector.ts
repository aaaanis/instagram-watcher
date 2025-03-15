/// <reference path="./types/instagram-scraper.d.ts" />

import { InstagramScraper } from '@aduptive/instagram-scraper';
import { Configuration, OpenAIApi } from 'openai';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { InstagramPost, ScraperResult } from './types/instagram-scraper';
import { getCachedOrCompute, getCached, getCacheStats } from './utils/cache';

// Load environment variables from .env file
dotenv.config();

// Configuration constants
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds
const MIN_CONFIDENCE_THRESHOLD = 90;
const FOLLOWINGS_CACHE_TTL = 60 * 60 * 4 - 60 * 5; // 3 hours 55 minutes - expires 5 minutes before next follower check
const OPENAI_ANALYSIS_CACHE_TTL = 60 * 60 * 24 * 7; // 7 days (analysis results don't change often)

/**
 * Interface for an event post
 */
interface EventPost {
  id?: string;
  account: string;
  post_id: string;
  post_url: string;
  post_date: string;
  caption: string | null;
  image_url: string | null;
  is_event: boolean;
  event_type: string | null;
  event_details: any;
  confidence_score: number;
}

/**
 * Initialize OpenAI API client
 */
function initOpenAI(): OpenAIApi {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('Missing OpenAI API key in environment variables');
  }
  
  const configuration = new Configuration({
    apiKey,
  });
  
  return new OpenAIApi(configuration);
}

/**
 * Initialize Supabase client
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
 * Fetch list of followings from Supabase with caching
 */
async function getFollowingsFromSupabase(supabase: SupabaseClient, account: string): Promise<string[]> {
  const cacheKey = `followings:${account}`;

  return getCachedOrCompute<string[]>(
    cacheKey,
    async () => {
      console.log(`Cache miss for ${cacheKey} - fetching from database`);
      try {
        const { data, error } = await supabase
          .from('watchlist')
          .select('followings')
          .eq('account', account)
          .single();
        
        if (error) {
          throw new Error(`Error fetching followings: ${error.message}`);
        }
        
        if (!data || !data.followings || !Array.isArray(data.followings)) {
          return [];
        }
        
        return data.followings;
      } catch (error) {
        console.error('Error fetching followings:', error instanceof Error ? error.message : String(error));
        return [];
      }
    },
    FOLLOWINGS_CACHE_TTL
  );
}

/**
 * Check if a post is about an event using OpenAI with caching
 */
async function analyzePostWithOpenAI(openai: OpenAIApi, post: InstagramPost): Promise<{
  isEvent: boolean;
  eventType?: string;
  eventDetails?: any;
  confidenceScore: number;
}> {
  // Create a cache key using the post ID and a hash of the caption
  // This ensures we don't re-analyze posts we've already seen
  const cacheKey = `post_analysis:${post.id}`;
  
  return getCachedOrCompute(
    cacheKey,
    async () => {
      console.log(`Cache miss for ${cacheKey} - analyzing with OpenAI`);
      try {
        // Get the image URL and caption from the post - use the display_url property which is already available
        const imageUrl = post.display_url || post.image_url || '';
        const caption = post.caption || 'No caption';
        
        const prompt = `
You are an AI assistant analyzing Instagram posts to identify content related to conferences, seminars or events.

Instagram Post Caption: "${caption}"
Instagram Post Image URL: ${imageUrl}

Based on the caption and image URL, determine if this post is about a conference, seminar, or event.

IMPORTANT: Regular religious services such as daily prayers, Friday prayers, or regular religious ceremonies should NOT be considered events. Only special occasions like conferences, seminars, workshops, special ceremonies (not regular ones), fundraising events, or community gatherings should count as events.

Respond with a JSON object in the following format:
{
  "isEvent": true/false,
  "confidenceScore": 0-100 (your confidence level as a number),
  "eventType": "conference"/"seminar"/"workshop"/"other" (only if isEvent is true),
  "eventDetails": {
    "title": "Event title if available",
    "date": "Event date if available",
    "location": "Event location if available",
    "speaker": "Event speaker/guest if available"
  }
}
`;

        console.log(`Analyzing post ${post.id} with OpenAI...`);
        
        try {
          const completion = await withRetry(async () => {
            return await openai.createChatCompletion({
              model: 'gpt-4o-mini-2024-07-18',
              messages: [
                { role: 'system', content: 'You are an assistant that analyzes Instagram posts to identify events.' },
                { role: 'user', content: prompt }
              ],
              temperature: 0.0, // Lower temperature for more consistent responses
              max_tokens: 500
            });
          });

          if (!completion.data.choices || completion.data.choices.length === 0) {
            console.error('OpenAI returned an empty response');
            return { isEvent: false, confidenceScore: 0 };
          }

          const responseText = completion.data.choices[0].message?.content || '';
          
          // Extract the JSON from the response
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          
          if (jsonMatch) {
            try {
              const parsedResponse = JSON.parse(jsonMatch[0]);
              return parsedResponse;
            } catch (parseError) {
              console.error(`Failed to parse OpenAI JSON response: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
              console.error(`Raw response: ${responseText}`);
              return { isEvent: false, confidenceScore: 0 };
            }
          }
          
          console.error(`Failed to extract JSON from OpenAI response: ${responseText}`);
          return {
            isEvent: false,
            confidenceScore: 0,
          };
        } catch (apiError) {
          console.error('OpenAI API error:', apiError instanceof Error ? apiError.message : String(apiError));
          // Check if the error is rate limiting related
          if (apiError instanceof Error && apiError.message.includes('rate limit')) {
            console.log('Rate limit hit, adding extra delay before retry...');
            await delay(15000); // Add a longer delay for rate limit errors
          }
          throw apiError; // Re-throw to be caught by the retry mechanism
        }
      } catch (error) {
        console.error('Error analyzing post with OpenAI:', error instanceof Error ? error.message : String(error));
        return {
          isEvent: false,
          confidenceScore: 0,
        };
      }
    },
    OPENAI_ANALYSIS_CACHE_TTL
  );
}

/**
 * Store event post in Supabase
 */
async function storeEventInSupabase(supabase: SupabaseClient, eventPost: EventPost): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('instagram_events')
      .upsert({
        account: eventPost.account,
        post_id: eventPost.post_id,
        post_url: eventPost.post_url,
        post_date: eventPost.post_date,
        caption: eventPost.caption,
        image_url: eventPost.image_url,
        is_event: eventPost.is_event,
        event_type: eventPost.event_type,
        event_details: eventPost.event_details,
        confidence_score: eventPost.confidence_score
      }, {
        onConflict: 'post_id'
      });
    
    if (error) {
      console.error(`Error storing event in Supabase: ${error.message}`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error storing event in Supabase:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

/**
 * Wait for a specified amount of time
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES, delayMs = RETRY_DELAY): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.log(`Attempt ${attempt}/${retries} failed: ${lastError.message}`);
      
      if (attempt < retries) {
        const backoffTime = delayMs * Math.pow(2, attempt - 1);
        console.log(`Retrying in ${backoffTime / 1000} seconds...`);
        await delay(backoffTime);
      }
    }
  }
  
  throw lastError || new Error('All retries failed');
}

/**
 * Process Instagram accounts and detect events
 */
async function scrapeAndDetectEvents(
  scraper: InstagramScraper, 
  openai: OpenAIApi, 
  supabase: SupabaseClient, 
  accounts: string[], 
  postsPerAccount: number
): Promise<EventPost[]> {
  const events: EventPost[] = [];
  let totalProcessed = 0;
  let totalEvents = 0;
  let cacheHits = 0;
  let cacheMisses = 0;
  
  // Track analyzed post IDs to avoid re-analyzing
  const analyzedPostIds = new Set<string>();
  
  for (const username of accounts) {
    console.log(`Scraping ${username}...`);
    
    try {
      // Add a random delay (2-5 seconds) to avoid rate limiting
      const delayTime = 2000 + Math.random() * 3000;
      console.log(`Waiting ${Math.round(delayTime / 1000)} seconds before proceeding...`);
      await delay(delayTime);
      
      // Get posts from Instagram with retry logic
      let results: ScraperResult;
      try {
        // We don't cache scraper results as they can change frequently
        results = await withRetry(async () => {
          return await scraper.getPosts(username, postsPerAccount);
        });
      } catch (error) {
        console.error(`Failed to fetch posts for ${username} after all retries:`, 
          error instanceof Error ? error.message : String(error));
        continue;
      }
      
      if (!results.success || !results.posts || results.posts.length === 0) {
        console.log(`${username}: No posts found or error occurred`);
        continue;
      }
      
      console.log(`${username}: ${results.posts.length} posts collected, analyzing...`);
      totalProcessed += results.posts.length;
      
      // Process each post
      for (const post of results.posts) {
        try {
          // Skip if we've already analyzed this post in this run
          if (analyzedPostIds.has(post.id)) {
            console.log(`Post ${post.id}: Already analyzed in this session, skipping`);
            continue;
          }
          
          // Mark this post as analyzed
          analyzedPostIds.add(post.id);
          
          // Check if post has already been stored in Supabase
          const { data: existingPost } = await supabase
            .from('instagram_events')
            .select('id')
            .eq('post_id', post.id)
            .single();
            
          if (existingPost) {
            console.log(`Post ${post.id}: Already in database, skipping analysis`);
            cacheHits++;
            continue;
          }
          
          // Analyze with OpenAI (this uses our caching mechanism internally)
          const analysisCacheKey = `post_analysis:${post.id}`;
          const cachedAnalysis = getCached(`post_analysis:${post.id}`);
          const analysis = await analyzePostWithOpenAI(openai, post);
          
          // Update cache hit/miss counters
          if (cachedAnalysis) {
            cacheHits++;
          } else {
            cacheMisses++;
          }
          
          console.log(`Post ${post.id}: ${analysis.isEvent ? 'EVENT' : 'NOT EVENT'} (${analysis.confidenceScore}% confidence)`);
          
          // Only process posts that are events with high confidence
          if (analysis.isEvent && analysis.confidenceScore >= MIN_CONFIDENCE_THRESHOLD) {
            totalEvents++;
            
            // Format the post date
            const postDate = post.timestamp 
              ? new Date(post.timestamp * 1000).toISOString()
              : new Date().toISOString();
            
            // Get image URL from display_url or fall back to other properties
            const imageUrl = post.display_url || post.image_url || '';
            
            // Create event post object
            const eventPost: EventPost = {
              account: username,
              post_id: post.id,
              post_url: post.url || `https://www.instagram.com/p/${post.shortcode}/`,
              post_date: postDate,
              caption: post.caption || null,
              image_url: imageUrl || null,
              is_event: true,
              event_type: analysis.eventType || 'other',
              event_details: analysis.eventDetails || {},
              confidence_score: analysis.confidenceScore
            };
            
            // Store in Supabase
            const stored = await storeEventInSupabase(supabase, eventPost);
            
            if (stored) {
              console.log(`✅ Event from ${username} stored in Supabase`);
              events.push(eventPost);
            }
          }
        } catch (error) {
          console.error(`Error processing post ${post.id}:`, 
            error instanceof Error ? error.message : String(error));
        }
        
        // Small delay between post processing to avoid rate limits
        await delay(500);
      }
    } catch (error) {
      console.error(`Error processing account ${username}:`, 
        error instanceof Error ? error.message : String(error));
    }
  }
  
  // Get cache statistics from the imported cache module
  const cacheStats = getCacheStats();
  
  console.log(`\nProcessing summary:
  - Total posts processed: ${totalProcessed}
  - Total events detected: ${totalEvents}
  - Events saved to database: ${events.length}
  - Cache usage during this run:
    - Cache hits: ${cacheHits}
    - Cache misses: ${cacheMisses}
    - Hit ratio: ${cacheHits + cacheMisses > 0 ? Math.round((cacheHits / (cacheHits + cacheMisses)) * 100) : 0}%
  - Overall cache statistics:
    - Total keys in cache: ${cacheStats.keys}
    - Total cache hits: ${cacheStats.hits}
    - Total cache misses: ${cacheStats.misses}
  `);
  
  return events;
}

/**
 * Main function
 */
async function main() {
  console.log('--- Instagram Event Detector Starting ---');
  console.log(`Time: ${new Date().toISOString()}`);
  
  try {
    // Get command line arguments
    const args = process.argv.slice(2);
    const maxFollowings = args.find(arg => arg.startsWith('--max='))
      ? parseInt(args.find(arg => arg.startsWith('--max='))!.split('=')[1])
      : Infinity;
    
    // Initialize clients
    console.log('Initializing clients...');
    let openai, supabase, scraper;
    
    try {
      openai = initOpenAI();
      console.log('✅ OpenAI client initialized');
    } catch (error) {
      console.error('❌ Failed to initialize OpenAI client:', 
        error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
    
    try {
      supabase = initSupabase();
      console.log('✅ Supabase client initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Supabase client:', 
        error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
    
    try {
      scraper = new InstagramScraper();
      console.log('✅ Instagram scraper initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Instagram scraper:', 
        error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
    
    console.log('Fetching accounts to monitor...');
    
    // Fetch accounts to monitor (from the user's followings in Supabase)
    // Try different environment variable names for compatibility
    const mainAccount = process.env.INSTAGRAM_ACCOUNT || process.env.INSTAGRAM_USERNAME || '';
    if (!mainAccount) {
      throw new Error('Main Instagram account not specified in environment variables (INSTAGRAM_ACCOUNT or INSTAGRAM_USERNAME)');
    }
    
    console.log(`Using main account: ${mainAccount}`);
    
    let followings = await getFollowingsFromSupabase(supabase, mainAccount);
    
    // In production, we need actual followings data
    if (!followings || followings.length === 0) {
      console.error('No followings found in database. Please run the followings retrieval process first.');
      return;
    }
    
    // Apply limit if specified
    if (maxFollowings < followings.length) {
      console.log(`Limiting to ${maxFollowings} accounts (out of ${followings.length} total followings)`);
      followings = followings.slice(0, maxFollowings);
    }
    
    if (followings.length === 0) {
      console.log('No accounts to monitor. Please add some accounts to your watchlist.');
      return;
    }
    
    console.log(`Monitoring ${followings.length} accounts for events...`);
    
    // Detect events
    const events = await scrapeAndDetectEvents(scraper, openai, supabase, followings, 5);
    
    // Print results summary
    console.log('\nEvent Detection Results:');
    console.log(`Found ${events.length} events with confidence >= ${MIN_CONFIDENCE_THRESHOLD}%`);
    console.log('Event detection completed successfully!');
  } catch (error) {
    console.error('Critical error in main function:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    console.log('--- Instagram Event Detector Finished ---');
    console.log(`End Time: ${new Date().toISOString()}`);
  }
}

// Run the main function
main().catch(console.error);

// Export functions for use in other modules
export { scrapeAndDetectEvents };
export type { EventPost }; 