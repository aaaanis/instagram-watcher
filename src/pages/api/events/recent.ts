import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface Event {
  id: string;
  account: string;
  post_id: string;
  event_type: string;
  confidence_score: number;
  post_date: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get pagination parameters
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const supabase = initSupabase();
    
    try {
      // Query the instagram_events table with pagination
      const { data: events, error, count } = await supabase
        .from('instagram_events')
        .select('*', { count: 'exact' })
        .eq('is_event', true)
        .order('post_date', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) {
        console.error('Error fetching recent events:', error);
        throw error;
      }
      
      // Format the events
      const formattedEvents = events ? events.map(event => ({
        id: event.id,
        account: event.account,
        post_id: event.post_id,
        event_type: event.event_type,
        confidence_score: event.confidence_score,
        post_date: event.post_date
      })) : [];
      
      return res.status(200).json({
        events: formattedEvents,
        totalCount: count || 0,
        hasMore: count ? offset + limit < count : false
      });
    } catch (error) {
      console.error('Error retrieving events:', error);
      return res.status(500).json({ 
        error: 'Failed to retrieve events from database',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  } catch (error) {
    console.error('Error fetching recent events:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch recent events',
      message: error instanceof Error ? error.message : String(error)
    });
  }
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