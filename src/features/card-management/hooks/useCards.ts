// Card Management Hook
// Provides card-related state and operations

import { useState, useEffect, useCallback } from 'react';
import { cardService } from '../services/cardService';
import {
  Card,
  CardFilters,
  CardLookupResult,
  CardStatistics,
  CardGenerationRequest,
  CardUpdateData
} from '../types';

interface UseCardsResult {
  cards: Card[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: CardFilters;
  statistics: CardStatistics | null;

  // Actions
  fetchCards: (page?: number) => Promise<void>;
  setFilters: (filters: CardFilters) => void;
  clearFilters: () => void;
  refreshCards: () => Promise<void>;
  updateCard: (id: string, data: CardUpdateData) => Promise<boolean>;
  deleteCard: (id: string) => Promise<boolean>;
  generateCards: (request: CardGenerationRequest) => Promise<boolean>;
  lookupCard: (controlNumber: string) => Promise<CardLookupResult | null>;
  updateCardPerks: (controlNumber: string, perksUsed: number) => Promise<boolean>;
  getCardStatistics: (clinicId?: string) => Promise<void>;
}

export function useCards(
  initialFilters: CardFilters = {},
  autoFetch: boolean = true
): UseCardsResult {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<CardFilters>(initialFilters);
  const [statistics, setStatistics] = useState<CardStatistics | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  // Fetch cards with current filters and pagination
  const fetchCards = useCallback(async (page: number = pagination.page) => {
    setLoading(true);
    setError(null);

    try {
      const result = await cardService.getCards(filters, page, pagination.limit);

      setCards(result.data || []);
      setPagination({
        page: result.page,
        limit: result.limit,
        total: result.count,
        totalPages: result.totalPages
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch cards');
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.limit]);

  // Set filters and refresh
  const setFilters = useCallback((newFilters: CardFilters) => {
    setFiltersState(newFilters);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFiltersState({});
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  // Refresh current page
  const refreshCards = useCallback(async () => {
    await fetchCards();
  }, [fetchCards]);

  // Update card
  const updateCard = useCallback(async (id: string, data: CardUpdateData): Promise<boolean> => {
    try {
      await cardService.updateCard(id, data);
      await refreshCards(); // Refresh the list
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to update card');
      return false;
    }
  }, [refreshCards]);

  // Delete card
  const deleteCard = useCallback(async (id: string): Promise<boolean> => {
    try {
      const success = await cardService.deleteCard(id);
      if (success) {
        await refreshCards(); // Refresh the list
      }
      return success;
    } catch (err: any) {
      setError(err.message || 'Failed to delete card');
      return false;
    }
  }, [refreshCards]);

  // Generate cards
  const generateCards = useCallback(async (request: CardGenerationRequest): Promise<boolean> => {
    try {
      await cardService.generateCards(request);
      await refreshCards(); // Refresh to show new cards
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to generate cards');
      return false;
    }
  }, [refreshCards]);

  // Lookup single card
  const lookupCard = useCallback(async (controlNumber: string): Promise<CardLookupResult | null> => {
    try {
      setError(null);
      return await cardService.lookupCard(controlNumber);
    } catch (err: any) {
      setError(err.message || 'Failed to lookup card');
      return null;
    }
  }, []);

  // Update card perks
  const updateCardPerks = useCallback(async (controlNumber: string, perksUsed: number): Promise<boolean> => {
    try {
      const success = await cardService.updateCardPerks(controlNumber, perksUsed);
      if (success) {
        await refreshCards(); // Refresh to show updated perk counts
      }
      return success;
    } catch (err: any) {
      setError(err.message || 'Failed to update card perks');
      return false;
    }
  }, [refreshCards]);

  // Get statistics
  const getCardStatistics = useCallback(async (clinicId?: string) => {
    try {
      const stats = await cardService.getCardStatistics(clinicId);
      setStatistics(stats);
    } catch (err: any) {
      setError(err.message || 'Failed to get card statistics');
    }
  }, []);

  // Auto-fetch on mount and filter changes
  useEffect(() => {
    if (autoFetch) {
      fetchCards(1);
    }
  }, [filters, autoFetch]); // Note: fetchCards is not in deps to avoid infinite loop

  // Fetch cards when filters change
  useEffect(() => {
    if (autoFetch) {
      const timeoutId = setTimeout(() => {
        fetchCards(1);
      }, 300); // Debounce filter changes

      return () => clearTimeout(timeoutId);
    }
  }, [filters]);

  return {
    cards,
    loading,
    error,
    pagination,
    filters,
    statistics,
    fetchCards,
    setFilters,
    clearFilters,
    refreshCards,
    updateCard,
    deleteCard,
    generateCards,
    lookupCard,
    updateCardPerks,
    getCardStatistics
  };
}

// Hook for single card operations
export function useCard(identifier?: string, byControlNumber: boolean = false) {
  const [card, setCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCard = useCallback(async (id: string) => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const result = await cardService.getCard(id, byControlNumber);
      setCard(result);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch card');
      setCard(null);
    } finally {
      setLoading(false);
    }
  }, [byControlNumber]);

  const updateCard = useCallback(async (data: CardUpdateData): Promise<boolean> => {
    if (!card) return false;

    try {
      const updatedCard = await cardService.updateCard(card.id, data);
      setCard(updatedCard);
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to update card');
      return false;
    }
  }, [card]);

  // Fetch card when identifier changes
  useEffect(() => {
    if (identifier) {
      fetchCard(identifier);
    }
  }, [identifier, fetchCard]);

  return {
    card,
    loading,
    error,
    fetchCard,
    updateCard,
    refreshCard: () => identifier && fetchCard(identifier)
  };
}

// Hook for card lookup operations
export function useCardLookup() {
  const [lookupResult, setLookupResult] = useState<CardLookupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  const lookupCard = useCallback(async (controlNumber: string): Promise<CardLookupResult | null> => {
    if (!controlNumber.trim()) return null;

    setLoading(true);
    setError(null);

    try {
      const result = await cardService.lookupCard(controlNumber);
      setLookupResult(result);

      // Add to history (keep last 10 searches)
      setHistory(prev => {
        const newHistory = [controlNumber, ...prev.filter(h => h !== controlNumber)];
        return newHistory.slice(0, 10);
      });

      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to lookup card');
      setLookupResult(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearLookup = useCallback(() => {
    setLookupResult(null);
    setError(null);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return {
    lookupResult,
    loading,
    error,
    history,
    lookupCard,
    clearLookup,
    clearHistory
  };
}