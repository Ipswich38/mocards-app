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
            <div className="flex items-center bg-[#303134] rounded-full p-4 shadow-lg hover:shadow-xl transition-shadow border border-[#5F6368]">
              <Search className="h-5 w-5 text-[#9AA0A6] mr-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter control number (e.g., MOC-00001-01-DEN001)"
                className="flex-1 bg-transparent text-[#E8EAED] text-lg outline-none placeholder-[#9AA0A6]"
              />
              {isSearching && (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#8AB4F8]"></div>
              )}
            </div>
          </div>

          {/* Search Button */}
          <div className="flex justify-center mt-6">
            <button
              onClick={handleSearch}
              disabled={!searchQuery.trim() || isSearching}
              className="bg-[#303134] hover:bg-[#3C4043] text-[#E8EAED] px-8 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-[#5F6368] hover:border-[#8AB4F8]"
            >
              {isSearching ? 'Searching...' : 'Search Card'}
            </button>
          </div>
        </div>

        {/* Results Area */}
        <div className="w-full max-w-2xl">
          {/* Card Found - Digital ID Card */}
          {searchResult && (
            <div className="bg-[#303134] rounded-2xl p-8 shadow-2xl border border-[#5F6368] backdrop-blur">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center">
                  <div className="bg-[#1A535C] bg-opacity-20 p-3 rounded-xl mr-4">
                    <CreditCard className="h-8 w-8 text-[#8AB4F8]" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">{searchResult.fullName}</h2>
                    <p className="text-[#9AA0A6] font-mono">{searchResult.controlNumber}</p>
                  </div>
                </div>

                {/* Status Badge */}
                <div className={`px-4 py-2 rounded-full text-sm font-medium ${
                  searchResult.status === 'active'
                    ? 'bg-[#137333] text-[#81C995]'
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
          {isNotFound && (
            <div className="bg-[#2D2A2E] border border-[#F28B82] rounded-2xl p-8 text-center">
              <div className="bg-[#F28B82] bg-opacity-20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-[#F28B82]" />
              </div>
              <h3 className="text-xl font-bold text-[#F28B82] mb-2">Card Not Found</h3>
              <p className="text-[#E8EAED]">
                No card found with control number: <span className="font-mono text-white">{searchQuery}</span>
              </p>
              <p className="text-[#9AA0A6] text-sm mt-2">
                Please verify the control number and try again
              </p>
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