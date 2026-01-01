import { useState } from 'react';
import { Search, Calendar, User, Gift, Shield, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/useToast';
import { toastSuccess, toastWarning, toastError } from '../../lib/toast';

interface CardResult {
  id: string;
  control_number: string;
  status: string;
  perks_total: number;
  perks_used: number;
  created_at: string;
  expires_at?: string;
  activated_at?: string;
  clinic_name?: string;
  full_name?: string;
}

export function EnhancedCardLookupView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<CardResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isNotFound, setIsNotFound] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  const { addToast } = useToast();

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      addToast(toastWarning('Empty Search', 'Please enter a card number'));
      return;
    }

    setIsLoading(true);
    setIsNotFound(false);
    setSearchResult(null);

    console.log('[Enhanced Lookup] Searching for:', searchQuery);

    try {
      // Direct Supabase query with multiple search patterns
      const searchTerm = searchQuery.trim().toUpperCase();

      // BULLETPROOF SEARCH: Try exact match first, then simple contains
      let { data, error } = await supabase
        .from('cards')
        .select('*')
        .eq('control_number', searchTerm)
        .limit(10);

      // If exact match fails, try case-insensitive contains search
      if (!error && (!data || data.length === 0)) {
        const result = await supabase
          .from('cards')
          .select('*')
          .ilike('control_number', `%${searchTerm}%`)
          .limit(10);

        data = result.data;
        error = result.error;
      }

      console.log('[Enhanced Lookup] Search result:', {
        searchTerm,
        data,
        error,
        count: data?.length
      });

      if (error) {
        console.error('[Enhanced Lookup] Search error:', error);
        throw error;
      }

      if (data && data.length > 0) {
        // Transform the result
        const card = data[0];

        // Get clinic name separately to avoid relationship issues
        let clinic_name = 'Not Assigned';
        if (card.assigned_clinic_id) {
          try {
            const { data: clinicData } = await supabase
              .from('clinics')
              .select('clinic_name')
              .eq('id', card.assigned_clinic_id)
              .single();

            if (clinicData) {
              clinic_name = clinicData.clinic_name;
            }
          } catch (err) {
            console.log('Could not fetch clinic name:', err);
          }
        }

        const transformedCard: CardResult = {
          id: card.id,
          control_number: card.control_number,
          status: card.status || 'inactive',
          perks_total: card.perks_total || 5,
          perks_used: card.perks_used || 0,
          created_at: card.created_at,
          expires_at: card.expires_at,
          activated_at: card.activated_at,
          clinic_name: clinic_name,
          full_name: card.full_name || 'Not Activated'
        };

        setSearchResult(transformedCard);

        // Add to search history
        if (!searchHistory.includes(searchTerm)) {
          setSearchHistory(prev => [searchTerm, ...prev].slice(0, 5));
        }

        addToast(toastSuccess('Card Found!', `Found card: ${transformedCard.control_number}`));
      } else {
        setIsNotFound(true);
        addToast(toastWarning('Card Not Found', `No card found with number: ${searchTerm}`));
      }

    } catch (error) {
      console.error('[Enhanced Lookup] Error:', error);
      addToast(toastError('Search Error', `Failed to search: ${error instanceof Error ? error.message : 'Unknown error'}`));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'activated':
        return 'text-green-600 bg-green-100';
      case 'inactive':
        return 'text-yellow-600 bg-yellow-100';
      case 'expired':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'activated':
        return <CheckCircle className="h-4 w-4" />;
      case 'inactive':
        return <Clock className="h-4 w-4" />;
      case 'expired':
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-3 sm:px-0">
      <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-4 sm:mb-6">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Search className="h-6 w-6 sm:h-7 sm:w-7 text-blue-600" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Card Lookup</h1>
            <p className="text-gray-600 text-xs sm:text-sm px-4">Search for any MOC card using the card number</p>
          </div>

          {/* Search Section */}
          <div className="light-card p-3 sm:p-5 mb-3 sm:mb-5">
            <div className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="light-input pl-10"
                  placeholder="Enter card number (e.g., MOC-00001-01-CVT001)"
                  disabled={isLoading}
                />
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>

              <button
                onClick={handleSearch}
                disabled={isLoading || !searchQuery.trim()}
                className="light-button-primary w-full flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <Search className="h-5 w-5" />
                    <span>Search Card</span>
                  </>
                )}
              </button>
            </div>

            {/* Search History */}
            {searchHistory.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-2">Recent searches:</p>
                <div className="flex flex-wrap gap-2">
                  {searchHistory.map((term, index) => (
                    <button
                      key={index}
                      onClick={() => setSearchQuery(term)}
                      className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Results Section */}
          {searchResult && (
            <div className="light-card p-6">
              <div className="flex items-start justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Card Information</h2>
                <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1 ${getStatusColor(searchResult.status)}`}>
                  {getStatusIcon(searchResult.status)}
                  <span className="capitalize">{searchResult.status}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
                    <div className="flex items-center space-x-2">
                      <Shield className="h-4 w-4 text-blue-500" />
                      <span className="font-mono text-lg font-semibold">{searchResult.control_number}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cardholder Name</label>
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span>{searchResult.full_name}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Clinic</label>
                    <div className="flex items-center space-x-2">
                      <Shield className="h-4 w-4 text-green-500" />
                      <span>{searchResult.clinic_name}</span>
                    </div>
                  </div>
                </div>

                {/* Perks Info */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Perks Status</label>
                    <div className="flex items-center space-x-2">
                      <Gift className="h-4 w-4 text-purple-500" />
                      <span>{searchResult.perks_used} / {searchResult.perks_total} used</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full transition-all"
                        style={{ width: `${(searchResult.perks_used / searchResult.perks_total) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Created Date</label>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-blue-500" />
                      <span>{new Date(searchResult.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {searchResult.activated_at && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Activation Date</label>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>{new Date(searchResult.activated_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  )}

                  {searchResult.expires_at && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-orange-500" />
                        <span>{new Date(searchResult.expires_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Not Found */}
          {isNotFound && (
            <div className="light-card p-6 text-center">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Card Not Found</h3>
              <p className="text-gray-600 mb-4">
                No card found with number: <span className="font-mono font-semibold">{searchQuery}</span>
              </p>
              <p className="text-sm text-gray-500">
                Please check the card number and try again. Make sure to include the full card number.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}