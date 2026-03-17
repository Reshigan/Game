'use client';

import { useEffect, useState } from 'react';
import { AnalyticsDashboardProps } from '@/types/components';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { 
  Activity, 
  Users, 
  Clock, 
  TrendingUp, 
  Calendar, 
  Download,
  Filter,
  RefreshCw,
  Settings,
  MoreHorizontal
} from 'lucide-react';
import { formatDate, formatNumber, getWordCloudStats } from '@/lib/utils';
import { useWordCloudAnalytics } from '@/hooks/useWordCloudAnalytics';

const AnalyticsDashboard = ({
  wordCloudId,
  words,
  analyticsEvents,
  onDateRangeChange,
}: AnalyticsDashboardProps) => {
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalClicks: 0,
    totalViews: 0,
    avgDwellTime: 0,
    topWords: [] as Array<{ word: string; count: number }>,
  });
  const [timeSeriesData, setTimeSeriesData] = useState<Array<{ name: string; clicks: number; views: number }>>([]);
  const [wordDistribution, setWordDistribution] = useState<Array<{ name: string; value: number }>>([]);
  const [hourlyActivity, setHourlyActivity] = useState<Array<{ name: string; value: number }>>([]);
  
  const { trackEvent } = useWordCloudAnalytics();

  // Load analytics data
  useEffect(() => {
    const loadAnalytics = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // In production, this would fetch from the API
        // const res = await fetch(`/api/v1/word-clouds/${wordCloudId}/analytics?range=${dateRange}`);
        // const data = await res.json();
        
        // Mock data for demonstration
        const mockAnalytics = {
          totalClicks: 1247,
          totalViews: 8934,
          avgDwellTime: 45,
          topWords: [
            { word: 'innovation', count: 342 },
            { word: 'growth', count: 287 },
            { word: 'strategy', count: 215 },
            { word: 'impact', count: 198 },
            { word: 'future', count: 176 },
          ],
          timeSeries: [
            { name: 'Mon', clicks: 120, views: 850 },
            { name: 'Tue', clicks: 145, views: 920 },
            { name: 'Wed', clicks: 110, views: 780 },
            { name: 'Thu', clicks: 165, views: 1050 },
            { name: 'Fri', clicks: 190, views: 1200 },
            { name: 'Sat', clicks: 135, views: 980 },
            { name: 'Sun', clicks: 100, views: 750 },
          ],
          wordDistribution: [
            { name: 'High (10+)', value: 35 },
            { name: 'Medium (5-9)', value: 42 },
            { name: 'Low (1-4)', value: 23 },
          ],
          hourlyActivity: [
            { name: '00:00', value: 12 },
            { name: '04:00', value: 8 },
            { name: '08:00', value: 45 },
            { name: '12:00', value: 78 },
            { name: '16:00', value: 92 },
            { name: '20:00', value: 65 },
            { name: '23:59', value: 22 },
          ],
        };
        
        setStats({
          totalClicks: mockAnalytics.totalClicks,
          totalViews: mockAnalytics.totalViews,
          avgDwellTime: mockAnalytics.avgDwellTime,
          topWords: mockAnalytics.topWords,
        });
        
        setTimeSeriesData(mockAnalytics.timeSeries);
        setWordDistribution(mockAnalytics.wordDistribution);
        setHourlyActivity(mockAnalytics.hourlyActivity);
        
        setIsLoading(false);
      } catch (err) {
        setError('Failed to load analytics data');
        setIsLoading(false);
      }
    };
    
    loadAnalytics();
  }, [wordCloudId, dateRange]);

  // Handle date range change
  const handleDateRangeChange = (range: '7d' | '30d' | '90d' | 'all') => {
    setDateRange(range);
    onDateRangeChange?.(range);
    trackEvent('filter', `date-range-${range}`);
  };

  // Export analytics
  const handleExport = () => {
    trackEvent('export', 'analytics-report');
    // In production, this would trigger a job to generate and download the report
  };

  // Refresh analytics
  const handleRefresh = () => {
    setIsLoading(true);
    trackEvent('refresh', 'analytics-data');
    
    // Simulate refresh
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  // Color palette for charts
  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#10b981'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p className="text-slate-500 dark:text-slate-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg mb-4">
          <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Try Again</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Analytics Dashboard</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Track engagement and interactions with your word cloud
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <div className="flex bg-white dark:bg-slate-800 rounded-lg p-1 shadow-sm border border-slate-200 dark:border-slate-700">
            {(['7d', '30d', '90d', 'all'] as const).map((range) => (
              <button
                key={range}
                onClick={() => handleDateRangeChange(range)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  dateRange === range
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {range === '7d' ? 'Last 7 days' : range === '30d' ? 'Last 30 days' : range === '90d' ? 'Last 90 days' : 'All time'}
              </button>
            ))}
          </div>
          
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 transition-colors"
            aria-label="Refresh analytics"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg shadow-sm transition-colors"
            aria-label="Export analytics report"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Clicks</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{formatNumber(stats.totalClicks)}</p>
            </div>
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
              <Activity className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="h-4 w-4 text-emerald-500 mr-1" />
            <span className="text-emerald-500 font-medium">+12%</span>
            <span className="text-slate-500 dark:text-slate-400 ml-2">vs last period</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Views</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{formatNumber(stats.totalViews)}</p>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="h-4 w-4 text-emerald-500 mr-1" />
            <span className="text-emerald-500 font-medium">+8%</span>
            <span className="text-slate-500 dark:text-slate-400 ml-2">vs last period</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Avg Dwell Time</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.avgDwellTime}s</p>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="h-4 w-4 text-emerald-500 mr-1" />
            <span className="text-emerald-500 font-medium">+15%</span>
            <span className="text-slate-500 dark:text-slate-400 ml-2">vs last period</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Top Word</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1 truncate max-w-[150px]">
                {stats.topWords[0]?.word || 'N/A'}
              </p>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
              <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-slate-500 dark:text-slate-400">
              {stats.topWords[0]?.count || 0} clicks
            </span>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Time Series Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Engagement Over Time</h3>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-full bg-indigo-600"></div>
                <span className="text-sm text-slate-600 dark:text-slate-400">Clicks</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                <span className="text-sm text-slate-600 dark:text-slate-400">Views</span>
              </div>
            </div>
          </div>
          
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeSeriesData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    borderRadius: '8px', 
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
                  }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="clicks" 
                  stroke="#6366f1" 
                  fill="#6366f1" 
                  fillOpacity={0.2} 
                  strokeWidth={2}
                />
                <Area 
                  type="monotone" 
                  dataKey="views" 
                  stroke="#3b82f6" 
                  fill="#3b82f6" 
                  fillOpacity={0.2} 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Word Distribution */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Word Frequency Distribution</h3>
            <button className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300">
              View Details
            </button>
          </div>
          
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={wordDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {wordDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    borderRadius: '8px', 
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
                  }}
                />
                <Legend layout="vertical" verticalAlign="middle" align="right" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Hourly Activity */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Hourly Activity Pattern</h3>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-500" />
            <span className="text-sm text-slate-500 dark:text-slate-400">Peak activity at 16:00</span>
          </div>
        </div>
        
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlyActivity} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  borderRadius: '8px', 
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
                }}
              />
              <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Words */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Most Engaged Words</h3>
          <button className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300">
            <Settings className="h-4 w-4" />
            Configure
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500 dark:text-slate-400">Word</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500 dark:text-slate-400">Clicks</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500 dark:text-slate-400">Click Rate</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500 dark:text-slate-400">Avg Dwell Time</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-500 dark:text-slate-400">Engagement Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {stats.topWords.map((word, index) => (
                <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="py-3 px-4 text-sm font-medium text-slate-900 dark:text-white">{word.word}</td>
                  <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-300">{word.count}</td>
                  <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-300">
                    {((word.count / stats.totalClicks) * 100).toFixed(1)}%
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-300">
                    {Math.round(stats.avgDwellTime * 0.8 + Math.random() * 10)}s
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="h-2 w-24 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-600 rounded-full"
                          style={{ width: `${Math.min((word.count / stats.topWords[0].count) * 100, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {Math.round((word.count / stats.topWords[0].count) * 100)}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export interface AnalyticsDashboardProps {
  wordCloudId: string;
  words: Array<{ word: string; frequency: number }>;
  analyticsEvents?: Array<{ eventType: string; word: string; timestamp: string }>;
  onDateRangeChange?: (range: '7d' | '30d' | '90d' | 'all') => void;
}

export default AnalyticsDashboard;