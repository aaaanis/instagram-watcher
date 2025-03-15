import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import DashboardCard, { LoadingSpinner, ErrorDisplay } from '../ui/DashboardCard';
import { Disclosure, Transition } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

// Type definitions
interface LogEntry {
  timestamp: string;
  message: string;
  level: 'info' | 'warn' | 'error';
}

interface EventRun {
  startTime: string;
  endTime?: string;
  logs: LogEntry[];
  events: LogEntry[];
}

interface EventRunsResponse {
  eventRuns: EventRun[];
}

const EventDetectionRuns: React.FC = () => {
  const [eventRuns, setEventRuns] = useState<EventRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Validate if a date is valid and not in the future
  const isValidDate = (dateString: string): boolean => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      
      // Check if the date is valid and not in the future
      return !isNaN(date.getTime()) && date <= now;
    } catch (err) {
      return false;
    }
  };

  useEffect(() => {
    const fetchEventRuns = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/logs/events');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data: EventRunsResponse = await response.json();
        
        // Filter out any event runs with invalid or future dates
        const validEventRuns = data.eventRuns.filter(run => 
          isValidDate(run.startTime) && 
          (!run.endTime || isValidDate(run.endTime)) &&
          // Also filter log entries with valid dates
          run.logs.every(log => isValidDate(log.timestamp)) &&
          run.events.every(event => isValidDate(event.timestamp))
        );
        
        setEventRuns(validEventRuns);
        setError(null);
      } catch (err) {
        console.error('Error fetching event runs:', err);
        setError('Failed to fetch event detection runs');
        toast.error('Failed to load event detection runs');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEventRuns();
    
    // Fetch every 5 minutes
    const intervalId = setInterval(fetchEventRuns, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, []);

  const formatDateTime = (timestamp: string) => {
    try {
      return format(new Date(timestamp), 'MMM d, yyyy h:mm a');
    } catch (err) {
      return timestamp;
    }
  };

  const getLogLevelClass = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-500';
      case 'warn':
        return 'text-yellow-500';
      default:
        return 'text-blue-500';
    }
  };

  // Function to render the duration between start and end times
  const getDuration = (run: EventRun) => {
    if (!run.endTime || !run.startTime) return 'In progress';
    
    const start = new Date(run.startTime);
    const end = new Date(run.endTime);
    const durationMs = end.getTime() - start.getTime();
    
    // Format duration
    const seconds = Math.floor(durationMs / 1000) % 60;
    const minutes = Math.floor(durationMs / (1000 * 60)) % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  return (
    <DashboardCard title="Event Detection Runs" className="col-span-full">
      {isLoading && eventRuns.length === 0 ? (
        <div className="flex justify-center items-center p-8">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div className="text-center p-4 text-red-500">
          <ErrorDisplay message={error} />
        </div>
      ) : eventRuns.length === 0 ? (
        <div className="text-center p-4 text-gray-500">
          No event detection runs found
        </div>
      ) : (
        <div className="space-y-4 p-2">
          {eventRuns.map((run, index) => (
            <Disclosure key={index}>
              {({ open }: { open: boolean }) => (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <Disclosure.Button className="w-full flex justify-between items-center px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-left">
                      <span className="font-medium">
                        Run #{eventRuns.length - index}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDateTime(run.startTime)}
                      </span>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                        {getDuration(run)}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-2 px-2 py-0.5 text-xs rounded bg-green-100 text-green-800">
                        {run.events.length} events detected
                      </span>
                      <ChevronDownIcon
                        className={`${
                          open ? 'transform rotate-180' : ''
                        } w-5 h-5 text-gray-500 transition-transform`}
                      />
                    </div>
                  </Disclosure.Button>
                  
                  <Transition
                    show={open}
                    enter="transition duration-100 ease-out"
                    enterFrom="transform scale-95 opacity-0"
                    enterTo="transform scale-100 opacity-100"
                    leave="transition duration-75 ease-out"
                    leaveFrom="transform scale-100 opacity-100"
                    leaveTo="transform scale-95 opacity-0"
                  >
                    <Disclosure.Panel static>
                      <div className="p-4 space-y-4">
                        {run.events.length > 0 ? (
                          <div>
                            <h4 className="font-medium mb-2 text-sm">Events Detected:</h4>
                            <div className="bg-gray-50 rounded-lg p-3 max-h-60 overflow-auto">
                              {run.events.map((event, idx) => (
                                <div key={idx} className="mb-2 pb-2 border-b border-gray-200 last:border-0">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-xs ${getLogLevelClass(event.level)}`}>
                                      {event.level.toUpperCase()}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {formatDateTime(event.timestamp)}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-sm">{event.message}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-gray-500 italic text-sm">
                            No events detected in this run
                          </div>
                        )}
                        
                        <div>
                          <h4 className="font-medium mb-2 text-sm">All Logs:</h4>
                          <div className="bg-gray-50 rounded-lg p-3 max-h-60 overflow-auto">
                            {run.logs.map((log, idx) => (
                              <div key={idx} className="text-xs mb-1">
                                <span className={`inline-block w-12 ${getLogLevelClass(log.level)}`}>
                                  {log.level.toUpperCase()}
                                </span>
                                <span className="text-gray-500 mr-2">
                                  {format(new Date(log.timestamp), 'HH:mm:ss')}:
                                </span>
                                <span>{log.message}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Disclosure.Panel>
                  </Transition>
                </div>
              )}
            </Disclosure>
          ))}
        </div>
      )}
    </DashboardCard>
  );
};

export default EventDetectionRuns; 