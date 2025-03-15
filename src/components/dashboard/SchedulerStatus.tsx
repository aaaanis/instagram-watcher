import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';

interface NextRuns {
  followings: Date | null;
  eventDetector: Date | null;
}

export default function SchedulerStatus() {
  const [isRunning, setIsRunning] = useState<boolean | null>(null);
  const [lastActive, setLastActive] = useState<Date>(new Date());
  const [nextRuns, setNextRuns] = useState<NextRuns>({
    followings: null,
    eventDetector: null
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const router = useRouter();
  const dataRef = useRef({ isRunning, lastActive, nextRuns });

  // Fetch scheduler status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        // Don't show loading indicator on refresh, only on initial load
        if (!isLoading) {
          setUpdating(true);
        }
        
        const response = await fetch('/api/scheduler/status');
        
        if (!response.ok) {
          throw new Error('Failed to fetch scheduler status');
        }
        
        const data = await response.json();
        
        // Check if data has actually changed before updating state
        const newIsRunning = data.isRunning;
        const newLastActive = new Date(data.lastActive);
        const newNextRuns = {
          followings: data.nextRun?.followings ? new Date(data.nextRun.followings) : null,
          eventDetector: data.nextRun?.eventDetector ? new Date(data.nextRun.eventDetector) : null
        };
        
        // Only update state if data has changed to prevent unnecessary re-renders
        if (
          newIsRunning !== dataRef.current.isRunning ||
          newLastActive.getTime() !== dataRef.current.lastActive.getTime() ||
          (newNextRuns.followings?.getTime() !== dataRef.current.nextRuns.followings?.getTime()) ||
          (newNextRuns.eventDetector?.getTime() !== dataRef.current.nextRuns.eventDetector?.getTime())
        ) {
          setIsRunning(newIsRunning);
          setLastActive(newLastActive);
          setNextRuns(newNextRuns);
          
          // Update the ref with the new values
          dataRef.current = { isRunning: newIsRunning, lastActive: newLastActive, nextRuns: newNextRuns };
        }
        
        setError(null);
      } catch (error) {
        console.error('Error fetching scheduler status:', error);
        setError('Failed to fetch scheduler status.');
        
        // Do not set mock values on error, keep previous state
        // This removes placeholder data
      } finally {
        setIsLoading(false);
        setUpdating(false);
      }
    };

    fetchStatus();
    
    // Refresh status every 3 minutes instead of every minute
    const interval = setInterval(fetchStatus, 180000);
    
    return () => clearInterval(interval);
  }, []);

  // Toggle scheduler
  const toggleScheduler = async () => {
    try {
      setIsLoading(true);
      
      const endpoint = isRunning ? '/api/scheduler/stop' : '/api/scheduler/start';
      const response = await fetch(endpoint, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${isRunning ? 'stop' : 'start'} scheduler`);
      }
      
      // Update state
      setIsRunning(!isRunning);
      
      // Refresh scheduler status
      const statusResponse = await fetch('/api/scheduler/status');
      if (statusResponse.ok) {
        const data = await statusResponse.json();
        setLastActive(new Date(data.lastActive));
        
        setNextRuns({
          followings: data.nextRun?.followings ? new Date(data.nextRun.followings) : null,
          eventDetector: data.nextRun?.eventDetector ? new Date(data.nextRun.eventDetector) : null
        });
      }
    } catch (error) {
      console.error(`Error ${isRunning ? 'stopping' : 'starting'} scheduler:`, error);
      setError(`Failed to ${isRunning ? 'stop' : 'start'} scheduler.`);
    } finally {
      setIsLoading(false);
    }
  };

  // Format date for display - use a consistent format that doesn't depend on locale
  const formatDate = (date: Date) => {
    const pad = (num: number) => num.toString().padStart(2, '0');
    
    const day = pad(date.getDate());
    const month = pad(date.getMonth() + 1);
    const year = date.getFullYear();
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  // Get time until next run
  const getTimeUntil = (date: Date) => {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Now';
    
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHrs > 0) {
      return `${diffHrs}h ${diffMins}m`;
    } else {
      return `${diffMins}m`;
    }
  };

  return (
    <div className="p-5">
      <h2 className="text-lg font-semibold text-gray-800 mb-5">Scheduler Status</h2>
      
      {isLoading && !error ? (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="p-4 rounded-md bg-red-50 text-red-600 text-sm mb-4">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 transition-opacity duration-300 ease-in-out" style={{ opacity: updating ? 0.7 : 1 }}>
          {/* Current Status */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center space-x-3 mb-2">
              <div 
                className={`h-4 w-4 rounded-full ${isRunning ? 'bg-green-500' : 'bg-red-500'}`}
                style={{ animation: isRunning ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none' }}
              ></div>
              <div className="font-medium">{isRunning ? 'Active' : 'Inactive'}</div>
            </div>
            <div className="text-xs text-gray-500">
              Last activity: {formatDate(lastActive)}
            </div>
            <div className="mt-3">
              <button
                onClick={toggleScheduler}
                disabled={isLoading}
                className={`w-full px-4 py-2 rounded-md text-white font-medium transition-colors ${
                  isRunning 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isRunning ? 'Stop Scheduler' : 'Start Scheduler'}
              </button>
            </div>
          </div>
          
          {/* Followings Next Run */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm font-medium mb-2">Next Followings Retrieval</div>
            <div className="flex justify-between items-center">
              <div className="text-xs text-gray-500">
                {nextRuns.followings ? formatDate(nextRuns.followings) : 'Not scheduled'}
              </div>
              {nextRuns.followings ? (
                <div className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-800 rounded">
                  In {getTimeUntil(nextRuns.followings)}
                </div>
              ) : (
                <div className="text-xs font-medium px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                  Delayed (possible rate limit)
                </div>
              )}
            </div>
          </div>
          
          {/* Event Detection Next Run */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm font-medium mb-2">Next Event Detection</div>
            <div className="flex justify-between items-center">
              <div className="text-xs text-gray-500">
                {nextRuns.eventDetector ? formatDate(nextRuns.eventDetector) : 'Not scheduled'}
              </div>
              {nextRuns.eventDetector && (
                <div className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-800 rounded">
                  In {getTimeUntil(nextRuns.eventDetector)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
} 