import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface CardDetails {
  id: string;
  control_number: string;
  passcode: string;
  status: string;
  activated_at?: string;
  expires_at?: string;
  clinic_name?: string;
  perks: Array<{
    id: string;
    perk_type: string;
    claimed: boolean;
    claimed_at?: string;
  }>;
}

interface CardholderLookupProps {
  prefilledData?: { control: string; passcode: string } | null;
}

export function CardholderLookup({ prefilledData }: CardholderLookupProps) {
  const [controlNumber, setControlNumber] = useState(prefilledData?.control || '');
  const [passcode, setPasscode] = useState(prefilledData?.passcode || '');
  const [cardDetails, setCardDetails] = useState<CardDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const lookupCard = async () => {
    if (!controlNumber || !passcode) {
      setError('Please enter both control number and passcode');
      return;
    }

    setIsLoading(true);
    setError('');
    setCardDetails(null);

    try {
      // Look up card with clinic information
      const { data: card, error: cardError } = await supabase
        .from('cards')
        .select(`
          id,
          control_number,
          passcode,
          status,
          activated_at,
          expires_at,
          clinic:mocards_clinics(clinic_name)
        `)
        .eq('control_number', controlNumber.toUpperCase())
        .eq('passcode', passcode.toUpperCase())
        .single();

      if (cardError) {
        if (cardError.code === 'PGRST116') {
          setError('Card not found. Please check your control number and passcode.');
        } else {
          throw cardError;
        }
        return;
      }

      // Get card perks
      const { data: perks, error: perksError } = await supabase
        .from('card_perks')
        .select('id, perk_type, claimed, claimed_at')
        .eq('card_id', card.id)
        .order('perk_type');

      if (perksError) throw perksError;

      setCardDetails({
        id: card.id,
        control_number: card.control_number,
        passcode: card.passcode,
        status: card.status,
        activated_at: card.activated_at,
        expires_at: card.expires_at,
        clinic_name: (card.clinic as any)?.clinic_name,
        perks: perks || []
      });

    } catch (err) {
      console.error('Error looking up card:', err);
      setError('Error looking up card. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    lookupCard();
  };

  const formatPerkName = (perkType: string) => {
    const perkNames: Record<string, string> = {
      consultation: 'Free Consultation',
      cleaning: 'Teeth Cleaning',
      extraction: 'Tooth Extraction',
      fluoride: 'Fluoride Treatment',
      whitening: 'Teeth Whitening',
      xray: 'X-Ray',
      denture: 'Denture Adjustment',
      braces: 'Braces Consultation'
    };
    return perkNames[perkType] || perkType;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'activated': return 'text-green-600 bg-green-100';
      case 'unactivated': return 'text-orange-600 bg-orange-100';
      case 'expired': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'activated': return '✅ Active';
      case 'unactivated': return '⏳ Not Activated';
      case 'expired': return '❌ Expired';
      default: return status;
    }
  };

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          MOCARDS Loyalty Card Checker
        </h1>
        <p className="text-gray-600">
          Enter your card details to check status, validity, and available perks
        </p>
      </div>

      {/* Lookup Form */}
      <div className="bg-white shadow rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Control Number
            </label>
            <input
              type="text"
              value={controlNumber}
              onChange={(e) => setControlNumber(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-lg"
              placeholder="MOC-12345678-001"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Found on your physical loyalty card
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Passcode
            </label>
            <input
              type="text"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-lg"
              placeholder="CAV1234"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              3-letter location code + 4 digits (e.g., CAV1234)
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading || !controlNumber || !passcode}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-medium"
          >
            {isLoading ? 'Checking Card...' : '🔍 Check Card Status'}
          </button>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
        </form>
      </div>

      {/* Card Details */}
      {cardDetails && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {/* Card Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">MOCARDS Loyalty Card</h2>
                <p className="text-blue-100 font-mono">{cardDetails.control_number}</p>
              </div>
              <div className="text-right">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(cardDetails.status)}`}>
                  {getStatusText(cardDetails.status)}
                </span>
              </div>
            </div>
          </div>

          {/* Card Info */}
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Card Information</h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Passcode:</strong> <span className="font-mono">{cardDetails.passcode}</span></p>
                  <p><strong>Status:</strong> {getStatusText(cardDetails.status)}</p>
                  {cardDetails.clinic_name && (
                    <p><strong>Clinic:</strong> {cardDetails.clinic_name}</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-2">Validity</h3>
                <div className="space-y-2 text-sm">
                  {cardDetails.activated_at && (
                    <p><strong>Activated:</strong> {new Date(cardDetails.activated_at).toLocaleDateString()}</p>
                  )}
                  {cardDetails.expires_at && (
                    <p><strong>Expires:</strong>
                      <span className={isExpired(cardDetails.expires_at) ? 'text-red-600 font-medium' : 'text-green-600'}>
                        {' '}{new Date(cardDetails.expires_at).toLocaleDateString()}
                      </span>
                    </p>
                  )}
                  {cardDetails.status === 'activated' && cardDetails.expires_at && (
                    <p className="text-xs text-gray-500">
                      {isExpired(cardDetails.expires_at)
                        ? '⚠️ Card has expired'
                        : '✅ Card is valid'
                      }
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Perks Section */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Available Benefits</h3>
              {cardDetails.perks.length === 0 ? (
                <p className="text-gray-500 text-sm">No perks available for this card.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {cardDetails.perks.map(perk => (
                    <div
                      key={perk.id}
                      className={`p-3 rounded-md border ${
                        perk.claimed
                          ? 'bg-gray-50 border-gray-200'
                          : 'bg-green-50 border-green-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${perk.claimed ? 'text-gray-500' : 'text-green-700'}`}>
                          {perk.claimed ? '❌' : '✅'} {formatPerkName(perk.perk_type)}
                        </span>
                      </div>
                      {perk.claimed && perk.claimed_at && (
                        <p className="text-xs text-gray-500 mt-1">
                          Used on {new Date(perk.claimed_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Perk Summary */}
              <div className="mt-4 p-3 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-700">
                  <strong>Perk Status:</strong>{' '}
                  {cardDetails.perks.filter(p => !p.claimed).length} of {cardDetails.perks.length} benefits remaining
                </p>
              </div>
            </div>

            {/* Instructions */}
            <div className="mt-6 p-4 bg-gray-50 rounded-md">
              <h4 className="font-medium text-gray-900 mb-2">How to Use Your Card</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Visit any partner clinic with your card</li>
                <li>• Present your control number and passcode</li>
                <li>• Clinic staff will redeem your benefits</li>
                <li>• Benefits expire with your card validity date</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-medium text-yellow-900 mb-2">Need Help?</h3>
        <div className="text-sm text-yellow-800 space-y-1">
          <p>• Can't find your control number? Check the front of your physical card</p>
          <p>• Passcode format: 3 letters + 4 numbers (e.g., CAV1234, MNL5678)</p>
          <p>• Card not working? Contact your clinic or call support</p>
        </div>
      </div>
    </div>
  );
}