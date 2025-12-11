import { useState, useEffect } from 'react';
import { streamlinedOps, Card, LocationCodeV2, ClinicCodeByRegion } from '../lib/streamlined-operations';
import { Search, CheckCircle, AlertCircle, MapPin, Building, CreditCard } from 'lucide-react';

interface CardActivationV2Props {
  clinicId: string;
  clinicName: string;
}

export function CardActivationV2({ clinicId, clinicName }: CardActivationV2Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [locationCodes, setLocationCodes] = useState<LocationCodeV2[]>([]);
  const [clinicCodes, setClinicCodes] = useState<ClinicCodeByRegion[]>([]);
  const [selectedLocationCode, setSelectedLocationCode] = useState('');
  const [selectedClinicCode, setSelectedClinicCode] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Search results
  const [searchResults, setSearchResults] = useState<Card[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadLocationCodes();
    loadClinicCodes();
  }, []);

  const loadLocationCodes = async () => {
    try {
      const codes = await (streamlinedOps as any).getLocationCodesV2();
      setLocationCodes(codes);
    } catch (error) {
      console.error('Error loading location codes:', error);
    }
  };

  const loadClinicCodes = async () => {
    try {
      const codes = await (streamlinedOps as any).getClinicCodesByRegion();
      setClinicCodes(codes);
    } catch (error) {
      console.error('Error loading clinic codes:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    setError('');

    try {
      const { cards } = await (streamlinedOps as any).getCardsV2(10, 0, {
        activated: false, // Only unactivated cards
        search: searchQuery
      });

      setSearchResults(cards);

      if (cards.length === 1) {
        setSelectedCard(cards[0]);
      }
    } catch (err: any) {
      setError('Error searching for cards: ' + err.message);
    } finally {
      setSearching(false);
    }
  };

  const handleRegionChange = (regionType: string) => {
    setSelectedRegion(regionType);
    setSelectedClinicCode('');
    // Filter clinic codes by region
  };

  const getFilteredClinicCodes = () => {
    if (!selectedRegion) return clinicCodes;
    return clinicCodes.filter(code => code.region_type === selectedRegion);
  };

  const handleActivateCard = async () => {
    if (!selectedCard || !selectedLocationCode || !selectedClinicCode) {
      setError('Please select a card, location code, and clinic code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const success = await (streamlinedOps as any).activateCardV2(
        selectedCard.id,
        selectedLocationCode,
        selectedClinicCode,
        clinicId
      );

      if (success) {
        const newControlNumber = (streamlinedOps as any).generateControlNumberV2(
          selectedCard.card_number || 0,
          selectedLocationCode,
          selectedClinicCode
        );

        setSuccess(`✅ Card activated successfully! New control number: ${newControlNumber}`);

        // Reset form
        setSelectedCard(null);
        setSearchQuery('');
        setSearchResults([]);
        setSelectedLocationCode('');
        setSelectedClinicCode('');
        setSelectedRegion('');
      } else {
        throw new Error('Failed to activate card');
      }
    } catch (err: any) {
      setError('Error activating card: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const previewControlNumber = () => {
    if (!selectedCard || !selectedLocationCode || !selectedClinicCode) {
      return selectedCard ? `MOC-__-____-${selectedCard.card_number?.toString().padStart(5, '0')}` : '';
    }

    return (streamlinedOps as any).generateControlNumberV2(
      selectedCard.card_number || 0,
      selectedLocationCode,
      selectedClinicCode
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Card Activation System V2.0</h2>
        <p className="text-blue-100">
          Activate unassigned cards and assign location/clinic codes - {clinicName}
        </p>
      </div>

      {/* Search Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Search className="h-5 w-5 mr-2 text-blue-600" />
          Find Card to Activate
        </h3>

        <div className="flex space-x-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by control number or card number (e.g., MOC-__-____-00001 or 1)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searching || !searchQuery.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            {searching ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            Search
          </button>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Search Results:</h4>
            <div className="space-y-2">
              {searchResults.map((card) => (
                <div
                  key={card.id}
                  className={`p-3 border rounded-md cursor-pointer transition-colors ${
                    selectedCard?.id === card.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedCard(card)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <CreditCard className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="font-mono text-sm">{card.control_number_v2}</span>
                      <span className="mx-2 text-gray-400">•</span>
                      <span className="text-sm text-gray-600">Card #{card.card_number}</span>
                    </div>
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                      Unactivated
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Activation Form */}
      {selectedCard && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
            Activate Selected Card
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card Info */}
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Card</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Current Control Number:</span>
                    <span className="font-mono text-sm">{selectedCard.control_number_v2}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Card Number:</span>
                    <span className="font-mono text-sm">#{selectedCard.card_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Status:</span>
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                      {selectedCard.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="text-sm font-medium text-blue-700 mb-2">New Control Number Preview</h4>
                <div className="font-mono text-lg text-blue-800 font-bold">
                  {previewControlNumber()}
                </div>
              </div>
            </div>

            {/* Selection Form */}
            <div className="space-y-4">
              {/* Location Code Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <MapPin className="h-4 w-4 inline mr-1" />
                  Location Code (01-16) *
                </label>
                <select
                  value={selectedLocationCode}
                  onChange={(e) => setSelectedLocationCode(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Location Code</option>
                  {locationCodes.map((location) => (
                    <option key={location.id} value={location.code}>
                      {location.code} - {location.region_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Region Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Building className="h-4 w-4 inline mr-1" />
                  Region Type *
                </label>
                <select
                  value={selectedRegion}
                  onChange={(e) => handleRegionChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Region</option>
                  <option value="visayas">Visayas (Cebu)</option>
                  <option value="luzon_4a">Luzon Region 4A (CALABARZON)</option>
                  <option value="ncr">National Capital Region (NCR)</option>
                </select>
              </div>

              {/* Clinic Code Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Building className="h-4 w-4 inline mr-1" />
                  Clinic Code *
                </label>
                <select
                  value={selectedClinicCode}
                  onChange={(e) => setSelectedClinicCode(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={!selectedRegion}
                >
                  <option value="">Select Clinic Code</option>
                  {getFilteredClinicCodes().map((clinic) => (
                    <option key={clinic.id} value={clinic.clinic_code}>
                      {clinic.clinic_code} - {clinic.region_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Activate Button */}
              <button
                onClick={handleActivateCard}
                disabled={loading || !selectedLocationCode || !selectedClinicCode}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Activating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Activate Card
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Information */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-blue-700 mb-2">How Card Activation Works:</h4>
        <ul className="text-sm text-blue-600 space-y-1">
          <li>• Search for unactivated cards using control number or card number</li>
          <li>• Select location code (01-16) corresponding to the region</li>
          <li>• Choose region type and specific clinic code</li>
          <li>• Card will get new control number: MOC-[location]-[clinic]-[number]</li>
          <li>• Default perks will be automatically assigned to activated card</li>
        </ul>
      </div>
    </div>
  );
}