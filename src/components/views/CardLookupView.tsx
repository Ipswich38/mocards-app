import { useState } from 'react';
import { Search, CreditCard, Shield, Gift, User, Calendar } from 'lucide-react';
import { cardOperations, type CardData, formatDate } from '../../lib/data';
import { useAsyncOperation } from '../../hooks/useAsyncOperation';
import { useToast } from '../../hooks/useToast';
import { useSecurity } from '../../hooks/useSecurity';
import { toastSuccess, toastError, toastWarning } from '../../lib/toast';

export function CardLookupView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<CardData | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);

  const { addToast } = useToast();
  const { isLoading, execute } = useAsyncOperation();
  const { checkRateLimit } = useSecurity();

  const validateSearchInput = (query: string): { valid: boolean; message?: string } => {
    const trimmed = query.trim();

    if (!trimmed) {
      return { valid: false, message: 'Please enter a MOC card number' };
    }

    if (trimmed.length < 5) {
      return { valid: false, message: 'Card number is too short' };
    }

    return { valid: true };
  };

  const handleSearch = async () => {
    if (!checkRateLimit('search')) {
      return;
    }

    const validation = validateSearchInput(searchQuery);
    if (!validation.valid) {
      addToast(toastWarning('Invalid Input', validation.message));
      return;
    }

    await execute(async () => {
      try {
        setIsNotFound(false);
        setSearchResult(null);

        // Use the correct function name
        const result = cardOperations.getByControlNumber(searchQuery.trim());

        if (result) {
          setSearchResult(result);
          addToast(toastSuccess('Card Found', 'Card information retrieved successfully'));
        } else {
          setIsNotFound(true);
          addToast(toastWarning('Card Not Found', 'No card found with this number'));
        }
      } catch (error) {
        setIsNotFound(true);
        addToast(toastError('Search Error', 'Failed to search for card'));
        throw error;
      }
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSearch();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="ios-card">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Search className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="ios-text-title">MOC Card Lookup</h1>
              <p className="ios-text-body">Verify healthcare card validity and status</p>
            </div>
          </div>

          {/* Search Input */}
          <div className="flex space-x-3">
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter MOC card number (e.g., MOC-00001-01-DEN001)"
                className="ios-input"
                disabled={isLoading}
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isLoading || !searchQuery.trim()}
              className={`ios-button-primary px-6 flex items-center space-x-2 ${
                isLoading || !searchQuery.trim()
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
              }`}
            >
              <Search className="h-4 w-4" />
              <span>{isLoading ? 'Searching...' : 'Search'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="ios-card">
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      )}

      {/* Search Result */}
      {searchResult && !isLoading && (
        <div className="space-y-6">
          {/* Card Status */}
          <div className="ios-card">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="ios-text-subtitle">Card Status</h2>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  searchResult.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {searchResult.status === 'active' ? '✅ Active' : '❌ Inactive'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <CreditCard className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="ios-text-caption">Control Number</p>
                    <p className="ios-text-subtitle font-mono">{searchResult.controlNumber}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="ios-text-caption">Expiry Date</p>
                    <p className="ios-text-subtitle">{formatDate(searchResult.expiryDate)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cardholder Information */}
          <div className="ios-card">
            <div className="p-6">
              <h2 className="ios-text-subtitle mb-4">Cardholder Information</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="ios-text-caption">Full Name</p>
                      <p className="ios-text-body">{searchResult.fullName}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Shield className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="ios-text-caption">Clinic ID</p>
                      <p className="ios-text-body">{searchResult.clinicId}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Gift className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="ios-text-caption">Available Perks</p>
                      <p className="ios-text-body">
                        {searchResult.perksTotal - searchResult.perksUsed} of {searchResult.perksTotal}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="ios-text-caption">Status</p>
                      <p className="ios-text-body capitalize">{searchResult.status}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Perks Information */}
          {searchResult.perksTotal > 0 && (
            <div className="ios-card">
              <div className="p-6">
                <h2 className="ios-text-subtitle mb-4">Healthcare Benefits</h2>

                <div className="bg-blue-50 rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-blue-900">Perks Usage</span>
                    <span className="text-blue-700 font-bold">
                      {searchResult.perksUsed}/{searchResult.perksTotal}
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${(searchResult.perksUsed / searchResult.perksTotal) * 100}%`
                      }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-xl">
                    <Gift className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-900">Available Benefits</p>
                      <p className="ios-text-caption text-green-700">
                        {searchResult.perksTotal - searchResult.perksUsed} remaining
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                    <Gift className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="font-medium text-gray-900">Used Benefits</p>
                      <p className="ios-text-caption text-gray-700">
                        {searchResult.perksUsed} utilized
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Not Found State */}
      {isNotFound && !isLoading && (
        <div className="ios-card">
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="ios-text-subtitle mb-2">No Card Found</h3>
            <p className="ios-text-body mb-4">
              No MOC card found with the number "{searchQuery}". Please check the number and try again.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setIsNotFound(false);
              }}
              className="ios-button-secondary"
            >
              Clear Search
            </button>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="ios-card">
        <div className="p-6">
          <h2 className="ios-text-subtitle mb-4">How to Use</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="p-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              <h4 className="font-medium mb-1">Enter Card Number</h4>
              <p className="ios-text-caption">Type the full MOC control number</p>
            </div>

            <div className="p-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <span className="text-blue-600 font-bold">2</span>
              </div>
              <h4 className="font-medium mb-1">Click Search</h4>
              <p className="ios-text-caption">Verify the card information instantly</p>
            </div>

            <div className="p-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <span className="text-blue-600 font-bold">3</span>
              </div>
              <h4 className="font-medium mb-1">View Details</h4>
              <p className="ios-text-caption">See status, perks, and clinic info</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}