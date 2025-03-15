import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Remove mock data

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = initSupabase();
    
    // For a real implementation, query Supabase for the statistics
    try {
      // Query the instagram_events table
      const { data: events, error } = await supabase
        .from('instagram_events')
        .select('*')
        .eq('is_event', true)
        .order('post_date', { ascending: false });
      
      if (error || !events) {
        throw new Error('Failed to fetch events');
      }
      
      // Calculate statistics
      const totalEvents = events.length;
      const recentEvents = events.slice(0, 10).map(event => ({
        id: event.id,
        account: event.account,
        post_id: event.post_id,
        event_type: event.event_type,
        confidence_score: event.confidence_score,
        post_date: event.post_date
      }));
      
      // Count events by type
      const eventTypesMap = new Map<string, number>();
      events.forEach((event: any) => {
        const type = event.event_type || 'other';
        eventTypesMap.set(type, (eventTypesMap.get(type) || 0) + 1);
      });
      
      const eventTypes = Array.from(eventTypesMap.entries()).map(([type, count]) => ({
        type,
        count
      }));
      
      // Calculate confidence score distribution
      const confidenceRanges = [
        { min: 90, max: 95, label: '90-95%' },
        { min: 95, max: 97, label: '95-97%' },
        { min: 98, max: 100, label: '98-100%' }
      ];
      
      const confidenceDistribution = confidenceRanges.map(range => {
        const count = events.filter(
          event => event.confidence_score >= range.min && 
                 event.confidence_score < (range.max === 100 ? 101 : range.max)
        ).length;
        
        return {
          range: range.label,
          count
        };
      });
      
      const stats = {
        totalEvents,
        recentEvents,
        eventTypes,
        confidenceDistribution
      };
      
      return res.status(200).json(stats);
    } catch (error) {
      console.error('Error retrieving events:', error);
      return res.status(500).json({ 
        error: 'Failed to retrieve events from database',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  } catch (error) {
    console.error('Error fetching event stats:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch event statistics',
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