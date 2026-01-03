import { useState } from 'react';
import { Search, User, Shield, Calendar, Gift, MapPin, Phone } from 'lucide-react';
import { dbOperations } from '../../lib/supabase';
import { useToast } from '../../hooks/useToast';
import { toastSuccess, toastWarning, toastError } from '../../lib/toast';

interface Card {
  id: string;
  controlNumber: string;
  fullName: string;
  status: 'active' | 'inactive' | 'expired';
  perksTotal: number;
  perksUsed: number;
  clinicId: string;
  clinicName?: string;
  expiryDate: string;
  createdAt: string;
}

export function StreamlinedCardLookupView() {
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

    // Simulate search delay for better UX
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      const result = await dbOperations.getCardByControlNumber(searchQuery.trim());

      if (result) {
        // Transform Supabase result to our Card format
        const transformedCard: Card = {
          id: result.id,
          controlNumber: result.control_number || result.unified_control_number || `${result.card_number}`,
          fullName: result.cardholder_name || 'Card Holder',
          status: (result.status === 'activated' || result.status === 'active') ? 'active' :
                  (result.expires_at && new Date(result.expires_at) < new Date()) ? 'expired' : 'inactive',
          perksTotal: 5, // Standard perks per card
          perksUsed: result.perks?.filter((p: any) => p.claimed).length || 0,
          clinicId: result.assigned_clinic_id || '',
          clinicName: result.clinic_name || (result.assigned_clinic_id ? 'Assigned Clinic' : 'Not Assigned'),
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'expired':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Shield className="h-4 w-4 text-green-600" />;
      case 'expired':
        return <Calendar className="h-4 w-4 text-red-600" />;
      case 'inactive':
        return <User className="h-4 w-4 text-gray-600" />;
      default:
        return <User className="h-4 w-4 text-gray-600" />;
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
            <p className="text-gray-600">Enter a MOC card number to view complete card details</p>
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

      {/* Card Details */}
      {searchResult && (
        <div className="light-card">
          <div className="p-6">
            {/* Card Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <User className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Card Details Found</h2>
              <p className="text-gray-600">Complete information for this MOC card</p>
            </div>

            {/* Card Information Grid */}
            <div className="max-w-2xl mx-auto">
              {/* Card Number & Status */}
              <div className="bg-gray-50 p-4 rounded-xl mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">Card Information</h3>
                  <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border ${getStatusBadge(searchResult.status)}`}>
                    {getStatusIcon(searchResult.status)}
                    <span className="text-sm font-medium capitalize">{searchResult.status}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Card Number</p>
                    <p className="font-mono text-sm font-semibold text-gray-900">{searchResult.controlNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Cardholder</p>
                    <p className="font-medium text-gray-900">{searchResult.fullName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Expires</p>
                    <p className="font-medium text-gray-900">{new Date(searchResult.expiryDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Created</p>
                    <p className="font-medium text-gray-900">{new Date(searchResult.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* Perks Information */}
              <div className="bg-blue-50 p-4 rounded-xl mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 flex items-center">
                    <Gift className="h-4 w-4 mr-2 text-blue-600" />
                    Benefits & Perks
                  </h3>
                  <span className="text-sm text-blue-700 font-medium">
                    {searchResult.perksTotal - searchResult.perksUsed} remaining
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Perks</p>
                    <p className="font-semibold text-blue-700">{searchResult.perksTotal}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Used</p>
                    <p className="font-semibold text-gray-700">{searchResult.perksUsed}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Available</p>
                    <p className="font-semibold text-green-700">{searchResult.perksTotal - searchResult.perksUsed}</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Usage Progress</span>
                    <span>{Math.round((searchResult.perksUsed / searchResult.perksTotal) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(searchResult.perksUsed / searchResult.perksTotal) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Clinic Assignment */}
              <div className="bg-green-50 p-4 rounded-xl">
                <h3 className="font-semibold text-gray-900 flex items-center mb-3">
                  <MapPin className="h-4 w-4 mr-2 text-green-600" />
                  Clinic Assignment
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Assigned Clinic</p>
                    <p className="font-medium text-gray-900">
                      {searchResult.clinicName || 'Not assigned to any clinic'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Clinic ID</p>
                    <p className="font-mono text-sm text-gray-700">
                      {searchResult.clinicId || 'N/A'}
                    </p>
                  </div>
                </div>

                {searchResult.clinicId && (
                  <div className="mt-3 p-3 bg-white rounded-lg border border-green-200">
                    <div className="flex items-center text-green-700">
                      <Phone className="h-4 w-4 mr-2" />
                      <span className="text-sm font-medium">
                        Card is ready for clinic services
                      </span>
                    </div>
                  </div>
                )}
              </div>
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
              <p className="text-gray-600 mb-4">
                No MOC card found with the number "{searchQuery}".
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 text-sm">
                  <strong>Please check:</strong>
                  <br />• The card number is correct
                  <br />• The card has been properly activated
                  <br />• Try searching without spaces or dashes
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}