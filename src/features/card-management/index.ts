// Card Management Feature Module
// Public API exports for the card management feature

// Types
export type {
  Card,
  CardCategory,
  CardHistory,
  CardExport,
  CardValidation,
  CardGenerationRequest,
  CardBatch,
  CardLookupResult,
  CardFilters,
  CardUpdateData,
  QRCodeData,
  CardStatistics
} from './types';

// Services
export { cardService } from './services/cardService';

// Hooks
export { useCards, useCard, useCardLookup } from './hooks/useCards';

// Components (will be added when we create them)
// export { CardList, CardForm, CardLookup, CardStatsDashboard } from './components';