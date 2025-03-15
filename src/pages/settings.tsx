import { useState, useEffect } from 'react';
import Head from 'next/head';
import Layout from '../components/dashboard/Layout';
import { useRouter } from 'next/router';

interface SchedulerConfig {
  followingsMinIntervalHours: number;
  followingsMaxIntervalHours: number;
  eventDetectorIntervalHours: number;
  postsPerAccount: number;
  minConfidenceThreshold: number;
  maxRetries: number;
  retryDelay: number;
}

export default function SettingsPage() {
  const [config, setConfig] = useState<SchedulerConfig>({
    followingsMinIntervalHours: 3.5,
    followingsMaxIntervalHours: 4.5,
    eventDetectorIntervalHours: 2,
    postsPerAccount: 5,
    minConfidenceThreshold: 90,
    maxRetries: 3,
    retryDelay: 5000
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const router = useRouter();

  // Fetch current config
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        // This would normally be an API call
        const response = await fetch('/api/scheduler/config');
        
        if (!response.ok) {
          throw new Error('Failed to fetch scheduler configuration');
        }
        
        const data = await response.json();
        setConfig(data);
        setError(null);
      } catch (error) {
        console.error('Error fetching config:', error);
        setError('Failed to load configuration. Using defaults.');
        // We'll use the default config defined in state
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, []);

  // Handle form changes
  const handleChange = (field: keyof SchedulerConfig, value: string) => {
    let parsedValue: number;
    
    if (field === 'followingsMinIntervalHours' || field === 'followingsMaxIntervalHours' || field === 'eventDetectorIntervalHours') {
      parsedValue = parseFloat(value);
    } else {
      parsedValue = parseInt(value, 10);
    }
    
    if (!isNaN(parsedValue)) {
      setConfig(prev => ({
        ...prev,
        [field]: parsedValue
      }));
    }
  };

  // Save configuration
  const saveConfig = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    
    try {
      // Validate config
      if (config.followingsMinIntervalHours >= config.followingsMaxIntervalHours) {
        throw new Error('Minimum followings interval must be less than maximum interval');
      }
      
      if (config.followingsMinIntervalHours < 1) {
        throw new Error('Minimum followings interval must be at least 1 hour');
      }
      
      if (config.eventDetectorIntervalHours < 0.5) {
        throw new Error('Event detector interval must be at least 30 minutes');
      }
      
      // This would normally be an API call
      const response = await fetch('/api/scheduler/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save configuration');
      }
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving config:', error);
      setError(error instanceof Error ? error.message : 'Failed to save configuration');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  // Restart the scheduler
  const restartScheduler = async () => {
    try {
      // This would normally be API calls
      await fetch('/api/scheduler/stop', { method: 'POST' });
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait a second
      await fetch('/api/scheduler/start', { method: 'POST' });
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error restarting scheduler:', error);
      setError('Failed to restart scheduler');
      setTimeout(() => setError(null), 5000);
    }
  };

  return (
    <Layout>
      <Head>
        <title>Settings | Instagram Automation</title>
        <meta name="description" content="Configure Instagram automation scheduler settings" />
      </Head>

      <div className="container py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Scheduler Settings</h1>
          <button
            onClick={() => router.push('/')}
            className="btn btn-secondary"
          >
            Back to Dashboard
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Timing settings */}
            <div className="card">
              <h2 className="header">Timing Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Followings Retrieval Min Interval (hours)
                  </label>
                  <input
                    type="number"
                    value={config.followingsMinIntervalHours}
                    onChange={(e) => handleChange('followingsMinIntervalHours', e.target.value)}
                    step="0.5"
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum time between followings retrieval (recommended: 3.5+)
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Followings Retrieval Max Interval (hours)
                  </label>
                  <input
                    type="number"
                    value={config.followingsMaxIntervalHours}
                    onChange={(e) => handleChange('followingsMaxIntervalHours', e.target.value)}
                    step="0.5"
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum time between followings retrieval (recommended: 4.5+)
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Detection Interval (hours)
                  </label>
                  <input
                    type="number"
                    value={config.eventDetectorIntervalHours}
                    onChange={(e) => handleChange('eventDetectorIntervalHours', e.target.value)}
                    step="0.5"
                    min="0.5"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    How often to scan for events (recommended: 2+)
                  </p>
                </div>
              </div>
            </div>
            
            {/* Scraping settings */}
            <div className="card">
              <h2 className="header">Scraping Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Posts Per Account
                  </label>
                  <input
                    type="number"
                    value={config.postsPerAccount}
                    onChange={(e) => handleChange('postsPerAccount', e.target.value)}
                    min="1"
                    max="20"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Number of recent posts to analyze from each account (1-20)
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Confidence Threshold (%)
                  </label>
                  <input
                    type="number"
                    value={config.minConfidenceThreshold}
                    onChange={(e) => handleChange('minConfidenceThreshold', e.target.value)}
                    min="50"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum confidence level to consider a post as an event (50-100)
                  </p>
                </div>
              </div>
            </div>
            
            {/* Error handling settings */}
            <div className="card">
              <h2 className="header">Error Handling</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Retries
                  </label>
                  <input
                    type="number"
                    value={config.maxRetries}
                    onChange={(e) => handleChange('maxRetries', e.target.value)}
                    min="1"
                    max="10"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Number of retry attempts on failure (1-10)
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Retry Delay (ms)
                  </label>
                  <input
                    type="number"
                    value={config.retryDelay}
                    onChange={(e) => handleChange('retryDelay', e.target.value)}
                    min="1000"
                    step="1000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Initial delay between retries in milliseconds (1000+)
                  </p>
                </div>
              </div>
            </div>
            
            {/* Controls */}
            <div className="card">
              <h2 className="header">Controls</h2>
              <p className="mb-6 text-sm text-gray-600">
                After changing settings, save your configuration and restart the scheduler for changes to take effect.
              </p>
              
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
                  {error}
                </div>
              )}
              
              {saveSuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-600 text-sm">
                  Settings saved successfully!
                </div>
              )}
              
              <div className="flex flex-col space-y-3">
                <button
                  onClick={saveConfig}
                  disabled={isSaving}
                  className="btn btn-primary"
                >
                  {isSaving ? 'Saving...' : 'Save Configuration'}
                </button>
                
                <button
                  onClick={restartScheduler}
                  className="btn bg-yellow-500 hover:bg-yellow-600 text-white"
                >
                  Restart Scheduler
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
} 