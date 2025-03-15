import { useState, useEffect } from 'react';
import Head from 'next/head';

// Dashboard components
import SchedulerStatus from '../components/dashboard/SchedulerStatus';
import FollowingsStats from '../components/dashboard/FollowingsStats';
import EventStats from '../components/dashboard/EventStats';
import EventDetectionRuns from '../components/dashboard/EventDetectionRuns';
import Layout from '../components/dashboard/Layout';

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    // Set current time and update it every minute
    const updateCurrentTime = () => {
      setCurrentTime(formatDate(new Date()));
    };
    
    // Update time immediately
    updateCurrentTime();
    
    // Set up interval to update time every minute
    const intervalId = setInterval(updateCurrentTime, 60000);
    
    // Fetch initial data
    const loadData = async () => {
      try {
        // Initial load of data here
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setIsLoading(false);
      }
    };

    loadData();
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  // Format date to match the scheduler's format and ensure correct timezone
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  return (
    <Layout>
      <Head>
        <title>Majaliss Conferences Dashboard</title>
        <meta name="description" content="Monitor Majaliss automation" />
      </Head>

      <div className="container mx-auto px-4">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <div className="text-sm text-gray-600">
            Last updated: {currentTime}
          </div>
        </div>

        {isLoading ? (
          <div className="w-full flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Full-width scheduler status */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
              <SchedulerStatus />
            </div>
            
            {/* Two-column layout for event detection and followings */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                <EventStats />
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                <FollowingsStats />
              </div>
            </div>

            {/* Event Detection Runs - Full width */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
              <EventDetectionRuns />
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
} 