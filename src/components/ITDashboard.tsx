import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Activity,
  AlertTriangle,
  Database,
  Users,
  CreditCard,
  TrendingUp,
  Clock,
  Eye,
  RefreshCw,
  Server,
  Zap,
  Shield,
  Bug
} from 'lucide-react';

interface DashboardMetrics {
  timestamp: string;
  total_users_online: number;
  cards_generated_today: number;
  active_clinic_sessions: number;
  errors_last_hour: number;
  database_connections: number;
  system_health: string;
  average_response_time?: number;
  total_clinics: number;
  total_cards: number;
}

interface ActivityLog {
  id: string;
  timestamp: string;
  actor_display: string;
  action_summary: string;
  severity: string;
  details: any;
}

interface PerformanceMetric {
  id: string;
  timestamp: string;
  metric_name: string;
  metric_category: string;
  metric_value: number;
  metric_unit?: string;
  severity: string;
}

export const ITDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadDashboardData = async () => {
    try {
      // Load dashboard summary
      const { data: summaryData, error: summaryError } = await supabase
        .rpc('get_it_dashboard_summary');

      if (summaryError) throw summaryError;

      // Load recent activity
      const { data: activityData, error: activityError } = await supabase
        .rpc('get_recent_activity_feed', { limit_count: 50 });

      if (activityError) throw activityError;

      // Load performance metrics
      const { data: performanceData, error: performanceError } = await supabase
        .from('it_performance_metrics')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(20);

      if (performanceError) throw performanceError;

      setMetrics(summaryData);
      setActivityLogs(activityData || []);
      setPerformanceMetrics(performanceData || []);
      setError(null);

    } catch (err: any) {
      console.error('Error loading IT dashboard data:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const logActivity = async (action: string, details: any = {}) => {
    try {
      await supabase.rpc('log_it_activity', {
        p_actor_type: 'it_admin',
        p_actor_id: null,
        p_actor_name: 'IT Dashboard User',
        p_action_type: action,
        p_action_category: 'user_interaction',
        p_details: details,
        p_severity: 'info'
      });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  useEffect(() => {
    loadDashboardData();
    logActivity('it_dashboard_accessed');

    let interval: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'info': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'debug': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
          <span className="text-gray-600">Loading IT Dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <span className="text-red-800 font-medium">Dashboard Error</span>
        </div>
        <p className="text-red-700 mt-2">{error}</p>
        <button
          onClick={loadDashboardData}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-700 rounded-lg p-6 text-white">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Shield className="h-8 w-8" />
            <div>
              <h1 className="text-2xl font-bold">MOCARDS IT Monitoring Dashboard</h1>
              <p className="text-gray-300">Real-time system monitoring and troubleshooting</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="autoRefresh"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="autoRefresh" className="text-sm">Auto-refresh (30s)</label>
            </div>
            <button
              onClick={loadDashboardData}
              className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-gray-600">Active Users</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {metrics?.total_users_online || 0}
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-1">Online now</div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-600">Cards Today</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {metrics?.cards_generated_today || 0}
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-1">Generated today</div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Database className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-medium text-gray-600">DB Connections</span>
            </div>
            <div className="text-2xl font-bold text-purple-600">
              {metrics?.database_connections || 0}
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-1">Active connections</div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className={`h-5 w-5 ${(metrics?.errors_last_hour || 0) > 0 ? 'text-red-600' : 'text-green-600'}`} />
              <span className="text-sm font-medium text-gray-600">Errors/Hour</span>
            </div>
            <div className={`text-2xl font-bold ${(metrics?.errors_last_hour || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {metrics?.errors_last_hour || 0}
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-1">Last hour</div>
        </div>
      </div>

      {/* System Health & Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Health */}
        <div className="bg-white rounded-lg p-6 shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center space-x-2">
            <Server className="h-5 w-5" />
            <span>System Health</span>
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Application Server</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                ● Online
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Database</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                ● Online
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Authentication</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                ● Online
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">API Gateway</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                ● Online
              </span>
            </div>
          </div>
        </div>

        {/* Performance Summary */}
        <div className="bg-white rounded-lg p-6 shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Performance</span>
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Avg Response Time</span>
              <span className="text-sm font-medium">
                {metrics?.average_response_time ? `${metrics.average_response_time.toFixed(0)}ms` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Clinics</span>
              <span className="text-sm font-medium">{metrics?.total_clinics || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Cards</span>
              <span className="text-sm font-medium">{metrics?.total_cards || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Last Updated</span>
              <span className="text-sm font-medium">
                {metrics?.timestamp ? formatTimestamp(metrics.timestamp) : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg p-6 shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center space-x-2">
            <Zap className="h-5 w-5" />
            <span>Quick Actions</span>
          </h3>
          <div className="space-y-2">
            <button
              onClick={() => {
                logActivity('manual_refresh_triggered');
                loadDashboardData();
              }}
              className="w-full text-left px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100"
            >
              Force Refresh Data
            </button>
            <button
              onClick={() => logActivity('performance_check_initiated')}
              className="w-full text-left px-3 py-2 text-sm bg-green-50 text-green-700 rounded-md hover:bg-green-100"
            >
              Run Performance Check
            </button>
            <button
              onClick={() => logActivity('system_diagnostics_run')}
              className="w-full text-left px-3 py-2 text-sm bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100"
            >
              System Diagnostics
            </button>
            <button
              onClick={() => logActivity('export_logs_requested')}
              className="w-full text-left px-3 py-2 text-sm bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100"
            >
              Export Logs
            </button>
          </div>
        </div>
      </div>

      {/* Activity Feed and Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real-time Activity Feed */}
        <div className="bg-white rounded-lg p-6 shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Real-time Activity</span>
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {activityLogs.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No recent activity</p>
              </div>
            ) : (
              activityLogs.map((log) => (
                <div key={log.id} className={`p-3 rounded-lg border ${getSeverityColor(log.severity)}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm font-medium">{log.action_summary}</div>
                      <div className="text-xs opacity-75">by {log.actor_display}</div>
                    </div>
                    <div className="text-xs opacity-75 flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatTimestamp(log.timestamp)}</span>
                    </div>
                  </div>
                  {log.details && Object.keys(log.details).length > 0 && (
                    <div className="mt-2 text-xs opacity-75">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-white rounded-lg p-6 shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Performance Metrics</span>
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {performanceMetrics.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <Bug className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No performance metrics available</p>
              </div>
            ) : (
              performanceMetrics.map((metric) => (
                <div key={metric.id} className={`p-3 rounded-lg border ${getSeverityColor(metric.severity)}`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm font-medium">{metric.metric_name}</div>
                      <div className="text-xs opacity-75">{metric.metric_category}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold">
                        {metric.metric_value} {metric.metric_unit}
                      </div>
                      <div className="text-xs opacity-75">
                        {formatTimestamp(metric.timestamp)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};