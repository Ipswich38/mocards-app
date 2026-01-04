import { useState } from 'react';
import { Search, User, Shield, Calendar, Gift, MapPin } from 'lucide-react';
import { dbOperations } from '../lib/supabase';
import { useToast } from '../hooks/useToast';
import { toastSuccess, toastWarning, toastError } from '../lib/toast';

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

export function PureCardLookup() {
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
          fullName: result.cardholder_name || 'Card Holder',
          status: (result.status === 'activated' || result.status === 'active') ? 'active' :
                  (result.expires_at && new Date(result.expires_at) < new Date()) ? 'expired' : 'inactive',
          perksTotal: 5,
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
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Search className="h-10 w-10 text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Card Lookup</h1>
        <p className="text-gray-600 text-lg">Search for any MOC card using its control number</p>
      </div>

      {/* Search Section */}
      <div className="bg-white rounded-2xl shadow-sm p-8">
        <div className="max-w-md mx-auto space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              MOC Card Number
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter card number (e.g., MOC-12345)"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2 inline-block"></div>
                Searching...
              </>
            ) : (
              <>
                <Search className="h-5 w-5 mr-2 inline-block" />
                Search Card
              </>
            )}
          </button>
        </div>
      </div>

      {/* Card Details */}
      {searchResult && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Card Found</h2>
                <p className="text-blue-100">Complete card information</p>
              </div>
              <div className={`flex items-center space-x-2 px-4 py-2 rounded-full border ${getStatusBadge(searchResult.status)} bg-white`}>
                {getStatusIcon(searchResult.status)}
                <span className="text-sm font-medium capitalize">{searchResult.status}</span>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-6">
            {/* Card Information */}
            <div className="bg-gray-50 p-6 rounded-xl">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                <User className="h-5 w-5 mr-2 text-blue-600" />
                Card Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Card Number</p>
                  <p className="font-mono text-lg font-semibold text-gray-900">{searchResult.controlNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Cardholder</p>
                  <p className="text-lg font-medium text-gray-900">{searchResult.fullName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Expires</p>
                  <p className="text-lg font-medium text-gray-900">{new Date(searchResult.expiryDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Created</p>
                  <p className="text-lg font-medium text-gray-900">{new Date(searchResult.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {/* Perks Information */}
            <div className="bg-blue-50 p-6 rounded-xl">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                <Gift className="h-5 w-5 mr-2 text-blue-600" />
                Benefits & Perks
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{searchResult.perksTotal}</p>
                  <p className="text-sm text-gray-600">Total Perks</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-700">{searchResult.perksUsed}</p>
                  <p className="text-sm text-gray-600">Used</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{searchResult.perksTotal - searchResult.perksUsed}</p>
                  <p className="text-sm text-gray-600">Available</p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${(searchResult.perksUsed / searchResult.perksTotal) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Clinic Assignment */}
            <div className="bg-green-50 p-6 rounded-xl">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                <MapPin className="h-5 w-5 mr-2 text-green-600" />
                Clinic Assignment
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Assigned Clinic</p>
                  <p className="text-lg font-medium text-gray-900">
                    {searchResult.clinicName || 'Not assigned to any clinic'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Clinic ID</p>
                  <p className="font-mono text-gray-700">
                    {searchResult.clinicId || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Not Found Message */}
      {isNotFound && (
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Card Not Found</h3>
            <p className="text-gray-600 mb-6">
              No MOC card found with the number "{searchQuery}".
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-left">
              <p className="text-yellow-800 text-sm">
                <strong>Please check:</strong>
                <br />• The card number is correct
                <br />• The card has been properly activated
                <br />• Try searching without spaces or dashes
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}