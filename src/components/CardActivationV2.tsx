import { useState, useEffect } from 'react';
import { dbOperations, supabase } from '../lib/supabase';
import { Search, CheckCircle, AlertCircle, CreditCard, MapPin, Building2 } from 'lucide-react';

interface CardActivationV2Props {
  clinicId: string;
  clinicName: string;
}

export function CardActivationV2({ clinicName }: CardActivationV2Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCard, setSelectedCard] = useState<any | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Activation form data
  const [activationForm, setActivationForm] = useState({
    locationCode: '01', // NCR region default
    clinicCode: ''
  });

  // Available options
  const [clinics, setClinics] = useState<any[]>([]);
  const [loadingClinics, setLoadingClinics] = useState(false);

  // Search results
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Location codes (Philippines regions)
  const locationCodes = [
    { code: '01', name: 'National Capital Region (NCR)' },
    { code: '02', name: 'Cordillera Administrative Region (CAR)' },
    { code: '03', name: 'Ilocos Region (Region I)' },
    { code: '04', name: 'Cagayan Valley (Region II)' },
    { code: '05', name: 'Central Luzon (Region III)' },
    { code: '06', name: 'Calabarzon (Region IV-A)' },
    { code: '07', name: 'Mimaropa (Region IV-B)' },
    { code: '08', name: 'Bicol Region (Region V)' },
    { code: '09', name: 'Western Visayas (Region VI)' },
    { code: '10', name: 'Central Visayas (Region VII)' },
    { code: '11', name: 'Eastern Visayas (Region VIII)' },
    { code: '12', name: 'Zamboanga Peninsula (Region IX)' },
    { code: '13', name: 'Northern Mindanao (Region X)' },
    { code: '14', name: 'Davao Region (Region XI)' },
    { code: '15', name: 'Soccsksargen (Region XII)' },
    { code: '16', name: 'Caraga (Region XIII)' }
  ];

  useEffect(() => {
    loadClinics();
  }, []);

  const loadClinics = async () => {
    setLoadingClinics(true);
    try {
      const { data, error } = await supabase
        .from('mocards_clinics')
        .select('*')
        .eq('is_active', true)
        .order('clinic_name');

      if (error) throw error;
      setClinics(data || []);
    } catch (err: any) {
      console.error('Error loading clinics:', err);
    } finally {
      setLoadingClinics(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    setError('');
    setSearchResults([]);
    setSelectedCard(null);

    try {
      // Search for cards using the existing function
      const card = await dbOperations.getCardByControlNumber(searchQuery.trim());

      if (card) {
        // Check if card is unactivated
        if (!card.is_activated) {
          setSearchResults([card]);
          setSelectedCard(card);
        } else {
          setError('Card is already activated');
        }
      } else {
        setError('Card not found');
      }
    } catch (err: any) {
      setError('Error searching for cards: ' + err.message);
    } finally {
      setSearching(false);
    }
  };

  const handleActivateCard = async () => {
    if (!selectedCard) {
      setError('Please select a card to activate');
      return;
    }

    if (!activationForm.locationCode) {
      setError('Please select a location code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Generate the final control number
      const cardNum = selectedCard.card_number || 0;
      const displayNum = (cardNum + 9999).toString().padStart(5, '0');
      const selectedClinic = clinics.find(c => c.id === activationForm.clinicCode);
      const clinicCode = selectedClinic?.clinic_code || 'UNASSIGNED';
      const finalControlNumber = `MOC-${displayNum}-${activationForm.locationCode}-${clinicCode}`;

      // Update the card with activation data and new control number
      const updateData: any = {
        is_activated: true,
        status: 'activated',
        unified_control_number: finalControlNumber,
        location_code_v2: activationForm.locationCode,
        clinic_code_v2: clinicCode,
        activated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // If clinic is selected, also assign it
      if (activationForm.clinicCode) {
        updateData.assigned_clinic_id = activationForm.clinicCode;
        updateData.assigned_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('cards')
        .update(updateData)
        .eq('id', selectedCard.id);

      if (error) throw error;

      // Auto-assign default perks
      const { data: defaultPerks } = await supabase
        .from('default_perk_datalates')
        .select('*')
        .eq('is_default', true);

      if (defaultPerks && defaultPerks.length > 0) {
        const perkAssignments = defaultPerks.map(perk => ({
          card_id: selectedCard.id,
          perk_type: perk.perk_type,
          perk_value: perk.perk_value,
          is_claimed: false,
          created_at: new Date().toISOString()
        }));

        await supabase
          .from('card_perks')
          .insert(perkAssignments);
      }

      const locationName = locationCodes.find(l => l.code === activationForm.locationCode)?.name || 'Unknown';
      const clinicName = selectedClinic?.clinic_name || 'Unassigned';

      setSuccess(`✅ Card activated successfully!

Final Control Number: ${finalControlNumber}
Location: ${activationForm.locationCode} - ${locationName}
Clinic: ${clinicName}`);

      // Reset form
      setSelectedCard(null);
      setSearchQuery('');
      setSearchResults([]);
      setActivationForm({ locationCode: '01', clinicCode: '' });
    } catch (err: any) {
      setError('Error activating card: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="card card-hover p-6">
        <h2 className="text-3xl font-bold mb-2 text-gray-900">Card Activation System V2.0</h2>
        <p className="text-gray-600 text-lg">
          Activate unassigned cards and assign location/clinic codes - <span className="text-blue-600 font-medium">{clinicName}</span>
        </p>
      </div>

      {/* Search Section */}
      <div className="card card-hover p-6">
        <h3 className="text-xl font-medium text-gray-900 mb-6 flex items-center">
          <Search className="h-6 w-6 mr-3 text-blue-600" />
          Find Card to Activate
        </h3>

        <div className="flex space-x-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by control number or card number (e.g., MOC-__-____-00001 or 1)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field text-lg"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searching || !searchQuery.trim()}
            className="btn btn-primary px-6 py-3 flex items-center disabled:opacity-50"
          >
            {searching ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            ) : (
              <Search className="h-5 w-5 mr-2" />
            )}
            Search
          </button>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-700 mb-4">Search Results:</h4>
            <div className="space-y-3">
              {searchResults.map((card) => (
                <div
                  key={card.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                    selectedCard?.id === card.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedCard(card)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <CreditCard className="h-5 w-5 text-blue-600 mr-3" />
                      <span className="font-mono text-lg text-gray-800">{card.control_number_v2}</span>
                      <span className="mx-3 text-gray-400">•</span>
                      <span className="text-gray-600">Card #{card.card_number}</span>
                    </div>
                    <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-medium">
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
        <div className="card card-hover p-6">
          <h3 className="text-xl font-medium text-gray-900 mb-6 flex items-center">
            <CheckCircle className="h-6 w-6 mr-3 text-green-600" />
            Activate Selected Card
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Card Info */}
            <div className="space-y-6">
              <div className="border border-gray-200 p-6 rounded-lg bg-gray-50">
                <h4 className="text-sm font-medium text-gray-700 mb-4">Selected Card</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Current Control Number:</span>
                    <span className="font-mono text-blue-600">{selectedCard.control_number_v2}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Card Number:</span>
                    <span className="font-mono text-blue-600">#{selectedCard.card_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-medium">
                      {selectedCard.status}
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* Activation Form */}
            <div className="space-y-6">
              <div className="space-y-4">
                {/* Location Code Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    Location Code (Philippines Region)
                  </label>
                  <select
                    value={activationForm.locationCode}
                    onChange={(e) => setActivationForm({...activationForm, locationCode: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {locationCodes.map(location => (
                      <option key={location.code} value={location.code}>
                        {location.code} - {location.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Clinic Code Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <Building2 className="h-4 w-4 mr-2" />
                    Assign to Clinic (Optional)
                  </label>
                  <select
                    value={activationForm.clinicCode}
                    onChange={(e) => setActivationForm({...activationForm, clinicCode: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={loadingClinics}
                  >
                    <option value="">No clinic assignment</option>
                    {clinics.map(clinic => (
                      <option key={clinic.id} value={clinic.id}>
                        {clinic.clinic_name} ({clinic.clinic_code})
                      </option>
                    ))}
                  </select>
                  {loadingClinics && (
                    <p className="text-sm text-gray-500 mt-1">Loading clinics...</p>
                  )}
                </div>

                {/* Final Control Number Preview */}
                <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                  <label className="block text-sm font-medium text-blue-700 mb-2">
                    Final Control Number Preview:
                  </label>
                  <div className="font-mono text-lg font-bold text-blue-800">
                    {(() => {
                      const cardNum = selectedCard?.card_number || 0;
                      const displayNum = (cardNum + 9999).toString().padStart(5, '0');
                      const selectedClinic = clinics.find(c => c.id === activationForm.clinicCode);
                      const clinicCode = selectedClinic?.clinic_code || 'UNASSIGNED';
                      return `MOC-${displayNum}-${activationForm.locationCode}-${clinicCode}`;
                    })()}
                  </div>
                </div>

                <button
                  onClick={handleActivateCard}
                  disabled={loading || !activationForm.locationCode}
                  className="btn w-full px-6 py-4 text-lg font-bold uppercase tracking-wider flex items-center justify-center bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                      Activating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 mr-3" />
                      Activate Card
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg flex items-center">
          <AlertCircle className="h-6 w-6 mr-3" />
          <span className="text-lg">{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded-lg flex items-center">
          <CheckCircle className="h-6 w-6 mr-3" />
          <span className="text-lg">{success}</span>
        </div>
      )}

      {/* Information */}
      <div className="card p-6">
        <div className="border border-blue-200 p-6 rounded-lg bg-blue-50">
          <h4 className="text-lg font-medium text-blue-700 mb-4 flex items-center">
            <svg className="h-6 w-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            How Card Activation Works:
          </h4>
          <ul className="text-gray-700 space-y-2 text-base">
            <li className="flex items-start">
              <span className="text-blue-600 mr-3">•</span>
              Search for unactivated cards using control number or 5-digit number (00001-10000)
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-3">•</span>
              Only unactivated cards will appear in search results
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-3">•</span>
              Click "Activate Card" to activate the selected card
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-3">•</span>
              Default perks will be automatically assigned to activated card
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-3">•</span>
              Card status will change from "unassigned" to "activated"
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}