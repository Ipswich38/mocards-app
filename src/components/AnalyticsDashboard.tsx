import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface AnalyticsData {
  cardStats: {
    totalGenerated: number;
    assigned: number;
    activated: number;
    unassigned: number;
  };
  clinicStats: {
    totalClinics: number;
    activeClinics: number;
    totalRevenue: number;
  };
  perkStats: {
    totalRedemptions: number;
    popularPerks: Array<{ perk_type: string; count: number }>;
    todayRedemptions: number;
  };
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
  }>;
}

export function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Calculate date range
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90));

      // Load card statistics
      const { data: cards } = await supabase.from('cards').select('*');
      const { data: clinics } = await supabase.from('clinics').select('*');
      const { data: perks } = await supabase
        .from('card_perks')
        .select('*')
        .gte('created_at', startDate.toISOString());

      const cardStats = {
        totalGenerated: cards?.length || 0,
        assigned: cards?.filter(c => c.assigned_clinic_id).length || 0,
        activated: cards?.filter(c => c.status === 'activated').length || 0,
        unassigned: cards?.filter(c => !c.assigned_clinic_id).length || 0,
      };

      const clinicStats = {
        totalClinics: clinics?.length || 0,
        activeClinics: clinics?.filter(c => c.status === 'active').length || 0,
        totalRevenue: 0, // We'll calculate this from sales
      };

      // Calculate perk statistics
      const redemptions = perks?.filter(p => p.claimed) || [];
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const todayRedemptions = redemptions.filter(p =>
        p.claimed_at && new Date(p.claimed_at) >= todayStart
      ).length;

      // Calculate popular perks
      const perkCounts: Record<string, number> = {};
      redemptions.forEach(perk => {
        perkCounts[perk.perk_type] = (perkCounts[perk.perk_type] || 0) + 1;
      });

      const popularPerks = Object.entries(perkCounts)
        .map(([perk_type, count]) => ({ perk_type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const perkStats = {
        totalRedemptions: redemptions.length,
        popularPerks,
        todayRedemptions,
      };

      // Generate recent activity (mock data for now)
      const recentActivity = [
        {
          id: '1',
          type: 'card_generated',
          description: `Generated batch of ${cardStats.totalGenerated > 0 ? 'new' : '0'} cards`,
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
        },
        {
          id: '2',
          type: 'clinic_added',
          description: 'New clinic registered: Bright Smiles Dental',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
        },
        {
          id: '3',
          type: 'perk_redeemed',
          description: `${todayRedemptions} perks redeemed today`,
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
        },
      ];

      setAnalytics({
        cardStats,
        clinicStats,
        perkStats,
        recentActivity,
      });

    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'card_generated':
        return '💳';
      case 'clinic_added':
        return '🏥';
      case 'perk_redeemed':
        return '🎁';
      default:
        return '📊';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-gray-200 h-32 rounded-2xl"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-200 h-64 rounded-2xl"></div>
            <div className="bg-gray-200 h-64 rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-8 text-gray-500">
        Failed to load analytics data
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-gray-500">Overview of your MOCARDS platform performance</p>
        </div>
        <div className="flex gap-2">
          {[
            { value: '7d', label: '7 Days' },
            { value: '30d', label: '30 Days' },
            { value: '90d', label: '90 Days' }
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setTimeRange(value as '7d' | '30d' | '90d')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Cards</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.cardStats.totalGenerated}</p>
              <p className="text-xs text-gray-500 mt-1">
                {analytics.cardStats.activated} activated
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              💳
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Clinics</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.clinicStats.activeClinics}</p>
              <p className="text-xs text-gray-500 mt-1">
                of {analytics.clinicStats.totalClinics} total
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              🏥
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Perks Redeemed</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.perkStats.totalRedemptions}</p>
              <p className="text-xs text-gray-500 mt-1">
                {analytics.perkStats.todayRedemptions} today
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              🎁
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Card Distribution</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round((analytics.cardStats.assigned / analytics.cardStats.totalGenerated) * 100) || 0}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {analytics.cardStats.unassigned} unassigned
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              📊
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card Status Breakdown */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Card Status Overview</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-sm font-medium text-gray-700">Activated</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900">{analytics.cardStats.activated}</span>
                <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${(analytics.cardStats.activated / analytics.cardStats.totalGenerated) * 100}%`
                    }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span className="text-sm font-medium text-gray-700">Assigned</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900">{analytics.cardStats.assigned}</span>
                <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${(analytics.cardStats.assigned / analytics.cardStats.totalGenerated) * 100}%`
                    }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-gray-400 rounded"></div>
                <span className="text-sm font-medium text-gray-700">Unassigned</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900">{analytics.cardStats.unassigned}</span>
                <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gray-400 rounded-full transition-all duration-500"
                    style={{
                      width: `${(analytics.cardStats.unassigned / analytics.cardStats.totalGenerated) * 100}%`
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Popular Perks */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Popular Perks</h3>
          <div className="space-y-3">
            {analytics.perkStats.popularPerks.length > 0 ? (
              analytics.perkStats.popularPerks.map((perk, index) => (
                <div key={perk.perk_type} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded text-xs font-bold flex items-center justify-center">
                      {index + 1}
                    </div>
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {perk.perk_type.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">{perk.count}</span>
                    <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                        style={{
                          width: `${(perk.count / Math.max(...analytics.perkStats.popularPerks.map(p => p.count))) * 100}%`
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No perk redemptions yet</p>
                <p className="text-xs mt-1">Data will appear as clinics start redeeming perks</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {analytics.recentActivity.map((activity) => (
            <div key={activity.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
              <div className="text-2xl">{getActivityIcon(activity.type)}</div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                <p className="text-xs text-gray-500">{formatTimeAgo(activity.timestamp)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}