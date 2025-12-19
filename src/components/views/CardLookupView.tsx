import { useState } from 'react';
import { Search, Camera, Sparkles, Calendar, User, Gift, Shield } from 'lucide-react';
import { cardOperations, clinicOperations, type CardData, formatDate } from '../../lib/data';
import { useToast } from '../../hooks/useToast';
import { toastSuccess, toastWarning, toastError } from '../../lib/toast';

export function CardLookupView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<CardData | null>(null);
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

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      const result = cardOperations.getByControlNumber(searchQuery.trim());

      if (result) {
        setSearchResult(result);
        addToast(toastSuccess('Card Found', 'Card information retrieved successfully'));
      } else {
        setIsNotFound(true);
        addToast(toastWarning('Card Not Found', 'No MOC card found with this number'));
      }
    } catch (error) {
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

  const handleFeelingLucky = () => {
    // Pick a random card for demo
    const allCards = cardOperations.getAll();
    if (allCards.length > 0) {
      const randomCard = allCards[Math.floor(Math.random() * allCards.length)];
      setSearchQuery(randomCard.controlNumber);
      setTimeout(() => handleSearch(), 100);
    }
  };

  const getClinicName = (clinicId: string): string => {
    const clinic = clinicOperations.getById(clinicId);
    return clinic?.name || 'No clinic assigned';
  };

  return (
    <div className="dark-search-container min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col items-center pt-20 pb-8">
        {/* MOCARDS Logo */}
        <h1 className="text-6xl font-normal text-white mb-8 select-none">
          MOCARDS
        </h1>

        {/* Search Bar */}
        <div className="relative w-full max-w-xl mb-8">
          <div className="flex items-center dark-search-bar">
            <Search className="h-5 w-5 text-gray-400 mr-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter MOC control number"
              className="flex-1 bg-transparent text-white outline-none"
              disabled={isLoading}
            />
            <div className="flex items-center space-x-2 ml-4">
              <Camera className="h-5 w-5 text-gray-400 cursor-pointer hover:text-gray-300" />
              <Sparkles className="h-5 w-5 text-gray-400 cursor-pointer hover:text-gray-300" />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Searching...' : 'MOCARDS Search'}
          </button>
          <button
            onClick={handleFeelingLucky}
            disabled={isLoading}
            className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            I'm Feeling Lucky
          </button>
        </div>
      </div>

      {/* Results Section */}
      {(searchResult || isNotFound || isLoading) && (
        <div className="max-w-4xl mx-auto px-6 pb-20">
          {/* Loading State */}
          {isLoading && (
            <div className="dark-card p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-600 border-t-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-300">Searching MOCARDS registry...</p>
            </div>
          )}

          {/* Search Result - Digital ID Card */}
          {searchResult && !isLoading && (
            <div className="space-y-6">
              {/* Main Card Display */}
              <div className="dark-card p-8">
                <div className="bg-gradient-to-r from-teal-600 to-teal-800 rounded-2xl p-6 text-white mb-6">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-2xl font-bold">MOCARDS</h2>
                      <p className="text-teal-100">Philippines Healthcare Card</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      searchResult.status === 'active'
                        ? 'bg-green-400 text-green-900'
                        : 'bg-red-400 text-red-900'
                    }`}>
                      {searchResult.status === 'active' ? '✅ ACTIVE' : '❌ INACTIVE'}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-teal-200 text-sm">Control Number</p>
                      <p className="text-2xl font-mono font-bold">{searchResult.controlNumber}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-teal-200 text-sm">Cardholder Name</p>
                        <p className="text-lg font-semibold">{searchResult.fullName}</p>
                      </div>
                      <div>
                        <p className="text-teal-200 text-sm">Expires</p>
                        <p className="text-lg font-semibold">{formatDate(searchResult.expiryDate)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-300">
                  {/* Cardholder Info */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white mb-4">Cardholder Information</h3>

                    <div className="flex items-center space-x-3">
                      <User className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-400">Full Name</p>
                        <p className="text-white">{searchResult.fullName}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Shield className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-400">Assigned Clinic</p>
                        <p className="text-white">{getClinicName(searchResult.clinicId)}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Calendar className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-400">Card Status</p>
                        <p className={`capitalize ${
                          searchResult.status === 'active' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {searchResult.status}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Benefits Info */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white mb-4">Healthcare Benefits</h3>

                    <div className="flex items-center space-x-3">
                      <Gift className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-400">Total Perks</p>
                        <p className="text-white">{searchResult.perksTotal} benefits</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Gift className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-400">Used Perks</p>
                        <p className="text-white">{searchResult.perksUsed} utilized</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Gift className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-400">Available Perks</p>
                        <p className="text-green-400 font-semibold">
                          {searchResult.perksTotal - searchResult.perksUsed} remaining
                        </p>
                      </div>
                    </div>

                    {/* Perks Progress Bar */}
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Benefits Usage</span>
                        <span>{searchResult.perksUsed}/{searchResult.perksTotal}</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-teal-500 to-teal-600 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${(searchResult.perksUsed / searchResult.perksTotal) * 100}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Not Found State */}
          {isNotFound && !isLoading && (
            <div className="dark-card p-8 text-center">
              <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No card found</h3>
              <p className="text-gray-300 mb-4">
                No MOC card found with the number "{searchQuery}"
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setIsNotFound(false);
                }}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
              >
                Try another search
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}