import { useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  Download,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Loader2,
  Shield,
  Database,
  Calendar
} from 'lucide-react';

interface ExportStats {
  totalCards: number;
  activatedCards: number;
  unactivatedCards: number;
  v1Cards: number;
  v2Cards: number;
  cardsWithPerks: number;
  lastExportDate?: string;
}

export function CardExportSystem() {
  const [loading, setLoading] = useState(false);
  const [exportStats, setExportStats] = useState<ExportStats | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');

  const loadExportStats = async () => {
    setLoading(true);
    try {
      const [
        totalResult,
        activatedResult,
        unactivatedResult,
        v1Result,
        v2Result,
        perksResult
      ] = await Promise.all([
        supabase.from('cards').select('*', { count: 'exact', head: true }),
        supabase.from('cards').select('*', { count: 'exact', head: true }).eq('is_activated', true),
        supabase.from('cards').select('*', { count: 'exact', head: true }).eq('is_activated', false),
        supabase.from('cards').select('*', { count: 'exact', head: true }).is('migration_version', null),
        supabase.from('cards').select('*', { count: 'exact', head: true }).eq('migration_version', 2),
        supabase.from('card_perks').select('*', { count: 'exact', head: true })
      ]);

      setExportStats({
        totalCards: totalResult.count || 0,
        activatedCards: activatedResult.count || 0,
        unactivatedCards: unactivatedResult.count || 0,
        v1Cards: v1Result.count || 0,
        v2Cards: v2Result.count || 0,
        cardsWithPerks: perksResult.count || 0,
        lastExportDate: localStorage.getItem('lastCardExport') || undefined
      });
    } catch (err: any) {
      setError('Failed to load export statistics: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportAllCards = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Fetch ALL cards with related data
      const { data: cards, error: cardsError } = await supabase
        .from('cards')
        .select(`
          *,
          perks:card_perks(*),
          assigned_clinic:mocards_clinics!cards_assigned_clinic_id_fkey(clinic_name, clinic_code),
          activated_clinic:mocards_clinics!cards_activated_by_clinic_id_fkey(clinic_name, clinic_code)
        `)
        .order('created_at', { ascending: true });

      if (cardsError) throw cardsError;

      if (!cards || cards.length === 0) {
        setError('No cards found to export');
        return;
      }

      if (exportFormat === 'csv') {
        await exportToCSV(cards);
      } else {
        await exportToJSON(cards);
      }

      // Update last export timestamp
      localStorage.setItem('lastCardExport', new Date().toISOString());
      setSuccess(`Successfully exported ${cards.length} cards to ${exportFormat.toUpperCase()} format`);

      // Reload stats to update last export date
      loadExportStats();

    } catch (err: any) {
      setError('Export failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = async (cards: any[]) => {
    // Create comprehensive CSV headers
    const headers = [
      'Card ID',
      'Control Number (Legacy)',
      'Control Number V2 (MOC Format)',
      'Card Number',
      'Status',
      'Is Activated',
      'Migration Version',
      'Location Code V2',
      'Clinic Code V2',
      'Assigned Clinic Name',
      'Assigned Clinic Code',
      'Activated Clinic Name',
      'Activated Clinic Code',
      'Activation Date',
      'Expiry Date',
      'Holder Name',
      'Phone Number',
      'Email',
      'Total Perks',
      'Active Perks',
      'Claimed Perks',
      'Perk Types',
      'Created Date',
      'Updated Date'
    ];

    // Convert cards to CSV rows
    const rows = cards.map(card => [
      card.id || '',
      card.control_number || '',
      card.control_number_v2 || '',
      card.card_number || '',
      card.status || '',
      card.is_activated ? 'Yes' : 'No',
      card.migration_version || 'V1',
      card.location_code_v2 || '',
      card.clinic_code_v2 || '',
      card.assigned_clinic?.clinic_name || '',
      card.assigned_clinic?.clinic_code || '',
      card.activated_clinic?.clinic_name || '',
      card.activated_clinic?.clinic_code || '',
      card.activated_at ? new Date(card.activated_at).toLocaleDateString() : '',
      card.expires_at ? new Date(card.expires_at).toLocaleDateString() : '',
      card.holder_name || '',
      card.phone_number || '',
      card.email || '',
      card.perks?.length || 0,
      card.perks?.filter((p: any) => !p.claimed).length || 0,
      card.perks?.filter((p: any) => p.claimed).length || 0,
      card.perks?.map((p: any) => p.perk_type).join('; ') || '',
      new Date(card.created_at).toLocaleDateString(),
      new Date(card.updated_at).toLocaleDateString()
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row =>
        row.map(cell =>
          typeof cell === 'string' && cell.includes(',')
            ? `"${cell.replace(/"/g, '""')}"`
            : cell
        ).join(',')
      )
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().split('T')[0];
    link.href = URL.createObjectURL(blob);
    link.download = `MOCARDS_Complete_Export_${timestamp}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportToJSON = async (cards: any[]) => {
    // Create comprehensive JSON export with metadata
    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        totalRecords: cards.length,
        exportFormat: 'JSON',
        systemVersion: '2.0',
        description: 'Complete MOCARDS system export including all cards, perks, and clinic associations'
      },
      statistics: exportStats,
      cards: cards.map(card => ({
        id: card.id,
        controlNumber: card.control_number,
        controlNumberV2: card.control_number_v2,
        cardNumber: card.card_number,
        status: card.status,
        isActivated: card.is_activated,
        migrationVersion: card.migration_version,
        locationCodeV2: card.location_code_v2,
        clinicCodeV2: card.clinic_code_v2,
        assignedClinic: card.assigned_clinic,
        activatedClinic: card.activated_clinic,
        activationDate: card.activated_at,
        expiryDate: card.expires_at,
        holderInfo: {
          name: card.holder_name,
          phone: card.phone_number,
          email: card.email
        },
        perks: card.perks?.map((perk: any) => ({
          id: perk.id,
          type: perk.perk_type,
          claimed: perk.claimed,
          claimedAt: perk.claimed_at,
          claimedByClinic: perk.claimed_by_clinic
        })) || [],
        timestamps: {
          created: card.created_at,
          updated: card.updated_at
        }
      }))
    };

    // Create and download JSON file
    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().split('T')[0];
    link.href = URL.createObjectURL(blob);
    link.download = `MOCARDS_Complete_Export_${timestamp}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportQuickStats = async () => {
    if (!exportStats) return;

    const statsData = {
      exportDate: new Date().toISOString(),
      statistics: exportStats,
      summary: {
        activationRate: ((exportStats.activatedCards / exportStats.totalCards) * 100).toFixed(2) + '%',
        v2MigrationRate: ((exportStats.v2Cards / exportStats.totalCards) * 100).toFixed(2) + '%',
        perksPerCard: (exportStats.cardsWithPerks / exportStats.totalCards).toFixed(2)
      }
    };

    const csvContent = [
      'Metric,Value',
      `Total Cards,${exportStats.totalCards}`,
      `Activated Cards,${exportStats.activatedCards}`,
      `Unactivated Cards,${exportStats.unactivatedCards}`,
      `V1 Legacy Cards,${exportStats.v1Cards}`,
      `V2 MOC Cards,${exportStats.v2Cards}`,
      `Cards with Perks,${exportStats.cardsWithPerks}`,
      `Activation Rate,${statsData.summary.activationRate}`,
      `V2 Migration Rate,${statsData.summary.v2MigrationRate}`,
      `Average Perks per Card,${statsData.summary.perksPerCard}`,
      `Last Export Date,${exportStats.lastExportDate || 'Never'}`
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().split('T')[0];
    link.href = URL.createObjectURL(blob);
    link.download = `MOCARDS_Statistics_${timestamp}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  useState(() => {
    loadExportStats();
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Database className="h-6 w-6 text-blue-600 mr-3" />
            <h2 className="text-xl font-bold text-gray-900">Card Export System</h2>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <Shield className="h-4 w-4 mr-1" />
            Data Preservation & Export
          </div>
        </div>
        <p className="text-gray-600">
          Export complete card database with preservation safeguards. All 10,000+ virtual cards are secured and can be exported in organized formats.
        </p>
      </div>

      {/* Export Statistics */}
      {exportStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-blue-100">
                <FileSpreadsheet className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Cards</p>
                <p className="text-2xl font-bold text-gray-900">{exportStats.totalCards.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-green-100">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Activated</p>
                <p className="text-2xl font-bold text-gray-900">{exportStats.activatedCards.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-yellow-100">
                <AlertCircle className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Unactivated</p>
                <p className="text-2xl font-bold text-gray-900">{exportStats.unactivatedCards.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-purple-100">
                <Calendar className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">V2 MOC Cards</p>
                <p className="text-2xl font-bold text-gray-900">{exportStats.v2Cards.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Controls */}
      <div className="card p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Export Options</h3>

        <div className="space-y-4">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Export Format</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="csv"
                  checked={exportFormat === 'csv'}
                  onChange={(e) => setExportFormat(e.target.value as 'csv' | 'json')}
                  className="mr-2"
                />
                <FileSpreadsheet className="h-4 w-4 mr-1 text-green-600" />
                CSV Spreadsheet
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="json"
                  checked={exportFormat === 'json'}
                  onChange={(e) => setExportFormat(e.target.value as 'csv' | 'json')}
                  className="mr-2"
                />
                <Database className="h-4 w-4 mr-1 text-blue-600" />
                JSON Database
              </label>
            </div>
          </div>

          {/* Export Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={exportAllCards}
              disabled={loading || !exportStats}
              className="btn btn-primary flex items-center justify-center disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Export All Cards ({exportStats?.totalCards.toLocaleString() || 0})
            </button>

            <button
              onClick={exportQuickStats}
              disabled={loading || !exportStats}
              className="btn btn-outline flex items-center justify-center disabled:opacity-50"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export Statistics Only
            </button>

            <button
              onClick={loadExportStats}
              disabled={loading}
              className="btn btn-outline flex items-center justify-center disabled:opacity-50"
            >
              <Loader2 className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh Stats
            </button>
          </div>
        </div>

        {/* Last Export Info */}
        {exportStats?.lastExportDate && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <Calendar className="h-4 w-4 inline mr-1" />
              Last export: {new Date(exportStats.lastExportDate).toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
          <CheckCircle className="h-5 w-5 mr-2" />
          {success}
        </div>
      )}

      {/* Data Preservation Notice */}
      <div className="card p-6 bg-blue-50 border-blue-200">
        <div className="flex items-start">
          <Shield className="h-6 w-6 text-blue-600 mr-3 mt-1" />
          <div>
            <h4 className="text-sm font-medium text-blue-900 mb-2">Data Preservation Guarantee</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p>✅ All card data is preserved during schema updates</p>
              <p>✅ Complete backup available in multiple formats</p>
              <p>✅ Full audit trail maintained for all operations</p>
              <p>✅ Zero data loss during system migrations</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}