import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';

interface LogEntry {
  timestamp: string;
  message: string;
  level: 'info' | 'error' | 'warn';
}

export default function LogViewer({ maxEntries = 10 }: { maxEntries?: number }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const router = useRouter();
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Fetch logs
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/logs?limit=${maxEntries}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch logs');
        }
        
        const data = await response.json();
        setLogs(data.logs);
        setError(null);
      } catch (error) {
        console.error('Error fetching logs:', error);
        setError('Failed to load logs. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
    
    // Set up auto-refresh interval if enabled
    let interval: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      interval = setInterval(fetchLogs, 30000); // Refresh every 30 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [maxEntries, autoRefresh]);

  // Scroll to bottom of logs when they update
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Format timestamp in a locale-independent way
  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const pad = (num: number) => num.toString().padStart(2, '0');
      
      const year = date.getFullYear();
      const month = pad(date.getMonth() + 1);
      const day = pad(date.getDate());
      const hours = pad(date.getHours());
      const minutes = pad(date.getMinutes());
      
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    } catch (e) {
      return timestamp; // Fallback to original if parsing fails
    }
  };

  // Get log entry class based on level
  const getLogClass = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-600 border-red-200 bg-red-50';
      case 'warn':
        return 'text-yellow-600 border-yellow-200 bg-yellow-50';
      default:
        return 'text-gray-700 border-gray-200 bg-white';
    }
  };

  return (
    <div className="p-5">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-0">Recent Logs</h2>
        <div className="flex items-center space-x-4">
          <label className="flex items-center text-sm text-gray-600">
            <input
              type="checkbox"
              className="form-checkbox h-4 w-4 text-blue-600 rounded mr-2"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh
          </label>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-6">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
          {error}
        </div>
      ) : (
        <>
          <div 
            ref={logContainerRef}
            className="h-64 overflow-auto border border-gray-200 rounded-md bg-gray-50"
          >
            {logs.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No logs available</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {logs.map((log, index) => (
                  <div 
                    key={index} 
                    className={`p-3 border-l-4 ${getLogClass(log.level)}`}
                    style={{ borderLeftColor: log.level === 'error' ? '#ef4444' : log.level === 'warn' ? '#f59e0b' : '#e5e7eb' }}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="inline-block px-2 py-0.5 text-xs rounded-full font-medium" 
                        style={{ 
                          backgroundColor: log.level === 'error' ? '#fee2e2' : log.level === 'warn' ? '#fef3c7' : '#f3f4f6',
                          color: log.level === 'error' ? '#b91c1c' : log.level === 'warn' ? '#d97706' : '#374151'
                        }}
                      >
                        {log.level}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(log.timestamp)}
                      </span>
                    </div>
                    <div className="text-sm">{log.message}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex justify-between mt-4">
            <span className="text-xs text-gray-500">
              Showing {logs.length} of {logs.length} logs
            </span>
            <button
              onClick={() => router.push('/logs')}
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              View All Logs →
            </button>
          </div>
        </>
      )}
    </div>
  );
} 