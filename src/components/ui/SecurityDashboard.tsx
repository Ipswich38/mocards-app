import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Eye, Clock, Users, Lock, Activity, TrendingUp } from 'lucide-react';
import { useSecurity } from '../../hooks/useSecurity';

interface SecurityMetrics {
  totalEvents: number;
  eventsBySeverity: Record<string, number>;
  recentThreats: Array<{
    id: string;
    type: string;
    severity: string;
    timestamp: Date;
    details: any;
  }>;
  rateLimitViolations: number;
  activeBlocks: number;
}

export const SecurityDashboard: React.FC<{
  className?: string;
  compact?: boolean;
}> = ({ className = '', compact = false }) => {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const { getSecurityMetrics } = useSecurity();

  useEffect(() => {
    const updateMetrics = () => {
      const data = getSecurityMetrics();
      setMetrics(data);
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [getSecurityMetrics]);

  if (!metrics) {
    return (
      <div className={`bg-[#1F2937] rounded-lg border border-[#374151] p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-[#374151] rounded w-48 mb-4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-[#374151] rounded w-full"></div>
            <div className="h-4 bg-[#374151] rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity.toUpperCase()) {
      case 'CRITICAL': return 'text-red-400 bg-red-900/20';
      case 'HIGH': return 'text-orange-400 bg-orange-900/20';
      case 'MEDIUM': return 'text-yellow-400 bg-yellow-900/20';
      case 'LOW': return 'text-blue-400 bg-blue-900/20';
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  const getSecurityScore = () => {
    const { eventsBySeverity } = metrics;
    const totalCritical = eventsBySeverity.CRITICAL || 0;
    const totalHigh = eventsBySeverity.HIGH || 0;
    const totalMedium = eventsBySeverity.MEDIUM || 0;

    let score = 100;
    score -= totalCritical * 20;
    score -= totalHigh * 10;
    score -= totalMedium * 5;

    return Math.max(score, 0);
  };

  const securityScore = getSecurityScore();
  const scoreColor = securityScore >= 80 ? 'text-green-400' : securityScore >= 60 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className={`bg-[#1F2937] rounded-lg border border-[#374151] ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#374151]">
        <div className="flex items-center">
          <Shield className="h-5 w-5 text-blue-400 mr-2" />
          <h3 className="text-[#E8EAED] font-medium">Security Monitor</h3>
          <div className={`ml-3 px-2 py-1 rounded text-xs font-medium ${scoreColor.replace('text-', 'bg-').replace('400', '900/20')}`}>
            Score: <span className={scoreColor}>{securityScore}/100</span>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-[#9AA0A6] hover:text-[#E8EAED] transition-colors"
        >
          <Eye className="h-4 w-4" />
        </button>
      </div>

      {/* Summary Stats */}
      <div className="p-4">
        <div className={`grid gap-4 mb-4 ${
          compact
            ? 'grid-cols-2'
            : 'grid-cols-2 md:grid-cols-4'
        }`}>
          <div className="bg-[#303134] rounded-lg p-3">
            <div className="flex items-center justify-between">
              <Activity className="h-4 w-4 text-blue-400" />
              <span className="text-xs text-[#9AA0A6]">Total Events</span>
            </div>
            <div className="text-lg font-bold text-[#E8EAED] mt-1">{metrics.totalEvents}</div>
          </div>

          <div className="bg-[#303134] rounded-lg p-3">
            <div className="flex items-center justify-between">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <span className="text-xs text-[#9AA0A6]">Threats</span>
            </div>
            <div className="text-lg font-bold text-[#E8EAED] mt-1">
              {(metrics.eventsBySeverity.HIGH || 0) + (metrics.eventsBySeverity.CRITICAL || 0)}
            </div>
          </div>

          <div className="bg-[#303134] rounded-lg p-3">
            <div className="flex items-center justify-between">
              <Lock className="h-4 w-4 text-yellow-400" />
              <span className="text-xs text-[#9AA0A6]">Rate Limits</span>
            </div>
            <div className="text-lg font-bold text-[#E8EAED] mt-1">{metrics.rateLimitViolations}</div>
          </div>

          <div className="bg-[#303134] rounded-lg p-3">
            <div className="flex items-center justify-between">
              <Users className="h-4 w-4 text-purple-400" />
              <span className="text-xs text-[#9AA0A6]">Blocked</span>
            </div>
            <div className="text-lg font-bold text-[#E8EAED] mt-1">{metrics.activeBlocks}</div>
          </div>
        </div>

        {/* Severity Breakdown */}
        <div className="mb-4">
          <h4 className="text-[#E8EAED] text-sm font-medium mb-2">Event Severity Distribution</h4>
          <div className="space-y-2">
            {Object.entries(metrics.eventsBySeverity).map(([severity, count]) => (
              <div key={severity} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-2 ${getSeverityColor(severity).split(' ')[1]}`}></div>
                  <span className="text-[#9AA0A6] text-sm capitalize">{severity.toLowerCase()}</span>
                </div>
                <span className="text-[#E8EAED] font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Expanded View */}
      {isExpanded && (
        <div className="border-t border-[#374151] p-4">
          <h4 className="text-[#E8EAED] text-sm font-medium mb-3">Recent Security Events</h4>

          {metrics.recentThreats.length === 0 ? (
            <div className="text-center py-4">
              <Shield className="h-8 w-8 text-green-400 mx-auto mb-2" />
              <p className="text-[#9AA0A6] text-sm">No security threats detected</p>
              <p className="text-[#9AA0A6] text-xs">All systems operating normally</p>
            </div>
          ) : (
            <div className="space-y-2">
              {metrics.recentThreats.slice(0, 5).map((threat) => (
                <div key={threat.id} className="bg-[#303134] rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-1">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(threat.severity)}`}>
                          {threat.severity}
                        </span>
                        <span className="text-[#9AA0A6] text-sm ml-2">
                          {threat.type.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-[#E8EAED] text-sm">{threat.details.reason || 'Security event detected'}</p>
                    </div>
                    <div className="flex items-center text-[#9AA0A6] text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {new Date(threat.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Security Recommendations */}
          <div className="mt-4 pt-4 border-t border-[#374151]">
            <h4 className="text-[#E8EAED] text-sm font-medium mb-2">Security Recommendations</h4>
            <div className="space-y-2">
              {securityScore < 80 && (
                <div className="flex items-start">
                  <TrendingUp className="h-4 w-4 text-yellow-400 mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[#E8EAED] text-sm">Improve Security Score</p>
                    <p className="text-[#9AA0A6] text-xs">Review recent security events and implement additional protections</p>
                  </div>
                </div>
              )}

              {metrics.rateLimitViolations > 10 && (
                <div className="flex items-start">
                  <Lock className="h-4 w-4 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[#E8EAED] text-sm">Review Rate Limiting</p>
                    <p className="text-[#9AA0A6] text-xs">High number of rate limit violations detected</p>
                  </div>
                </div>
              )}

              {(metrics.eventsBySeverity.HIGH || 0) + (metrics.eventsBySeverity.CRITICAL || 0) > 0 && (
                <div className="flex items-start">
                  <AlertTriangle className="h-4 w-4 text-red-400 mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[#E8EAED] text-sm">Address High Priority Threats</p>
                    <p className="text-[#9AA0A6] text-xs">Critical or high severity security events require attention</p>
                  </div>
                </div>
              )}

              {securityScore >= 80 && metrics.recentThreats.length === 0 && (
                <div className="flex items-start">
                  <Shield className="h-4 w-4 text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[#E8EAED] text-sm">Security Status Excellent</p>
                    <p className="text-[#9AA0A6] text-xs">All security systems operating normally</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};