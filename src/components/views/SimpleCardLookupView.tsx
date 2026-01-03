import { useState } from 'react';
import { Search, User, Shield, Clock } from 'lucide-react';
import { dbOperations } from '../../lib/supabase';
import { useToast } from '../../hooks/useToast';
import { toastSuccess, toastWarning, toastError } from '../../lib/toast';

interface Card {
  id: string;
  controlNumber: string;
  fullName: string;
  status: 'active' | 'inactive';
  perksTotal: number;
  perksUsed: number;
  clinicId: string;
  expiryDate: string;
  createdAt: string;
}

export function SimpleCardLookupView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<Card | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isNotFound, setIsNotFound] = useState(false);

  const { addToast } = useToast();

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      addToast(toastWarning('Empty Search', 'Please enter a MOC card number'));
      return;
    }

    setIsLoading(true);
    setIsNotFound(false);
    setSearchResult(null);

    try {
      const result = await dbOperations.getCardByControlNumber(searchQuery.trim());

      if (result) {
        const transformedCard: Card = {
          id: result.id,
          controlNumber: result.control_number || result.unified_control_number || `${result.card_number}`,
          fullName: result.cardholder_name || 'Cardholder',
          status: (result.status === 'activated' || result.status === 'active') ? 'active' : 'inactive',
          perksTotal: 5,
          perksUsed: result.perks?.filter((p: any) => p.claimed).length || 0,
          clinicId: result.assigned_clinic_id || '',
          expiryDate: result.expires_at?.split('T')[0] || '2025-12-31',
          createdAt: result.created_at,
        };

        setSearchResult(transformedCard);
        addToast(toastSuccess('Card Found', 'Card information retrieved successfully'));
      } else {
        setIsNotFound(true);
        addToast(toastWarning('Card Not Found', 'No MOC card found with this number'));
      }
    } catch (error) {
      console.error('Search error:', error);
      addToast(toastError('Search Error', 'Failed to search for card'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-3 sm:px-0">
      {/* Header */}
      <div className="light-card mb-6">
        <div className="p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Card Lookup</h1>
            <p className="text-gray-600">Enter a MOC card number to view card details</p>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="light-card mb-6">
        <div className="p-6">
          <div className="max-w-md mx-auto">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                MOC Card Number
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter card number (e.g., MOC-12345-4A-CVT001)"
                  className="light-input pr-12"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSearch}
                  disabled={isLoading}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                >
                  <Search className="h-5 w-5" />
                </button>
              </div>
            </div>
            <button
              onClick={handleSearch}
              disabled={isLoading}
              className="light-button-primary w-full"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Search Card
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Search Results */}
      {searchResult && (
        <div className="light-card">
          <div className="p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <User className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Card Details</h2>
            </div>

            <div className="max-w-md mx-auto space-y-4">
              <div className="bg-gray-50 p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Card Number</span>
                  <span className="font-mono text-sm font-medium">{searchResult.controlNumber}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Status</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    searchResult.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {searchResult.status}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Perks Available</span>
                  <span className="text-sm font-medium">
                    {searchResult.perksTotal - searchResult.perksUsed} / {searchResult.perksTotal}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Expires</span>
                  <span className="text-sm font-medium">{searchResult.expiryDate}</span>
                </div>
              </div>

              {searchResult.status === 'active' && (
                <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                  <div className="flex items-center">
                    <Shield className="h-5 w-5 text-green-600 mr-2" />
                    <span className="text-green-800 font-medium">Valid Card</span>
                  </div>
                  <p className="text-green-700 text-sm mt-1">
                    This card is active and can be used for services.
                  </p>
                </div>
              )}

              {searchResult.status !== 'active' && (
                <div className="bg-red-50 p-4 rounded-xl border border-red-200">
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-red-600 mr-2" />
                    <span className="text-red-800 font-medium">Inactive Card</span>
                  </div>
                  <p className="text-red-700 text-sm mt-1">
                    This card is not active. Please contact the clinic for assistance.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Not Found Message */}
      {isNotFound && (
        <div className="light-card">
          <div className="p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Card Not Found</h3>
              <p className="text-gray-600">
                No MOC card found with the number "{searchQuery}".
                Please check the card number and try again.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}