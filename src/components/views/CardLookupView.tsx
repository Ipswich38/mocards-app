import { useState } from 'react';
import { Search, CreditCard, Clock, Shield, Gift, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { cardOperations, type CardData, formatDate } from '../../lib/data';
import { useAsyncOperation } from '../../hooks/useAsyncOperation';
import { useToast } from '../../hooks/useToast';
import { useSecurity } from '../../hooks/useSecurity';
import { CardSkeleton } from '../ui/LoadingSkeletons';
import { toastSuccess, toastError, toastWarning } from '../../lib/toast';

export function CardLookupView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<CardData | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline' | 'checking'>('online');

  const { addToast } = useToast();
  const { isLoading, error, execute } = useAsyncOperation();
  const { checkRateLimit, validateInput: validateSecureInput, securityState } = useSecurity();

  const validateSearchInput = (query: string): { valid: boolean; message?: string } => {
    const trimmed = query.trim();

    if (!trimmed) {
      return { valid: false, message: 'Please enter a control number' };
    }

    if (trimmed.length < 5) {
      return { valid: false, message: 'Control number is too short' };
    }

    // Basic format validation
    if (!trimmed.includes('-')) {
      return { valid: false, message: 'Invalid format. Please use format: MOC-XXXXX-XX-XXXXX' };
    }

    return { valid: true };
  };

  const handleSearch = async () => {
    // Check rate limiting first
    if (!checkRateLimit('search')) {
      return;
    }

    // Validate input for basic format
    const basicValidation = validateSearchInput(searchQuery);
    if (!basicValidation.valid) {
      addToast(toastWarning('Invalid Input', basicValidation.message));
      return;
    }

    // Security validation
    const securityValidation = validateSecureInput(searchQuery, 'control_number');
    if (!securityValidation.valid) {
      addToast(toastError(
        'Security Warning',
        securityValidation.message || 'Invalid input detected',
        {
          label: 'Learn More',
          onClick: () => addToast(toastWarning(
            'Security Protection',
            'Your input was blocked to protect against potential security threats.'
          ))
        }
      ));
      return;
    }

    setIsNotFound(false);
    setSearchResult(null);

    // Simulate network check
    setConnectionStatus('checking');
    await new Promise(resolve => setTimeout(resolve, 300));
    setConnectionStatus('online');

    await execute(
      async () => {
        // Simulate API call with potential failure scenarios
        await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));

        // Simulate occasional network errors (5% chance)
        if (Math.random() < 0.05) {
          throw new Error('Network connection failed');
        }

        // Simulate server errors (3% chance)
        if (Math.random() < 0.03) {
          throw new Error('Server temporarily unavailable');
        }

        const card = cardOperations.getByControlNumber(searchQuery.trim());

        if (!card) {
          throw new Error('CARD_NOT_FOUND');
        }

        return card;
      },
      {
        loadingMessage: `Searching for card ${searchQuery.substring(0, 15)}...`,
        successMessage: 'Card found successfully!',
        enableRetry: true,
        maxRetries: 2,
        onSuccess: (data) => {
          setSearchResult(data);
          addToast(toastSuccess(
            'Card Found!',
            `Found card for ${data.fullName}`,
            {
              label: 'View Details',
              onClick: () => {
                // Scroll to result or focus
                document.querySelector('.card-result')?.scrollIntoView({ behavior: 'smooth' });
              }
            }
          ));
        },
        onError: (error) => {
          if (error.message === 'CARD_NOT_FOUND') {
            setIsNotFound(true);
            addToast(toastError(
              'Card Not Found',
              `No card found with control number: ${searchQuery}`,
              {
                label: 'Try Again',
                onClick: () => setSearchQuery('')
              }
            ));
          } else {
            addToast(toastError(
              'Search Failed',
              'Failed to search for card. Please try again.',
              {
                label: 'Retry',
                onClick: () => handleSearch()
              }
            ));
          }
        }
      }
    );
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    // STRICT DARK THEME - Google Style
    <div className="min-h-screen bg-[#202124] text-[#E8EAED] flex flex-col overflow-auto">
      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">

        {/* MOCARDS Logo */}
        <div className="mb-12 text-center">
          <h1 className="text-6xl font-light text-white mb-4">MOCARDS</h1>
          <p className="text-[#9AA0A6] text-lg">Healthcare Card Verification System</p>
        </div>

        {/* Search Container */}
        <div className="w-full max-w-2xl mb-8">
          <div className="relative">
            <div className={`flex items-center rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-300 border ${
              error ? 'bg-red-900/20 border-red-500/50' : 'bg-[#303134] border-[#5F6368]'
            } ${isLoading ? 'animate-pulse' : ''}`}>
              <Search className={`h-5 w-5 mr-4 ${
                error ? 'text-red-400' : 'text-[#9AA0A6]'
              }`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                placeholder="Enter control number (e.g., MOC-00001-01-DEN001)"
                className="flex-1 bg-transparent text-[#E8EAED] text-lg outline-none placeholder-[#9AA0A6] disabled:opacity-50"
              />

              {/* Connection Status Indicator */}
              <div className="flex items-center mr-3">
                {connectionStatus === 'checking' && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-500"></div>
                )}
                {connectionStatus === 'online' && (
                  <Wifi className="h-4 w-4 text-green-500" />
                )}
                {connectionStatus === 'offline' && (
                  <WifiOff className="h-4 w-4 text-red-500" />
                )}
              </div>

              {/* Loading Indicator */}
              {isLoading && (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#8AB4F8]"></div>
              )}
            </div>

            {/* Real-time Input Validation */}
            {searchQuery && !validateSearchInput(searchQuery).valid && !isLoading && (
              <div className="absolute top-full mt-2 left-0 right-0 bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-3 text-yellow-300 text-sm">
                {validateSearchInput(searchQuery).message}
              </div>
            )}

            {/* Security Block Indicator */}
            {securityState.isBlocked && (
              <div className="absolute top-full mt-2 left-0 right-0 bg-red-900/20 border border-red-500/50 rounded-lg p-4 text-red-300 text-sm">
                <div className="flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  <span className="font-medium">Rate limit exceeded</span>
                </div>
                <p className="mt-1">
                  Too many search attempts. Please wait {securityState.retryAfter} seconds before trying again.
                </p>
              </div>
            )}
          </div>

          {/* Search Button */}
          <div className="flex justify-center mt-6 space-x-4">
            <button
              onClick={handleSearch}
              disabled={!validateSearchInput(searchQuery).valid || isLoading || securityState.isBlocked}
              className={`px-8 py-3 rounded-lg font-medium transition-all duration-200 transform ${
                isLoading || securityState.isBlocked
                  ? 'bg-[#3C4043] text-[#9AA0A6] scale-95 cursor-not-allowed'
                  : 'bg-[#303134] hover:bg-[#3C4043] text-[#E8EAED] hover:scale-105 shadow-lg hover:shadow-xl'
              } border ${
                securityState.isBlocked
                  ? 'border-red-500/50'
                  : 'border-[#5F6368] hover:border-[#8AB4F8]'
              } disabled:opacity-50`}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#8AB4F8] mr-2"></div>
                  Searching...
                </div>
              ) : securityState.isBlocked ? (
                <div className="flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Blocked ({securityState.retryAfter}s)
                </div>
              ) : (
                'Search Card'
              )}
            </button>

            {searchResult && (
              <button
                onClick={() => {
                  setSearchResult(null);
                  setIsNotFound(false);
                  setSearchQuery('');
                }}
                className="bg-[#1F2937] hover:bg-[#374151] text-[#9AA0A6] hover:text-[#E8EAED] px-6 py-3 rounded-lg font-medium transition-colors border border-[#5F6368]"
              >
                New Search
              </button>
            )}
          </div>
        </div>

        {/* Results Area */}
        <div className="w-full max-w-2xl">
          {/* Loading Skeleton */}
          {isLoading && (
            <div className="animate-fade-in">
              <CardSkeleton />
            </div>
          )}

          {/* Card Found - Digital ID Card */}
          {searchResult && !isLoading && (
            <div className="card-result bg-[#303134] rounded-2xl p-8 shadow-2xl border border-[#5F6368] backdrop-blur animate-fade-in card-hover">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center">
                  <div className="bg-[#1A535C] bg-opacity-20 p-3 rounded-xl mr-4 animate-bounce-subtle">
                    <CreditCard className="h-8 w-8 text-[#8AB4F8]" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">{searchResult.fullName}</h2>
                    <p className="text-[#9AA0A6] font-mono">{searchResult.controlNumber}</p>
                    <div className="flex items-center mt-2 text-xs text-[#81C995]">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                      Verified • Real-time sync active
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                <div className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  searchResult.status === 'active'
                    ? 'bg-[#137333] text-[#81C995] shadow-lg shadow-green-500/20'
                    : 'bg-[#5F6368] text-[#E8EAED]'
                }`}>
                  {searchResult.status.toUpperCase()}
                </div>
              </div>

              {/* Card Details Grid */}
              <div className="grid md:grid-cols-3 gap-6 mb-6">
                <div className="bg-[#1F2937] bg-opacity-30 rounded-xl p-4 border border-[#374151]">
                  <div className="flex items-center mb-2">
                    <Gift className="h-5 w-5 text-[#8AB4F8] mr-2" />
                    <span className="text-[#9AA0A6] text-sm">Perks Available</span>
                  </div>
                  <div className="text-white text-2xl font-bold">
                    {searchResult.perksTotal - searchResult.perksUsed}
                  </div>
                  <div className="text-[#81C995] text-sm">
                    of {searchResult.perksTotal} total
                  </div>
                </div>

                <div className="bg-[#1F2937] bg-opacity-30 rounded-xl p-4 border border-[#374151]">
                  <div className="flex items-center mb-2">
                    <Shield className="h-5 w-5 text-[#8AB4F8] mr-2" />
                    <span className="text-[#9AA0A6] text-sm">Perks Used</span>
                  </div>
                  <div className="text-white text-2xl font-bold">
                    {searchResult.perksUsed}
                  </div>
                  <div className="text-[#F9AB00] text-sm">
                    benefits claimed
                  </div>
                </div>

                <div className="bg-[#1F2937] bg-opacity-30 rounded-xl p-4 border border-[#374151]">
                  <div className="flex items-center mb-2">
                    <Clock className="h-5 w-5 text-[#8AB4F8] mr-2" />
                    <span className="text-[#9AA0A6] text-sm">Valid Until</span>
                  </div>
                  <div className="text-white text-lg font-bold">
                    {formatDate(searchResult.expiryDate)}
                  </div>
                  <div className="text-[#9AA0A6] text-sm">
                    expiration date
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="bg-[#5F6368] rounded-full h-3 mb-4">
                <div
                  className="bg-gradient-to-r from-[#81C995] to-[#8AB4F8] h-3 rounded-full transition-all duration-700"
                  style={{
                    width: `${(searchResult.perksUsed / searchResult.perksTotal) * 100}%`
                  }}
                ></div>
              </div>

              <div className="text-center text-[#9AA0A6] text-sm">
                ✓ Digital verification complete - Card is valid
              </div>
            </div>
          )}

          {/* Card Not Found */}
          {isNotFound && !isLoading && (
            <div className="bg-[#2D2A2E] border border-[#F28B82] rounded-2xl p-8 text-center animate-fade-in">
              <div className="bg-[#F28B82] bg-opacity-20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-[#F28B82]" />
              </div>
              <h3 className="text-xl font-bold text-[#F28B82] mb-2">Card Not Found</h3>
              <p className="text-[#E8EAED]">
                No card found with control number: <span className="font-mono text-white bg-[#1F2937] px-2 py-1 rounded">{searchQuery}</span>
              </p>
              <p className="text-[#9AA0A6] text-sm mt-2">
                Please verify the control number and try again
              </p>

              <div className="mt-6 space-y-3">
                <div className="bg-[#1F2937] rounded-lg p-4 text-left">
                  <h4 className="text-[#F9AB00] text-sm font-medium mb-2">Common Issues:</h4>
                  <ul className="text-[#9AA0A6] text-sm space-y-1">
                    <li>• Check for typos in the control number</li>
                    <li>• Ensure the card has been activated</li>
                    <li>• Contact your clinic if the issue persists</li>
                  </ul>
                </div>

                <button
                  onClick={() => {
                    setIsNotFound(false);
                    setSearchQuery('');
                  }}
                  className="bg-[#303134] hover:bg-[#3C4043] text-[#E8EAED] px-6 py-2 rounded-lg font-medium transition-colors border border-[#5F6368]"
                >
                  Try New Search
                </button>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="bg-red-900/20 border border-red-500/50 rounded-2xl p-8 text-center animate-fade-in">
              <div className="bg-red-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <WifiOff className="h-8 w-8 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-red-400 mb-2">Search Error</h3>
              <p className="text-[#E8EAED] mb-4">{error.userMessage}</p>

              <div className="flex justify-center space-x-3">
                <button
                  onClick={handleSearch}
                  className="bg-red-600/20 hover:bg-red-600/30 text-red-300 px-6 py-2 rounded-lg font-medium transition-colors border border-red-500/50"
                >
                  Retry Search
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="bg-[#303134] hover:bg-[#3C4043] text-[#E8EAED] px-6 py-2 rounded-lg font-medium transition-colors border border-[#5F6368]"
                >
                  Refresh Page
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sample Control Numbers for Testing */}
        <div className="mt-12 text-center">
          <p className="text-[#9AA0A6] text-sm mb-2">Sample control numbers for testing:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {['MOC-00001-01-DEN001', 'MOC-00002-01-DEN001', 'MOC-00003-05-MED002'].map((sample) => (
              <button
                key={sample}
                onClick={() => setSearchQuery(sample)}
                className="bg-[#303134] hover:bg-[#3C4043] text-[#9AA0A6] hover:text-[#E8EAED] px-3 py-1 rounded-lg text-xs font-mono transition-colors border border-[#5F6368]"
              >
                {sample}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}