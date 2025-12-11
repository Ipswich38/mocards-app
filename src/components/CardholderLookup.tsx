import { useState } from 'react';
import { streamlinedOps, codeUtils } from '../lib/streamlined-operations';
import { Search, CreditCard, ArrowLeft, CheckCircle, AlertCircle, Calendar, MapPin } from 'lucide-react';

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
    perk_value: number;
    claimed: boolean;
    claimed_at?: string;
  }>;
}

interface CardholderLookupProps {
  onBack?: () => void;
  onCardFound?: (cardData: CardDetails) => void;
  prefilledData?: { control: string } | null;
}

export function CardholderLookup({ onBack, onCardFound, prefilledData }: CardholderLookupProps) {
  const [controlNumber, setControlNumber] = useState(prefilledData?.control || '');
  const [cardDetails, setCardDetails] = useState<CardDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const lookupCard = async () => {
    if (!controlNumber) {
      setError('Please enter your control number');
      return;
    }

    setIsLoading(true);
    setError('');
    setCardDetails(null);

    try {
      // Normalize the input code
      const normalizedControl = codeUtils.normalizeControlNumber(controlNumber.trim());

      // Look up the card using streamlined operations (control number only)
      const card = await (streamlinedOps as any).lookupCard(normalizedControl);

      const cardDetails: CardDetails = {
        id: card.id,
        control_number: card.control_number,
        passcode: card.passcode,
        status: card.status,
        activated_at: card.activated_at,
        expires_at: card.expires_at,
        clinic_name: card.clinics?.clinic_name,
        perks: card.card_perks || []
      };

      setCardDetails(cardDetails);

      // If callback is provided, call it
      if (onCardFound) {
        onCardFound(cardDetails);
      }
    } catch (err: any) {
      if (err.message.includes('PGRST116') || err.message.includes('not found')) {
        setError('Card not found. Please check your control number.');
      } else {
        setError('Error looking up card. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    lookupCard();
  };

  const formatPerkType = (perkType: string) => {
    return perkType.charAt(0).toUpperCase() + perkType.slice(1).replace('_', ' ');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'activated': return 'glass-success';
      case 'assigned': return 'glass-warning';
      case 'unassigned': return 'glass-info';
      case 'expired': return 'glass-error';
      case 'suspended': return 'glass-error';
      default: return 'glass-info';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'activated': return '✅';
      case 'assigned': return '⏳';
      case 'unassigned': return '📋';
      case 'expired': return '❌';
      case 'suspended': return '🚫';
      default: return '❓';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'activated': return 'Activated';
      case 'assigned': return 'Awaiting Activation';
      case 'unassigned': return 'Unassigned';
      case 'expired': return 'Expired';
      case 'suspended': return 'Suspended';
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  return (
    <div className="min-h-screen py-8 relative overflow-hidden">
      {/* Floating Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-32 left-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-32 right-16 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }}></div>
      </div>

      <div className="max-w-4xl mx-auto px-6 relative z-10">
        {/* Header */}
        <div className="mb-12">
          {onBack && (
            <button
              onClick={onBack}
              className="glass-button-secondary flex items-center mb-6"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back
            </button>
          )}
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-slate-100 mb-4 animate-gradient bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-400 bg-clip-text text-transparent">
              Card Lookup
            </h1>
            <p className="text-xl text-slate-300">
              Enter your card control number to view your benefits
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 glass glass-error rounded-xl px-6 py-4 flex items-center animate-float">
            <AlertCircle className="h-6 w-6 mr-3" />
            <span className="text-lg">{error}</span>
          </div>
        )}

        {/* Lookup Form */}
        <div className="glass-card animate-float mb-12">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="max-w-md mx-auto">
              <div>
                <label htmlFor="control" className="block text-lg font-medium text-slate-300 mb-3">
                  Control Number
                </label>
                <input
                  type="text"
                  id="control"
                  value={controlNumber}
                  onChange={(e) => setControlNumber(e.target.value)}
                  className="glass-input w-full text-xl"
                  placeholder="e.g., MOC-01-NCR1-00001"
                  disabled={isLoading}
                />
                <p className="mt-2 text-sm text-slate-400">
                  Enter your card control number with or without dashes
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !controlNumber}
              className="glass-button w-full flex items-center justify-center px-6 py-4 text-lg font-medium"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                  Looking up...
                </>
              ) : (
                <>
                  <Search className="h-6 w-6 mr-3" />
                  Look Up Card
                </>
              )}
            </button>
          </form>
        </div>

        {/* Card Details */}
        {cardDetails && (
          <div className="space-y-8 animate-float" style={{ animationDelay: '1s' }}>
            {/* Card Information */}
            <div className="glass-card">
              <div className="glass p-6 rounded-xl border border-blue-400/50 bg-blue-500/10 mb-6">
                <div className="flex items-center">
                  <CreditCard className="h-7 w-7 text-blue-400 mr-4" />
                  <h2 className="text-2xl font-semibold text-slate-100">Card Information</h2>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="glass p-4 rounded-lg border border-slate-500/30">
                  <p className="text-sm font-medium text-slate-400 mb-2">Control Number</p>
                  <p className="text-lg font-mono text-blue-300">{cardDetails.control_number}</p>
                </div>

                <div className="glass p-4 rounded-lg border border-slate-500/30">
                  <p className="text-sm font-medium text-slate-400 mb-2">Status</p>
                  <span className={`glass-badge ${getStatusColor(cardDetails.status)}`}>
                    {getStatusIcon(cardDetails.status)} {getStatusLabel(cardDetails.status)}
                  </span>
                </div>

                {cardDetails.clinic_name && (
                  <div className="glass p-4 rounded-lg border border-slate-500/30">
                    <p className="text-sm font-medium text-slate-400 mb-2">Assigned Clinic</p>
                    <p className="text-slate-200 flex items-center">
                      <MapPin className="h-4 w-4 mr-2 text-cyan-400" />
                      {cardDetails.clinic_name}
                    </p>
                  </div>
                )}

                {cardDetails.expires_at && (
                  <div className="glass p-4 rounded-lg border border-slate-500/30">
                    <p className="text-sm font-medium text-slate-400 mb-2">Expires</p>
                    <p className="text-slate-200 flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-indigo-400" />
                      {new Date(cardDetails.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Card Status Messages */}
              {cardDetails.status === 'activated' && cardDetails.activated_at && (
                <div className="glass glass-success rounded-xl p-4 mt-6">
                  <p className="flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Card activated on {new Date(cardDetails.activated_at).toLocaleDateString()}
                  </p>
                </div>
              )}

              {cardDetails.status === 'assigned' && (
                <div className="glass glass-warning rounded-xl p-4 mt-6">
                  <p className="flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    <strong>Card Not Yet Activated:</strong> Please visit {cardDetails.clinic_name || 'your assigned clinic'} to activate this card and unlock your benefits.
                  </p>
                </div>
              )}

              {cardDetails.status === 'unassigned' && (
                <div className="glass glass-info rounded-xl p-4 mt-6">
                  <p className="flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    <strong>Card Not Yet Assigned:</strong> This card has not been assigned to a clinic yet. Please contact customer service.
                  </p>
                </div>
              )}
            </div>

            {/* Card Benefits */}
            <div className="glass-card">
              <div className="glass p-6 rounded-xl border border-green-400/50 bg-green-500/10 mb-6">
                <h2 className="text-2xl font-semibold text-slate-100">Available Benefits</h2>
              </div>

              <div className="relative">
                {/* Blur overlay for non-activated cards */}
                {cardDetails.status !== 'activated' && (
                  <div className="absolute inset-0 glass rounded-xl z-10 flex items-center justify-center">
                    <div className="text-center p-6">
                      <AlertCircle className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-slate-200 mb-2">
                        Card Activation Required
                      </h3>
                      <p className="text-slate-400">
                        Please activate your card at {cardDetails.clinic_name || 'an assigned clinic'} to view your benefits.
                      </p>
                    </div>
                  </div>
                )}

                {/* Benefits List */}
                {cardDetails.perks && cardDetails.perks.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {cardDetails.perks.map((perk) => (
                      <div key={perk.id} className={`glass p-6 rounded-xl border transition-all duration-300 ${
                        perk.claimed ? 'border-gray-500/30 opacity-60' : 'border-green-400/30 hover:border-green-400/50'
                      }`}>
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-semibold text-slate-200">{formatPerkType(perk.perk_type)}</h4>
                          {perk.claimed ? (
                            <span className="glass-badge text-xs">Used</span>
                          ) : (
                            <span className="glass-badge glass-success text-xs">Available</span>
                          )}
                        </div>
                        <p className="text-2xl font-bold text-green-400 mb-2">
                          {perk.perk_type === 'discount' ? `${perk.perk_value}% OFF` :
                           perk.perk_type === 'cashback' ? formatCurrency(perk.perk_value) :
                           perk.perk_type === 'points' ? `${perk.perk_value} points` :
                           formatCurrency(perk.perk_value)}
                        </p>
                        {perk.claimed && perk.claimed_at && (
                          <p className="text-xs text-slate-500">
                            Used on {new Date(perk.claimed_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <CreditCard className="h-16 w-16 text-slate-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-300 mb-2">No Benefits Available</h3>
                    <p className="text-slate-500">
                      This card doesn't have any benefits assigned yet.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Information Footer */}
            <div className="glass-card">
              <h4 className="text-lg font-semibold text-slate-200 mb-4">Important Information</h4>
              <ul className="text-slate-400 space-y-2">
                <li>• Benefits can only be used at your assigned clinic</li>
                <li>• Present this card when making appointments</li>
                <li>• Benefits expire on the date shown above</li>
                <li>• Contact your clinic if you have any questions</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}