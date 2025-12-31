/**
 * Enterprise Analytics Dashboard
 * Advanced business intelligence and performance monitoring
 * @version 1.0.0
 */

import { useState, useEffect } from 'react';
import { useToast } from '../../hooks/useToast';
import {
  BarChart3,
  TrendingUp,
  Users,
  CreditCard,
  Building,
  Activity,
  Download,
  RefreshCw,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle
} from 'lucide-react';

interface AnalyticsMetrics {
  totalClinics: number;
  activeClinics: number;
  totalCards: number;
  cardsGenerated30d: number;
  cardActivationRate: number;
  averageCardsPerClinic: number;
  topRegions: Array<{ region: string; clinics: number; cards: number }>;
  monthlyGrowth: Array<{ month: string; clinics: number; cards: number }>;
  clinicPerformance: Array<{
    clinicName: string;
    cardsGenerated: number;
    activationRate: number;
    revenue: number
  }>;
  systemHealth: {
    uptime: number;
    responseTime: number;
    errorRate: number;
    securityScore: number;
  };
}

interface DateRange {
  start: string;
  end: string;
}

export function EnterpriseAnalytics() {
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'overview' | 'clinics' | 'cards' | 'performance'>('overview');
  const { addToast } = useToast();

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      // Simulate enterprise analytics data fetching
      // In production, this would connect to your analytics API
      await new Promise(resolve => setTimeout(resolve, 1000));

      const mockMetrics: AnalyticsMetrics = {
        totalClinics: 247,
        activeClinics: 235,
        totalCards: 89750,
        cardsGenerated30d: 12845,
        cardActivationRate: 87.5,
        averageCardsPerClinic: 363.4,
        topRegions: [
          { region: 'NCR', clinics: 89, cards: 32456 },
          { region: 'CALABARZON', clinics: 45, cards: 18290 },
          { region: 'Central Luzon', clinics: 38, cards: 15678 },
          { region: 'Central Visayas', clinics: 31, cards: 12890 },
          { region: 'Western Visayas', clinics: 25, cards: 9876 }
        ],
        monthlyGrowth: [
          { month: 'Jan', clinics: 198, cards: 65432 },
          { month: 'Feb', clinics: 210, cards: 69875 },
          { month: 'Mar', clinics: 225, cards: 74320 },
          { month: 'Apr', clinics: 235, cards: 79845 },
          { month: 'May', clinics: 247, cards: 89750 }
        ],
        clinicPerformance: [
          { clinicName: 'Smile Plus Dental Center', cardsGenerated: 1250, activationRate: 94.2, revenue: 156250 },
          { clinicName: 'Perfect Teeth Clinic', cardsGenerated: 980, activationRate: 91.5, revenue: 122500 },
          { clinicName: 'Dental Care Pro', cardsGenerated: 875, activationRate: 89.1, revenue: 109375 },
          { clinicName: 'Elite Dental Services', cardsGenerated: 760, activationRate: 87.8, revenue: 95000 }
        ],
        systemHealth: {
          uptime: 99.97,
          responseTime: 120,
          errorRate: 0.03,
          securityScore: 98.5
        }
      };

      setMetrics(mockMetrics);
      addToast({type: 'success', title: 'Analytics Updated', message: 'Enterprise analytics refreshed successfully'});
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      addToast({type: 'error', title: 'Analytics Error', message: 'Failed to load analytics data'});
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange, selectedRegion]);

  const exportData = (format: 'csv' | 'pdf') => {
    addToast({type: 'success', title: 'Export Started', message: `Generating ${format.toUpperCase()} export...`});
    // Implement export functionality
  };

  if (isLoading || !metrics) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-300 rounded w-64"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-300 rounded-lg"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-64 bg-gray-300 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const MetricCard = ({
    title,
    value,
    change,
    icon: Icon,
    trend
  }: {
    title: string;
    value: string | number;
    change?: string;
    icon: any;
    trend?: 'up' | 'down' | 'stable'
  }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
          {change && (
            <div className={`flex items-center mt-2 text-sm ${
              trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'
            }`}>
              {trend === 'up' && <ArrowUpRight className="h-4 w-4 mr-1" />}
              {trend === 'down' && <ArrowDownRight className="h-4 w-4 mr-1" />}
              {change}
            </div>
          )}
        </div>
        <div className="p-3 bg-blue-50 rounded-full">
          <Icon className="h-6 w-6 text-blue-600" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Enterprise Analytics</h1>
              <p className="text-gray-600 mt-2">Advanced business intelligence and performance monitoring</p>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-4">
              <button
                onClick={() => fetchAnalytics()}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
              <button
                onClick={() => exportData('csv')}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </button>
              <button
                onClick={() => exportData('pdf')}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-6 border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', name: 'Overview', icon: BarChart3 },
                { id: 'clinics', name: 'Clinics', icon: Building },
                { id: 'cards', name: 'Cards', icon: CreditCard },
                { id: 'performance', name: 'Performance', icon: Target }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setViewMode(tab.id as any)}
                  className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    viewMode === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-4 w-4 mr-2" />
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Region</label>
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="all">All Regions</option>
                {metrics.topRegions.map(region => (
                  <option key={region.region} value={region.region}>{region.region}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Clinics"
            value={metrics.totalClinics.toLocaleString()}
            change="+5.2% from last month"
            icon={Building}
            trend="up"
          />
          <MetricCard
            title="Active Clinics"
            value={metrics.activeClinics.toLocaleString()}
            change="95.1% of total"
            icon={Users}
            trend="up"
          />
          <MetricCard
            title="Total Cards"
            value={metrics.totalCards.toLocaleString()}
            change="+12.8% from last month"
            icon={CreditCard}
            trend="up"
          />
          <MetricCard
            title="Activation Rate"
            value={`${metrics.cardActivationRate}%`}
            change="+2.3% improvement"
            icon={TrendingUp}
            trend="up"
          />
        </div>

        {/* System Health */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="System Uptime"
            value={`${metrics.systemHealth.uptime}%`}
            change="Last 30 days"
            icon={Activity}
            trend="up"
          />
          <MetricCard
            title="Response Time"
            value={`${metrics.systemHealth.responseTime}ms`}
            change="Average"
            icon={Target}
            trend="stable"
          />
          <MetricCard
            title="Error Rate"
            value={`${metrics.systemHealth.errorRate}%`}
            change="Very low"
            icon={AlertTriangle}
            trend="down"
          />
          <MetricCard
            title="Security Score"
            value={`${metrics.systemHealth.securityScore}/100`}
            change="Excellent"
            icon={Activity}
            trend="up"
          />
        </div>

        {/* Content based on view mode */}
        {viewMode === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Regional Performance */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Regions</h3>
              <div className="space-y-4">
                {metrics.topRegions.map((region, index) => (
                  <div key={region.region} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold mr-3">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium text-gray-900">{region.region}</p>
                        <p className="text-sm text-gray-600">{region.clinics} clinics</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{region.cards.toLocaleString()}</p>
                      <p className="text-sm text-gray-600">cards</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Monthly Growth */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Growth</h3>
              <div className="space-y-4">
                {metrics.monthlyGrowth.map((month) => (
                  <div key={month.month} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">{month.month} 2024</span>
                    <div className="flex space-x-4 text-sm">
                      <span className="text-blue-600">{month.clinics} clinics</span>
                      <span className="text-green-600">{month.cards.toLocaleString()} cards</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {viewMode === 'clinics' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Top Performing Clinics</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clinic</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cards Generated</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activation Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {metrics.clinicPerformance.map((clinic, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{clinic.clinicName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {clinic.cardsGenerated.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          clinic.activationRate >= 90 ? 'bg-green-100 text-green-800' :
                          clinic.activationRate >= 80 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {clinic.activationRate}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₱{clinic.revenue.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}