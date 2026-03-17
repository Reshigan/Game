import { useMemo } from 'react';
import { Card } from './ui/Card';
import { BarChart, LineChart, PieChart, Table } from './ui/Charts';
import { Button } from './ui/Button';
import { Download, Filter, RefreshCw } from 'lucide-react';

interface AnalyticsData {
  totalClicks: number;
  uniqueVisitors: number;
  topWords: Array<{ word: string; clicks: number; percentage: number }>;
  clickTrends: Array<{ date: string; clicks: number }>;
  deviceBreakdown: Array<{ device: string; count: number; percentage: number }>;
  hourlyDistribution: Array<{ hour: number; clicks: number }>;
  wordInteractions: Array<{ word: string; clicks: number; avgDuration: number }>;
}

interface AnalyticsDashboardProps {
  analytics: AnalyticsData;
}

export function AnalyticsDashboard({ analytics }: AnalyticsDashboardProps) {
  const totalClicks = analytics.totalClicks;
  const uniqueVisitors = analytics.uniqueVisitors;
  const avgClicksPerVisitor = uniqueVisitors > 0 ? (totalClicks / uniqueVisitors).toFixed(1) : '0';

  const topWords = useMemo(() => analytics.topWords.slice(0, 5), [analytics.topWords]);
  const hourlyDistribution = useMemo(() => analytics.hourlyDistribution, [analytics.hourlyDistribution]);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total Clicks</dt>
                <dd>
                  <div className="text-lg font-bold text-gray-900">{totalClicks.toLocaleString()}</div>
                </dd>
              </dl>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-green-500 text-white">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Unique Visitors</dt>
                <dd>
                  <div className="text-lg font-bold text-gray-900">{uniqueVisitors.toLocaleString()}</div>
                </dd>
              </dl>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-purple-500 text-white">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Avg Clicks/Visitor</dt>
                <dd>
                  <div className="text-lg font-bold text-gray-900">{avgClicksPerVisitor}</div>
                </dd>
              </dl>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Words */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Top Clicked Words</h3>
            <Button variant="ghost" size="sm">
              <Download className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-4">
            {topWords.map((word, index) => (
              <div key={index} className="flex items-center">
                <div className="flex-shrink-0 w-8 text-right">
                  <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                </div>
                <div className="ml-4 flex-1 min-w-0">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-900 truncate">{word.word}</span>
                    <span className="ml-2 text-sm text-gray-500">
                      ({word.clicks.toLocaleString()} clicks, {word.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${word.percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Click Trends */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Click Trends</h3>
            <div className="flex space-x-2">
              <Button variant="ghost" size="sm">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="h-64">
            <LineChart 
              data={analytics.clickTrends} 
              xKey="date" 
              yKey="clicks" 
              title="Clicks Over Time"
            />
          </div>
        </Card>

        {/* Device Breakdown */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Device Breakdown</h3>
            <Button variant="ghost" size="sm">
              <Download className="h-4 w-4" />
            </Button>
          </div>
          <div className="h-64">
            <PieChart 
              data={analytics.deviceBreakdown} 
              labelKey="device" 
              valueKey="count" 
              title="Clicks by Device"
            />
          </div>
        </Card>

        {/* Hourly Distribution */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Hourly Distribution</h3>
            <Button variant="ghost" size="sm">
              <Download className="h-4 w-4" />
            </Button>
          </div>
          <div className="h-64">
            <BarChart 
              data={hourlyDistribution} 
              xKey="hour" 
              yKey="clicks" 
              title="Clicks by Hour"
              xLabel="Hour of Day"
              yLabel="Clicks"
            />
          </div>
        </Card>
      </div>

      {/* Word Interactions */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Detailed Word Interactions</h3>
          <div className="flex space-x-2">
            <Button variant="ghost" size="sm">
              <Filter className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Table 
          data={analytics.wordInteractions} 
          columns={[
            { header: 'Word', key: 'word' },
            { header: 'Clicks', key: 'clicks', align: 'right' },
            { header: 'Avg Duration (s)', key: 'avgDuration', align: 'right' },
          ]}
        />
      </Card>
    </div>
  );
}