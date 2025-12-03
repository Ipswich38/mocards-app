
import { Card } from '../lib/supabase';

interface PatientCardViewProps {
  cardData: Card;
  onBack: () => void;
}

const PERK_DETAILS = {
  consultation: { name: 'Dental Consultation', value: '₱500', description: 'Free checkup' },
  cleaning: { name: 'Dental Cleaning', value: '₱800', description: 'Free professional cleaning' },
  extraction: { name: 'Tooth Extraction', value: '₱1,500', description: 'Free extraction' },
  fluoride: { name: 'Fluoride Treatment', value: '₱300', description: 'Free treatment' },
  whitening: { name: 'Teeth Whitening', value: '₱2,500', description: '50% off whitening' },
  xray: { name: 'Dental X-Ray', value: '₱1,000', description: '50% off x-ray' },
  denture: { name: 'Denture Service', value: '₱3,000', description: '20% off dentures' },
  braces: { name: 'Braces Discount', value: '₱5,000', description: '10% off braces' }
};

export function PatientCardView({ cardData, onBack }: PatientCardViewProps) {
  const perksArray = (cardData.perks || []).map((perk) => ({
    key: perk.perk_type,
    ...perk,
    ...PERK_DETAILS[perk.perk_type as keyof typeof PERK_DETAILS]
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 py-6 px-6">
        <div className="max-w-md mx-auto flex items-center gap-6">
          <button
            onClick={onBack}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors uppercase tracking-wider hover:bg-gray-50 px-4 py-2 rounded-lg"
          >
            ← Back
          </button>
          <div>
            <div className="text-2xl text-gray-900 tracking-tight">My Card</div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4 pb-20">
        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}></div>

          <div className="relative mb-12">
            <div className="w-12 h-10 bg-gradient-to-br from-yellow-200 to-yellow-400 rounded-lg"></div>
          </div>

          <div className="relative mb-8">
            <div className="text-xs uppercase tracking-widest text-gray-400 mb-2">Card Number</div>
            <div className="text-2xl tracking-widest font-mono">{cardData.control_number}</div>
          </div>

          <div className="relative flex items-end justify-between">
            <div>
              <div className="text-xs uppercase tracking-widest text-gray-400 mb-1">Location</div>
              <div className="text-lg tracking-wide">{cardData.location_code}</div>
            </div>
            <div className="text-right">
              <div className="text-3xl tracking-wider">MOCARDS</div>
              <div className="text-xs uppercase tracking-widest text-gray-400 mt-1">Dental</div>
            </div>
          </div>

          <div className="absolute top-6 right-6">
            <div className={`px-3 py-1 rounded-full text-xs uppercase tracking-wider ${
              cardData.status === 'activated'
                ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
            }`}>
              {cardData.status === 'activated' ? '● Active' : '○ Pending'}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wider text-gray-400 mb-1">Total Value</div>
          <div className="text-4xl text-gray-900">₱9,900</div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {perksArray.map((perk) => {
            const isAvailable = !perk.claimed;

            return (
              <div
                key={perk.key}
                className={`rounded-2xl p-5 shadow-sm relative overflow-hidden transition-all ${
                  isAvailable
                    ? 'bg-blue-600 shadow-md'
                    : 'bg-gray-200'
                }`}
              >
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-2.5 h-2.5 rounded-full ${
                      isAvailable ? 'bg-white' : 'bg-gray-400'
                    }`}></div>
                    <div className={`text-xs uppercase tracking-wider ${
                      isAvailable ? 'text-blue-200' : 'text-gray-500'
                    }`}>
                      {isAvailable ? 'Available' : 'Claimed'}
                    </div>
                  </div>

                  <div className={`mb-2 leading-tight ${
                    isAvailable ? 'text-white' : 'text-gray-600'
                  }`}>
                    {perk.name}
                  </div>

                  <div className={`text-2xl mb-3 ${
                    isAvailable
                      ? 'text-white'
                      : 'text-gray-500 line-through'
                  }`}>
                    {perk.value}
                  </div>

                  <div className={`text-xs leading-relaxed ${
                    isAvailable
                      ? 'text-blue-100'
                      : 'text-gray-500'
                  }`}>
                    {perk.description}
                  </div>

                  {perk.claimed_at && (
                    <div className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-300">
                      Claimed: {new Date(perk.claimed_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-gray-900 text-white rounded-2xl p-5">
          <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">How to Use</div>
          <div className="text-sm leading-relaxed">
            Visit any participating dental clinic and present your card number <span className="font-mono text-blue-300">{cardData.control_number}</span> with your passcode to redeem perks.
          </div>
        </div>
      </div>
    </div>
  );
}
