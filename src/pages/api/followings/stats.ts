import { NextApiRequest, NextApiResponse } from 'next';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { ApiError, ApiErrors, handleApiError } from '../../../utils/api-error';
import { getCachedOrCompute } from '../../../utils/cache';

// Load environment variables
dotenv.config();

interface FollowingsStats {
  totalFollowings: number;
  dailyChange: number;
  weeklyChange: number;
  monthlyChange: number;
}

// Cache TTLs (in seconds)
const STATS_CACHE_TTL = 60 * 60 * 2 - 60 * 5; // 1 hour 55 minutes - expires 5 minutes before post check
const HISTORY_CACHE_TTL = 60 * 60 * 4 - 60 * 5; // 3 hours 55 minutes - expires 5 minutes before follower check

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json(ApiErrors.BadRequest('Method not allowed').toResponse());
  }

  try {
    const supabase = initSupabase();
    
    // Get main account name from query or from environment variable
    const mainAccount = req.query.account as string || 
                       process.env.INSTAGRAM_ACCOUNT || 
                       process.env.INSTAGRAM_USERNAME;
    
    if (!mainAccount) {
      throw ApiErrors.BadRequest('No Instagram account specified');
    }
    
    // Cache key incorporating all relevant parameters
    const cacheKey = `followings_stats:${mainAccount}`;
    
    // Get stats with caching
    const stats = await getCachedOrCompute<FollowingsStats>(
      cacheKey,
      async () => {
        console.log(`Cache miss for ${cacheKey} - computing fresh stats`);
        return await computeFollowingsStats(supabase, mainAccount);
      },
      STATS_CACHE_TTL
    );
    
    return res.status(200).json(stats);
  } catch (error) {
    console.error('Error fetching followings stats:', error);
    const errorResponse = handleApiError(error);
    return res.status(errorResponse.status).json(errorResponse);
  }
}

/**
 * Compute followings statistics for an account
 */
async function computeFollowingsStats(supabase: SupabaseClient, account: string): Promise<FollowingsStats> {
  // Get current followings
  const { data: currentEntry, error: currentError } = await supabase
    .from('watchlist')
    .select('followings')
    .eq('account', account)
    .single();
  
  if (currentError) {
    console.error('Error fetching current followings:', currentError);
    throw ApiErrors.ServiceUnavailable('Database');
  }
  
  if (!currentEntry) {
    throw ApiErrors.NotFound(`Account '${account}'`);
  }
  
  // Calculate the current total
  const currentFollowingsCount = Array.isArray(currentEntry.followings) 
    ? currentEntry.followings.length 
    : 0;
  
  // Initialize changes with zero in case we don't have historical data
  let dailyChange = 0;
  let weeklyChange = 0;
  let monthlyChange = 0;
  
  try {
    // Calculate time periods for metrics
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    // Get daily, weekly, monthly metrics
    const [dayResult, weekResult, monthResult] = await Promise.all([
      getDifferenceFromDate(supabase, account, oneDayAgo),
      getDifferenceFromDate(supabase, account, oneWeekAgo),
      getDifferenceFromDate(supabase, account, oneMonthAgo)
    ]);
    
    dailyChange = currentFollowingsCount - (dayResult || currentFollowingsCount);
    weeklyChange = currentFollowingsCount - (weekResult || currentFollowingsCount);
    monthlyChange = currentFollowingsCount - (monthResult || currentFollowingsCount);
  } catch (error) {
    console.error('Error calculating historical metrics:', error);
    // Continue with zero values for historical changes
  }
  
  return {
    totalFollowings: currentFollowingsCount,
    dailyChange,
    weeklyChange,
    monthlyChange
  };
}

/**
 * Get the follower count from a specific date
 */
async function getDifferenceFromDate(
  supabase: SupabaseClient, 
  account: string, 
  date: Date
): Promise<number | null> {
  // Use consistent date format for cache keys
  const dateStr = date.toISOString().split('T')[0];
  const cacheKey = `followings_history:${account}:${dateStr}`;
  
  return getCachedOrCompute<number | null>(
    cacheKey,
    async () => {
      console.log(`Cache miss for ${cacheKey} - fetching from database`);
      
      // Find the closest record to the target date
      const { data, error } = await supabase
        .from('watchlist_history')
        .select('followings_count, created_at')
        .eq('account', account)
        .lte('created_at', date.toISOString())
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error) {
        console.error(`Error fetching history for ${date.toISOString()}:`, error);
        return null;
      }
      
      if (!data || data.length === 0) {
        return null;
      }
      
      return data[0].followings_count;
    },
    HISTORY_CACHE_TTL
  );
}

/**
 * Initialize Supabase client
 */
function initSupabase(): SupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw ApiErrors.InternalServerError('Missing Supabase credentials');
  }
  
  return createClient(supabaseUrl, supabaseKey);
} 