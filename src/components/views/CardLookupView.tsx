import { useState } from 'react';
import { Search, CreditCard, Clock, Shield, Gift } from 'lucide-react';
import { cardOperations, type CardData, formatDate } from '../../lib/data';

export function CardLookupView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<CardData | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setIsNotFound(false);
    setSearchResult(null);

    // Simulate search delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const card = cardOperations.getByControlNumber(searchQuery.trim());

    if (card) {
      setSearchResult(card);
    } else {
      setIsNotFound(true);
    }

    setIsSearching(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen bg-[#202124] text-white flex flex-col">
      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">

        {/* MOCARDS Logo */}
        <div className="mb-12 text-center">
          <h1 className="text-6xl font-light text-white mb-4">MOCARDS</h1>
          <p className="text-gray-300 text-lg">Healthcare Card Verification System</p>
        </div>

        {/* Search Container */}
        <div className="w-full max-w-2xl mb-8">
          <div className="relative">
            <div className="flex items-center bg-white rounded-full p-4 shadow-lg hover:shadow-xl transition-shadow">
              <Search className="h-5 w-5 text-gray-400 mr-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter control number (e.g., MOC-00001-01-DEN001)"
                className="flex-1 text-gray-900 text-lg outline-none placeholder-gray-500"
              />
              {isSearching && (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#1A535C]"></div>
              )}
            </div>
          </div>

          {/* Search Button */}
          <div className="flex justify-center mt-6">
            <button
              onClick={handleSearch}
              disabled={!searchQuery.trim() || isSearching}
              className="bg-[#1A535C] hover:bg-[#0f3a42] text-white px-8 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSearching ? 'Searching...' : 'Search Card'}
            </button>
          </div>
        </div>

        {/* Results Area */}
        <div className="w-full max-w-2xl">
          {/* Card Found - Digital ID Card */}
          {searchResult && (
            <div className="bg-gradient-to-br from-[#1A535C] to-[#0f3a42] rounded-3xl p-8 shadow-2xl border border-teal-600">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center">
                  <div className="bg-white/10 p-3 rounded-xl mr-4">
                    <CreditCard className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">{searchResult.fullName}</h2>
                    <p className="text-teal-200">{searchResult.controlNumber}</p>
                  </div>
                </div>

                {/* Status Badge */}
                <div className={`px-4 py-2 rounded-full text-sm font-medium ${
                  searchResult.status === 'active'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-500 text-white'
                }`}>
                  {searchResult.status.toUpperCase()}
                </div>
              </div>

              {/* Card Details Grid */}
              <div className="grid md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white/5 rounded-xl p-4">
                  <div className="flex items-center mb-2">
                    <Gift className="h-5 w-5 text-teal-200 mr-2" />
                    <span className="text-teal-200 text-sm">Perks Available</span>
                  </div>
                  <div className="text-white text-2xl font-bold">
                    {searchResult.perksTotal - searchResult.perksUsed}
                  </div>
                  <div className="text-teal-300 text-sm">
                    of {searchResult.perksTotal} total
                  </div>
                </div>

                <div className="bg-white/5 rounded-xl p-4">
                  <div className="flex items-center mb-2">
                    <Shield className="h-5 w-5 text-teal-200 mr-2" />
                    <span className="text-teal-200 text-sm">Perks Used</span>
                  </div>
                  <div className="text-white text-2xl font-bold">
                    {searchResult.perksUsed}
                  </div>
                  <div className="text-teal-300 text-sm">
                    benefits claimed
                  </div>
                </div>

                <div className="bg-white/5 rounded-xl p-4">
                  <div className="flex items-center mb-2">
                    <Clock className="h-5 w-5 text-teal-200 mr-2" />
                    <span className="text-teal-200 text-sm">Valid Until</span>
                  </div>
                  <div className="text-white text-lg font-bold">
                    {formatDate(searchResult.expiryDate)}
                  </div>
                  <div className="text-teal-300 text-sm">
                    expiration date
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="bg-white/10 rounded-full h-3 mb-4">
                <div
                  className="bg-gradient-to-r from-green-400 to-teal-400 h-3 rounded-full transition-all duration-700"
                  style={{
                    width: `${(searchResult.perksUsed / searchResult.perksTotal) * 100}%`
                  }}
                ></div>
              </div>

              <div className="text-center text-teal-200 text-sm">
                Digital verification complete - Card is valid
              </div>
            </div>
          )}

          {/* Card Not Found */}
          {isNotFound && (
            <div className="bg-red-900/20 border border-red-500 rounded-3xl p-8 text-center">
              <div className="bg-red-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-red-400 mb-2">Card Not Found</h3>
              <p className="text-gray-300">
                No card found with control number: <span className="font-mono text-white">{searchQuery}</span>
              </p>
              <p className="text-gray-400 text-sm mt-2">
                Please verify the control number and try again
              </p>
            </div>
          )}
        </div>

        {/* Sample Control Numbers for Testing */}
        <div className="mt-12 text-center">
          <p className="text-gray-400 text-sm mb-2">Sample control numbers for testing:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {['MOC-00001-01-DEN001', 'MOC-00002-01-DEN001', 'MOC-00003-05-MED002'].map((sample) => (
              <button
                key={sample}
                onClick={() => setSearchQuery(sample)}
                className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1 rounded-lg text-xs font-mono transition-colors"
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