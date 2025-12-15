import { useState } from 'react';
import { dbOperations } from '../lib/supabase';
import { SearchComponent } from './SearchComponent';
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
  const [searchSuggestions] = useState<any[]>([]);


  const lookupCard = async (query?: string) => {
    const searchQuery = query || controlNumber;
    if (!searchQuery) {
      setError('Please enter your card number');
      return;
    }

    setIsLoading(true);
    setError('');
    setCardDetails(null);

    try {
      // Use universal card lookup system
      const card = await dbOperations.getCardByControlNumber(searchQuery.trim());

      if (card) {
        const cardDetails: CardDetails = {
          id: card.id,
          control_number: card.control_number_v2 || card.control_number || '',
          passcode: card.passcode || '',
          status: card.status,
          activated_at: card.activated_at,
          expires_at: card.expires_at,
          clinic_name: card.clinic?.clinic_name,
          perks: (card.perks || []).map(perk => ({
            id: perk.id,
            perk_type: perk.perk_type,
            perk_value: 500, // Default value, should be mapped from actual perk data
            claimed: perk.claimed,
            claimed_at: perk.claimed_at
          }))
        };

        setCardDetails(cardDetails);

        // If callback is provided, call it
        if (onCardFound) {
          onCardFound(cardDetails);
        }
      } else {
        setError('Card not found. Try searching with 5-digit format (e.g., 00001) or full control number.');
      }
    } catch (err: any) {
      // Production: error logging removed
      setError('Error looking up card. Please try again.');
    } finally {
      setIsLoading(false);
    }
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
      case 'activated': return 'status-success';
      case 'assigned': return 'status-warning';
      case 'unassigned': return 'status-info';
      case 'expired': return 'status-error';
      case 'suspended': return 'status-error';
      default: return 'status-info';
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
    <div className="min-h-screen py-8 relative" style={{ backgroundColor: 'var(--md-sys-color-surface)' }}>
      <div className="container-responsive section-spacing">
        {/* Header */}
        <div className="mb-12">
          {onBack && (
            <button
              onClick={onBack}
              className="btn btn-text flex items-center mb-6 state-layer"
              style={{
                color: 'var(--md-sys-color-primary)',
                padding: '12px 16px',
                borderRadius: 'var(--md-sys-shape-corner-medium)'
              }}
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back
            </button>
          )}
          <div className="text-center">
            <h1 className="display-large mb-6" style={{ color: 'var(--md-sys-color-on-surface)' }}>
              Card Lookup
            </h1>
            <p className="headline-small" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
              Enter your card control number to view your benefits
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 status-error p-6 flex items-center">
            <AlertCircle className="h-6 w-6 mr-3" />
            <span className="body-large">{error}</span>
          </div>
        )}

        {/* Universal Card Lookup */}
        <div className="card-airbnb-elevated p-8 mb-12">
          <div className="space-y-6">
            <div className="max-w-md mx-auto">
              <label className="block label-large mb-3" style={{ color: 'var(--md-sys-color-on-surface)' }}>
                Find Your Card
              </label>
              <SearchComponent
                placeholder="Enter 5-digit card number (e.g., 00001) or full control number"
                suggestions={searchSuggestions}
                onSearch={lookupCard}
                onSuggestionSelect={(suggestion) => lookupCard(suggestion.text)}
                isLoading={isLoading}
                results={[]}
                className="w-full"
                variant="hero"
                showRecentSearches={true}
              />
              <p className="mt-2 body-small" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
                Search with your 5-digit card number or full control number
              </p>
            </div>

            {/* Legacy manual input for backup */}
            <details className="mt-6">
              <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-900">
                Manual Entry (Legacy)
              </summary>
              <div className="mt-4 max-w-md mx-auto">
                <input
                  type="text"
                  value={controlNumber}
                  onChange={(e) => setControlNumber(e.target.value)}
                  className="input-field w-full"
                  placeholder="e.g., MOC-01-NCR1-00001"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => lookupCard()}
                  disabled={isLoading || !controlNumber}
                  className="cta-primary w-full mt-3 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-current mr-3"></div>
                      Looking up...
                    </>
                  ) : (
                    <>
                      <Search className="h-6 w-6 mr-3" />
                      Look Up Card
                    </>
                  )}
                </button>
              </div>
            </details>
          </div>
        </div>

        {/* Card Details */}
        {cardDetails && (
          <div className="space-y-8">
            {/* Card Information */}
            <div className="card-airbnb-elevated">
              <div className="p-6 mb-6" style={{
                backgroundColor: 'var(--md-sys-color-primary-container)',
                borderRadius: 'var(--md-sys-shape-corner-large)',
                border: `1px solid var(--md-sys-color-primary)`
              }}>
                <div className="flex items-center">
                  <CreditCard className="h-7 w-7 mr-4" style={{ color: 'var(--md-sys-color-on-primary-container)' }} />
                  <h2 className="headline-medium" style={{ color: 'var(--md-sys-color-on-primary-container)' }}>Card Information</h2>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="card p-4">
                    <p className="label-medium mb-2" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Control Number</p>
                    <p className="body-large font-mono" style={{ color: 'var(--md-sys-color-primary)' }}>{cardDetails.control_number}</p>
                  </div>

                  <div className="card p-4">
                    <p className="label-medium mb-2" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Status</p>
                    <span className={`badge ${getStatusColor(cardDetails.status).replace('status-', 'badge-')}`}>
                      {getStatusIcon(cardDetails.status)} {getStatusLabel(cardDetails.status)}
                    </span>
                  </div>

                  {cardDetails.clinic_name && (
                    <div className="card p-4">
                      <p className="label-medium mb-2" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Assigned Clinic</p>
                      <p className="body-medium flex items-center" style={{ color: 'var(--md-sys-color-on-surface)' }}>
                        <MapPin className="h-4 w-4 mr-2" style={{ color: 'var(--md-sys-color-tertiary)' }} />
                        {cardDetails.clinic_name}
                      </p>
                    </div>
                  )}

                  {cardDetails.expires_at && (
                    <div className="card p-4">
                      <p className="label-medium mb-2" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Expires</p>
                      <p className="body-medium flex items-center" style={{ color: 'var(--md-sys-color-on-surface)' }}>
                        <Calendar className="h-4 w-4 mr-2" style={{ color: 'var(--md-sys-color-secondary)' }} />
                        {new Date(cardDetails.expires_at).toLocaleDasearchring()}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Status Messages */}
              <div className="p-6 pt-0">
                {cardDetails.status === 'activated' && cardDetails.activated_at && (
                  <div className="status-success p-4">
                    <p className="body-medium flex items-center">
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Card activated on {new Date(cardDetails.activated_at).toLocaleDasearchring()}
                    </p>
                  </div>
                )}

                {cardDetails.status === 'assigned' && (
                  <div className="status-warning p-4">
                    <p className="body-medium flex items-center">
                      <AlertCircle className="h-5 w-5 mr-2" />
                      <strong>Card Not Yet Activated:</strong> Please visit {cardDetails.clinic_name || 'your assigned clinic'} to activate this card and unlock your benefits.
                    </p>
                  </div>
                )}

                {cardDetails.status === 'unassigned' && (
                  <div className="status-info p-4">
                    <p className="body-medium flex items-center">
                      <AlertCircle className="h-5 w-5 mr-2" />
                      <strong>Card Not Yet Assigned:</strong> This card has not been assigned to a clinic yet. Please contact customer service.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Card Benefits */}
            <div className="card-airbnb-elevated">
              <div className="p-6 mb-6" style={{
                backgroundColor: 'var(--md-sys-color-success-container)',
                borderRadius: 'var(--md-sys-shape-corner-large)',
                border: `1px solid var(--md-sys-color-success)`
              }}>
                <h2 className="headline-medium" style={{ color: 'var(--md-sys-color-on-success-container)' }}>Available Benefits</h2>
              </div>

              <div className="p-6 relative">
                {/* Blur overlay for non-activated cards */}
                {cardDetails.status !== 'activated' && (
                  <div className="absolute inset-0 rounded-xl z-10 flex items-center justify-center" style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    backdropFilter: 'blur(8px)'
                  }}>
                    <div className="text-center p-6">
                      <AlertCircle className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--md-sys-color-warning)' }} />
                      <h3 className="title-large mb-2" style={{ color: 'var(--md-sys-color-on-surface)' }}>
                        Card Activation Required
                      </h3>
                      <p className="body-medium" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
                        Please activate your card at {cardDetails.clinic_name || 'an assigned clinic'} to view your benefits.
                      </p>
                    </div>
                  </div>
                )}

                {/* Benefits List */}
                {cardDetails.perks && cardDetails.perks.length > 0 ? (
                  <div className="grid-responsive">
                    {cardDetails.perks.map((perk) => (
                      <div key={perk.id} className={`card p-6 transition-all duration-300 ${
                        perk.claimed ? 'opacity-60' : 'card-hover'
                      }`} style={{
                        borderColor: perk.claimed ? 'var(--md-sys-color-outline)' : 'var(--md-sys-color-success)'
                      }}>
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="title-medium" style={{ color: 'var(--md-sys-color-on-surface)' }}>{formatPerkType(perk.perk_type)}</h4>
                          {perk.claimed ? (
                            <span className="badge badge-info label-small">Used</span>
                          ) : (
                            <span className="badge badge-success label-small">Available</span>
                          )}
                        </div>
                        <p className="headline-medium mb-2" style={{ color: 'var(--md-sys-color-success)' }}>
                          {perk.perk_type === 'discount' ? `${perk.perk_value}% OFF` :
                           perk.perk_type === 'cashback' ? formatCurrency(perk.perk_value) :
                           perk.perk_type === 'points' ? `${perk.perk_value} points` :
                           formatCurrency(perk.perk_value)}
                        </p>
                        {perk.claimed && perk.claimed_at && (
                          <p className="label-small" style={{ color: 'var(--md-sys-color-outline)' }}>
                            Used on {new Date(perk.claimed_at).toLocaleDasearchring()}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <CreditCard className="h-16 w-16 mx-auto mb-4" style={{ color: 'var(--md-sys-color-outline)' }} />
                    <h3 className="title-large mb-2" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>No Benefits Available</h3>
                    <p className="body-medium" style={{ color: 'var(--md-sys-color-outline)' }}>
                      This card doesn't have any benefits assigned yet.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Information Footer */}
            <div className="card-airbnb p-6">
              <h4 className="title-large mb-4" style={{ color: 'var(--md-sys-color-on-surface)' }}>Important Information</h4>
              <ul className="body-medium space-y-2" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
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