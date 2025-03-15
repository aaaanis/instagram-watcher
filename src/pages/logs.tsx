import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Layout from '../components/dashboard/Layout';
import { useRouter } from 'next/router';

interface LogEntry {
  timestamp: string;
  message: string;
  level: 'info' | 'error' | 'warn';
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [filter, setFilter] = useState({
    level: 'all',
    search: '',
    startDate: '',
    endDate: ''
  });
  const logContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [filterWarning, setFilterWarning] = useState<string | null>(null);

  // Fetch logs
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setIsLoading(true);
        // This would normally be an API call
        const response = await fetch('/api/logs/all');
        
        if (!response.ok) {
          throw new Error('Failed to fetch logs');
        }
        
        const data = await response.json();
        setLogs(data.logs);
        setFilteredLogs(data.logs);
        setError(null);
      } catch (error) {
        console.error('Error fetching logs:', error);
        setError('Failed to load logs. Please try again.');
        setLogs([]);
        setFilteredLogs([]);
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
  }, [autoRefresh]);

  // Apply filters when filter state changes
  useEffect(() => {
    applyFilters();
  }, [filter, logs]);

  // Apply filters to logs
  const applyFilters = () => {
    let filtered = [...logs];
    let filtersActive = false;
    
    // Filter by level
    if (filter.level !== 'all') {
      filtered = filtered.filter(log => log.level === filter.level);
      filtersActive = true;
    }
    
    // Filter by search text - only if search has at least 2 characters
    if (filter.search && filter.search.length >= 2) {
      const searchLower = filter.search.toLowerCase();
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(searchLower)
      );
      filtersActive = true;
    }
    
    // Filter by date range
    if (filter.startDate) {
      const startDate = new Date(filter.startDate);
      filtered = filtered.filter(log => new Date(log.timestamp) >= startDate);
      filtersActive = true;
    }
    
    if (filter.endDate) {
      const endDate = new Date(filter.endDate);
      endDate.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter(log => new Date(log.timestamp) <= endDate);
      filtersActive = true;
    }
    
    // If no logs are found and filters are active, this might be too restrictive
    if (filtered.length === 0 && filtersActive && logs.length > 0) {
      // Add a warning that filters might be too restrictive
      setFilterWarning("No logs match your current filters. Try broadening your search criteria.");
    } else {
      setFilterWarning(null);
    }
    
    setFilteredLogs(filtered);
  };

  // Handle filter changes
  const handleFilterChange = (key: string, value: string) => {
    setFilter(prev => ({
      ...prev,
      [key]: value
    }));
    // Clear warning when changing filters
    setFilterWarning(null);
  };

  // Clear all filters
  const clearFilters = () => {
    setFilter({
      level: 'all',
      search: '',
      startDate: '',
      endDate: ''
    });
  };

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
      const seconds = pad(date.getSeconds());
      
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
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

  // Get log message context (category)
  const getLogContext = (message: string) => {
    if (message.includes('event detection')) return 'Event Detection';
    if (message.includes('follower') || message.includes('followings')) return 'Followings';
    if (message.includes('executing') || message.includes('Executing')) return 'System';
    if (message.includes('Instagram API') || message.includes('API')) return 'API';
    if (message.includes('rate limit') || message.includes('Rate limit')) return 'Rate Limiting';
    if (message.includes('Scheduler')) return 'Scheduler';
    return 'General';
  };

  // Get context class for styling based on context
  const getContextClass = (context: string) => {
    switch (context) {
      case 'Event Detection':
        return 'bg-blue-100 text-blue-800';
      case 'Followings':
        return 'bg-purple-100 text-purple-800';
      case 'System':
        return 'bg-gray-100 text-gray-800';
      case 'API':
        return 'bg-green-100 text-green-800';
      case 'Rate Limiting':
        return 'bg-orange-100 text-orange-800';
      case 'Scheduler':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  // Export logs to text file
  const exportLogs = () => {
    const logText = filteredLogs
      .map(log => `[${formatTimestamp(log.timestamp)}] [${log.level.toUpperCase()}] ${log.message}`)
      .join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `instagram-scheduler-logs-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <Head>
        <title>Scheduler Logs | Instagram Automation</title>
        <meta name="description" content="Full logs for Instagram automation scheduler" />
      </Head>

      <div className="container py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Scheduler Logs</h1>
          <div className="flex space-x-4">
            <button
              onClick={() => router.push('/')}
              className="btn btn-secondary"
            >
              Back to Dashboard
            </button>
            <button
              onClick={exportLogs}
              className="btn btn-primary"
              disabled={filteredLogs.length === 0}
            >
              Export Logs
            </button>
          </div>
        </div>

        {/* Filter controls */}
        <div className="card mb-6">
          <h2 className="header">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Log Level</label>
              <select
                value={filter.level}
                onChange={(e) => handleFilterChange('level', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Levels</option>
                <option value="info">Info</option>
                <option value="warn">Warning</option>
                <option value="error">Error</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                value={filter.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Search in logs..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={filter.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={filter.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="flex justify-between mt-4">
            <div className="flex items-center">
              <label className="flex items-center text-sm">
                <input
                  type="checkbox"
                  className="form-checkbox h-4 w-4 text-blue-600 mr-2"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
                Auto-refresh every 30 seconds
              </label>
            </div>
            
            <button
              onClick={clearFilters}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Logs display */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="header mb-0">Log Entries</h2>
            <span className="text-sm text-gray-500">
              Showing {filteredLogs.length} of {logs.length} logs
            </span>
          </div>
          
          {filterWarning && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-700 text-sm">
              <div className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{filterWarning}</span>
              </div>
            </div>
          )}
          
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-600">
              {error}
            </div>
          ) : (
            <>
              <div 
                ref={logContainerRef}
                className="h-[600px] overflow-auto border border-gray-200 rounded-md"
              >
                {filteredLogs.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No logs match your filter criteria
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {filteredLogs.map((log, index) => {
                      const context = getLogContext(log.message);
                      const contextClass = getContextClass(context);
                      
                      return (
                        <div 
                          key={index} 
                          className={`p-3 border-l-4 ${getLogClass(log.level)}`}
                          style={{ borderLeftColor: log.level === 'error' ? '#ef4444' : log.level === 'warn' ? '#f59e0b' : '#e5e7eb' }}
                        >
                          <div className="flex flex-wrap justify-between items-start gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-block px-2 py-1 text-xs rounded-md font-bold" 
                                style={{ 
                                  backgroundColor: log.level === 'error' ? '#fee2e2' : log.level === 'warn' ? '#fef3c7' : '#f3f4f6',
                                  color: log.level === 'error' ? '#b91c1c' : log.level === 'warn' ? '#d97706' : '#374151'
                                }}
                              >
                                {log.level.toUpperCase()}
                              </span>
                              <span className={`inline-block px-2 py-1 text-xs rounded-md ${contextClass}`}>
                                {context}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                              {formatTimestamp(log.timestamp)}
                            </span>
                          </div>
                          <div className="text-sm mt-2 break-words">{log.message}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
} 