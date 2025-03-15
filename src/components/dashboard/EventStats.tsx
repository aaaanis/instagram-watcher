import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import DashboardCard, { 
  MetricDisplay, 
  LoadingSpinner, 
  ErrorDisplay, 
  EmptyState 
} from '../ui/DashboardCard';

interface Event {
  id: string;
  account: string;
  post_id: string;
  event_type: string;
  confidence_score: number;
  post_date: string;
}

interface EventData {
  totalEvents: number;
  recentEvents: Event[];
  eventTypes: {
    type: string;
    count: number;
  }[];
  confidenceDistribution: {
    range: string;
    count: number;
  }[];
}

export default function EventStats() {
  const [stats, setStats] = useState<EventData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const prevStatsRef = useRef<EventData | null>(null);
  
  // State for infinite scrolling
  const [events, setEvents] = useState<Event[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const eventsContainerRef = useRef<HTMLDivElement>(null);
  
  const router = useRouter();

  // Fetch event stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Don't show loading indicator on refresh, only on initial load
        if (!isLoading) {
          setUpdating(true);
        }
        
        const response = await fetch('/api/events/stats');
        
        if (!response.ok) {
          throw new Error('Failed to fetch event statistics');
        }
        
        const data = await response.json();
        
        // Only update if the data has changed
        if (!prevStatsRef.current || 
            JSON.stringify(prevStatsRef.current) !== JSON.stringify(data)) {
          setStats(data);
          prevStatsRef.current = data;
        }
        
        setError(null);
      } catch (error) {
        console.error('Error fetching event stats:', error);
        setError('Failed to load event statistics');
        
        // For demonstration, generate mock stats
        setStats({
          totalEvents: 15,
          recentEvents: [],
          eventTypes: [
            { type: 'conference', count: 5 },
            { type: 'workshop', count: 4 },
            { type: 'seminar', count: 3 },
            { type: 'meetup', count: 2 },
            { type: 'hackathon', count: 1 }
          ],
          confidenceDistribution: [
            { range: '90-95%', count: 8 },
            { range: '95-97%', count: 4 },
            { range: '98-100%', count: 3 }
          ]
        });
      } finally {
        setIsLoading(false);
        setUpdating(false);
      }
    };

    fetchStats();
    // Refresh every 10 minutes instead of 5
    const interval = setInterval(fetchStats, 600000);
    return () => clearInterval(interval);
  }, []);

  // Initial fetch of recent events (first page)
  useEffect(() => {
    fetchEvents(0);
  }, []);

  // Function to fetch events with pagination
  const fetchEvents = async (offsetVal: number) => {
    if (offsetVal === 0) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    
    try {
      const response = await fetch(`/api/events/recent?offset=${offsetVal}&limit=10`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch recent events');
      }
      
      const data = await response.json();
      
      if (offsetVal === 0) {
        // Replace current events with new data for first page
        setEvents(data.events);
      } else {
        // Append new events for subsequent pages
        setEvents(prev => [...prev, ...data.events]);
      }
      
      // Update offset and check if there are more events to load
      setOffset(offsetVal + data.events.length);
      setHasMore(data.hasMore);
    } catch (error) {
      console.error('Error fetching recent events:', error);
      // Don't set the main error state, just log it
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  // Handle scroll event for infinite loading
  const handleScroll = useCallback(() => {
    if (!eventsContainerRef.current || isLoadingMore || !hasMore) return;
    
    const { scrollTop, scrollHeight, clientHeight } = eventsContainerRef.current;
    
    // If scrolled to bottom (with a threshold of 50px)
    if (scrollHeight - scrollTop - clientHeight < 50) {
      fetchEvents(offset);
    }
  }, [offset, isLoadingMore, hasMore]);

  // Add scroll event listener
  useEffect(() => {
    const container = eventsContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const pad = (num: number) => num.toString().padStart(2, '0');
    
    const day = pad(date.getDate());
    const month = pad(date.getMonth() + 1);
    const year = date.getFullYear();
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  // Get color class based on event type
  const getEventTypeColor = (type: string) => {
    const typeColors: Record<string, string> = {
      conference: 'bg-blue-100 text-blue-800',
      seminar: 'bg-green-100 text-green-800',
      workshop: 'bg-purple-100 text-purple-800',
      hackathon: 'bg-red-100 text-red-800',
      meetup: 'bg-yellow-100 text-yellow-800'
    };
    
    return typeColors[type.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  // Get color class based on confidence score
  const getConfidenceColor = (score: number) => {
    if (score >= 95) return 'bg-green-100 text-green-800';
    if (score >= 90) return 'bg-blue-100 text-blue-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  // Render component content based on states
  const renderContent = () => {
    return (
      <div className={`transition-opacity duration-300 ease-in-out ${updating ? 'opacity-70' : 'opacity-100'}`}>
        {isLoading ? (
          <LoadingSpinner />
        ) : error ? (
          <ErrorDisplay message={error} />
        ) : !stats ? (
          <EmptyState 
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
            title="No Event Data Available"
            description="We don't have any event data to display yet."
            listItems={["Please check back later."]}
          />
        ) : (
          <div>
            {/* Stats Overview */}
            <MetricDisplay 
              value={stats.totalEvents}
              label="Total Events Detected"
              className="mb-4"
            />
            
            {/* Event Types */}
            <div className="mb-5">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Event Types</h3>
              <div className="flex flex-wrap gap-2">
                {stats.eventTypes.map((type, index) => (
                  <div 
                    key={index}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getEventTypeColor(type.type)}`}
                  >
                    {type.type}: {type.count}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Recent Events */}
            <div className="mb-5">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Recent Events</h3>
              {events.length === 0 && !isLoading ? (
                <div className="text-sm text-gray-500 italic">No recent events detected</div>
              ) : (
                <div 
                  ref={eventsContainerRef}
                  className="h-64 overflow-y-auto pr-1 border border-gray-100 rounded-md"
                  onScroll={handleScroll}
                >
                  <div className="space-y-2 p-2">
                    {events.map((event) => (
                      <div key={event.id} className="border border-gray-200 rounded-md p-3 bg-white hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium">@{event.account}</span>
                          <span className="text-xs text-gray-500">{formatDate(event.post_date)}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-2">
                          <span 
                            className={`px-2 py-0.5 rounded-md text-xs ${getEventTypeColor(event.event_type)}`}
                          >
                            {event.event_type}
                          </span>
                          <span 
                            className={`px-2 py-0.5 rounded-md text-xs ${getConfidenceColor(event.confidence_score)}`}
                          >
                            {event.confidence_score}% confidence
                          </span>
                        </div>
                        <a 
                          href={`https://instagram.com/p/${event.post_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          View Post
                        </a>
                      </div>
                    ))}
                    
                    {isLoadingMore && (
                      <div className="flex justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
                      </div>
                    )}
                    
                    {!hasMore && events.length > 0 && (
                      <div className="text-center text-xs text-gray-400 py-2">
                        No more events to load
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Confidence Distribution */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Confidence Distribution</h3>
              <div className="space-y-2">
                {stats.confidenceDistribution.map((range, index) => (
                  <div key={index} className="flex items-center">
                    <div className="w-24 text-xs">{range.range}</div>
                    <div className="flex-grow bg-gray-100 h-4 rounded-full overflow-hidden">
                      <div 
                        className="bg-blue-500 h-full"
                        style={{ 
                          width: `${(range.count / stats.totalEvents) * 100}%` 
                        }}
                      ></div>
                    </div>
                    <div className="w-8 text-xs text-right ml-2">{range.count}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <DashboardCard title="Event Detection">
      {renderContent()}
    </DashboardCard>
  );
} 