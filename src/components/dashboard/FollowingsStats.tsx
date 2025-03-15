import { useState, useEffect, useRef } from 'react';
import DashboardCard, { 
  MetricDisplay, 
  LoadingSpinner, 
  ErrorDisplay, 
  EmptyState,
  NoChangeState
} from '../ui/DashboardCard';

interface FollowingsData {
  totalFollowings: number;
  dailyChange: number;
  weeklyChange: number;
  monthlyChange: number;
}

export default function FollowingsStats() {
  const [stats, setStats] = useState<FollowingsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const prevStatsRef = useRef<FollowingsData | null>(null);

  // Fetch followings stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Don't show loading indicator on refresh, only on initial load
        if (!isLoading) {
          setUpdating(true);
        }
        
        const response = await fetch('/api/followings/stats');
        
        if (!response.ok) {
          throw new Error('Failed to fetch followings statistics');
        }
        
        const data = await response.json();
        
        // Only update state if data has changed
        if (!prevStatsRef.current || 
            prevStatsRef.current.totalFollowings !== data.totalFollowings || 
            prevStatsRef.current.dailyChange !== data.dailyChange ||
            prevStatsRef.current.weeklyChange !== data.weeklyChange ||
            prevStatsRef.current.monthlyChange !== data.monthlyChange) {
          setStats(data);
          prevStatsRef.current = data;
        }
        
        setError(null);
      } catch (error) {
        console.error('Error fetching followings stats:', error);
        setError('Failed to load followings statistics');
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

  // Check if there are any changes in the stats
  const hasChanges = stats && (stats.dailyChange !== 0 || stats.weeklyChange !== 0 || stats.monthlyChange !== 0);

  const renderContent = () => {
    if (isLoading) {
      return <LoadingSpinner />;
    }

    if (error) {
      return <ErrorDisplay message={error} />;
    }

    if (!stats) {
      return (
        <EmptyState
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
          title="No Followings Data Available"
          description="We don't have any followings data to display yet."
          listItems={["Please check back later."]}
        />
      );
    }

    if (!hasChanges) {
      return (
        <>
          <MetricDisplay 
            label="Total Followings" 
            value={stats.totalFollowings.toString()} 
            className="mb-4"
          />
          <NoChangeState />
        </>
      );
    }

    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <MetricDisplay 
            label="Total Followings" 
            value={stats.totalFollowings.toString()} 
          />
          
          <MetricDisplay 
            label="Daily Change" 
            value={stats.dailyChange > 0 ? `+${stats.dailyChange}` : stats.dailyChange.toString()} 
            color={stats.dailyChange > 0 ? 'text-green-600' : stats.dailyChange < 0 ? 'text-red-600' : 'text-gray-600'}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MetricDisplay 
            label="Weekly Change" 
            value={stats.weeklyChange > 0 ? `+${stats.weeklyChange}` : stats.weeklyChange.toString()} 
            color={stats.weeklyChange > 0 ? 'text-green-600' : stats.weeklyChange < 0 ? 'text-red-600' : 'text-gray-600'}
          />
          
          <MetricDisplay 
            label="Monthly Change" 
            value={stats.monthlyChange > 0 ? `+${stats.monthlyChange}` : stats.monthlyChange.toString()} 
            color={stats.monthlyChange > 0 ? 'text-green-600' : stats.monthlyChange < 0 ? 'text-red-600' : 'text-gray-600'}
          />
        </div>
      </>
    );
  };

  return (
    <DashboardCard 
      title="Followings Stats" 
      className={`transition-opacity duration-300 ease-in-out ${updating ? 'opacity-70' : 'opacity-100'}`}
    >
      {renderContent()}
    </DashboardCard>
  );
} 