import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Clock, TrendingUp, ArrowUpRight } from 'lucide-react';

interface SearchSuggestion {
  id: string;
  text: string;
  type: 'control_number' | 'card_number' | 'clinic_name' | 'recent';
  count?: number;
}

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  type: 'card' | 'clinic' | 'suggestion';
  metadata?: Record<string, any>;
}

interface SearchComponentProps {
  placeholder?: string;
  suggestions?: SearchSuggestion[];
  onSearch?: (query: string, type?: string) => void;
  onResultSelect?: (result: SearchResult) => void;
  onSuggestionSelect?: (suggestion: SearchSuggestion) => void;
  isLoading?: boolean;
  results?: SearchResult[];
  className?: string;
  variant?: 'default' | 'compact' | 'hero';
  showRecentSearches?: boolean;
  maxSuggestions?: number;
}

export function SearchComponent({
  placeholder = "Search cards, clinics, or control numbers...",
  suggestions = [],
  onSearch,
  onResultSelect,
  onSuggestionSelect,
  isLoading = false,
  results = [],
  className = "",
  variant = 'default',
  showRecentSearches = true,
  maxSuggestions = 5
}: SearchComponentProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    if (showRecentSearches) {
      const recent = localStorage.getItem('mocards-recent-searches');
      if (recent) {
        setRecentSearches(JSON.parse(recent));
      }
    }
  }, [showRecentSearches]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const saveToRecentSearches = (searchTerm: string) => {
    if (!showRecentSearches || !searchTerm.trim()) return;

    const updated = [searchTerm, ...recentSearches.filter(s => s !== searchTerm)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('mocards-recent-searches', JSON.stringify(updated));
  };

  const handleSearch = (searchTerm: string = query) => {
    if (!searchTerm.trim()) return;

    saveToRecentSearches(searchTerm.trim());
    onSearch?.(searchTerm.trim());
    setIsOpen(false);
    setFocusedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const totalItems = suggestions.length + results.length + (showRecentSearches ? recentSearches.length : 0);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => prev < totalItems - 1 ? prev + 1 : -1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => prev > -1 ? prev - 1 : totalItems - 1);
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex === -1) {
          handleSearch();
        } else {
          // Handle selection based on focused item
          const suggestionCount = suggestions.length;
          const resultCount = results.length;

          if (focusedIndex < suggestionCount) {
            onSuggestionSelect?.(suggestions[focusedIndex]);
          } else if (focusedIndex < suggestionCount + resultCount) {
            onResultSelect?.(results[focusedIndex - suggestionCount]);
          } else if (showRecentSearches) {
            const recentIndex = focusedIndex - suggestionCount - resultCount;
            if (recentIndex < recentSearches.length) {
              setQuery(recentSearches[recentIndex]);
              handleSearch(recentSearches[recentIndex]);
            }
          }
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setFocusedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const clearQuery = () => {
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const getSearchIcon = () => {
    if (isLoading) {
      return <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-400 border-t-transparent" />;
    }
    return <Search className="h-5 w-5 text-slate-400" />;
  };

  const getSizeClasses = () => {
    switch (variant) {
      case 'hero':
        return 'text-xl px-6 py-4';
      case 'compact':
        return 'text-sm px-4 py-2';
      default:
        return 'text-base px-4 py-3';
    }
  };

  const getContainerClasses = () => {
    const base = "relative w-full";
    const variantClasses = {
      hero: "max-w-2xl mx-auto",
      compact: "max-w-md",
      default: "max-w-lg"
    };
    return `${base} ${variantClasses[variant]} ${className}`;
  };

  return (
    <div ref={searchRef} className={getContainerClasses()}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
          {getSearchIcon()}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setFocusedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`
            w-full ${getSizeClasses()} pl-12 pr-12
            rounded-full
            border-2 border-[var(--md-sys-color-outline-variant)]
            bg-[var(--md-sys-color-surface-container-highest)]
            text-[var(--md-sys-color-on-surface)]
            placeholder-[var(--md-sys-color-on-surface-variant)]
            focus:border-[var(--md-sys-color-primary)]
            focus:ring-2 focus:ring-[color-mix(in_srgb,var(--md-sys-color-primary)_20%,transparent)]
            transition-all duration-200 ease-out
            hover:border-[var(--md-sys-color-outline)]
            body-large
          `}
        />

        {query && (
          <button
            onClick={clearQuery}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-slate-700/50 transition-colors"
          >
            <X className="h-4 w-4 text-slate-400" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (query.length > 0 || showRecentSearches) && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50">
          <div className="card-elevated overflow-hidden" style={{
            backgroundColor: 'var(--md-sys-color-surface-container)',
            boxShadow: 'var(--md-sys-elevation-level3)'
          }}>
            {/* Recent Searches */}
            {showRecentSearches && recentSearches.length > 0 && query.length === 0 && (
              <div className="p-3 border-b border-[var(--md-sys-color-outline-variant)]">
                <div className="flex items-center mb-2">
                  <Clock className="h-4 w-4 text-[var(--md-sys-color-on-surface-variant)] mr-2" />
                  <span className="label-medium text-[var(--md-sys-color-on-surface-variant)]">Recent searches</span>
                </div>
                {recentSearches.slice(0, 3).map((recent, index) => (
                  <button
                    key={`recent-${index}`}
                    onClick={() => {
                      setQuery(recent);
                      handleSearch(recent);
                    }}
                    className={`
                      w-full text-left px-3 py-2 rounded-lg body-medium text-[var(--md-sys-color-on-surface)]
                      hover:bg-[color-mix(in_srgb,var(--md-sys-color-on-surface)_8%,transparent)]
                      transition-colors state-layer
                      ${focusedIndex === suggestions.length + results.length + index ? 'bg-[color-mix(in_srgb,var(--md-sys-color-primary)_12%,transparent)]' : ''}
                    `}
                  >
                    {recent}
                  </button>
                ))}
              </div>
            )}

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div className="p-3">
                <div className="flex items-center mb-2">
                  <TrendingUp className="h-4 w-4 text-slate-400 mr-2" />
                  <span className="text-sm text-slate-400 font-medium">Suggestions</span>
                </div>
                {suggestions.slice(0, maxSuggestions).map((suggestion, index) => (
                  <button
                    key={suggestion.id}
                    onClick={() => onSuggestionSelect?.(suggestion)}
                    className={`
                      w-full text-left px-3 py-2 rounded-lg flex items-center justify-between
                      hover:bg-slate-700/50 transition-colors
                      ${focusedIndex === index ? 'bg-blue-500/20' : ''}
                    `}
                  >
                    <div>
                      <span className="text-slate-200">{suggestion.text}</span>
                      <span className="text-xs text-slate-400 ml-2 capitalize">
                        {suggestion.type.replace('_', ' ')}
                      </span>
                    </div>
                    {suggestion.count && (
                      <span className="text-xs text-slate-500">
                        {suggestion.count} results
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Results */}
            {results.length > 0 && (
              <div className="p-3 border-t border-slate-700/50">
                <div className="text-sm text-slate-400 font-medium mb-2">Results</div>
                {results.map((result, index) => (
                  <button
                    key={result.id}
                    onClick={() => onResultSelect?.(result)}
                    className={`
                      w-full text-left px-3 py-2 rounded-lg flex items-center justify-between
                      hover:bg-slate-700/50 transition-colors
                      ${focusedIndex === suggestions.length + index ? 'bg-blue-500/20' : ''}
                    `}
                  >
                    <div>
                      <div className="text-slate-200">{result.title}</div>
                      {result.subtitle && (
                        <div className="text-xs text-slate-400">{result.subtitle}</div>
                      )}
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-slate-500" />
                  </button>
                ))}
              </div>
            )}

            {/* Search Action */}
            {query.length > 0 && (
              <div className="p-3 border-t border-slate-700/50">
                <button
                  onClick={() => handleSearch()}
                  className={`
                    w-full text-left px-3 py-2 rounded-lg flex items-center
                    hover:bg-blue-500/20 transition-colors
                    ${focusedIndex === -1 ? 'bg-blue-500/20' : ''}
                  `}
                >
                  <Search className="h-4 w-4 text-blue-400 mr-3" />
                  <span className="text-slate-200">Search for "</span>
                  <span className="text-blue-400 font-medium">{query}</span>
                  <span className="text-slate-200">"</span>
                </button>
              </div>
            )}

            {/* Empty State */}
            {query.length > 0 && suggestions.length === 0 && results.length === 0 && !isLoading && (
              <div className="p-8 text-center">
                <Search className="h-8 w-8 text-slate-500 mx-auto mb-2" />
                <div className="text-slate-400">No suggestions found</div>
                <div className="text-xs text-slate-500 mt-1">Try a different search term</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Hook for search functionality
export function useSearch() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const search = async (searchTerm: string) => {
    setIsLoading(true);
    try {
      // Implement your search logic here
      // This is a placeholder for actual search implementation
      await new Promise(resolve => setTimeout(resolve, 500));

      // Search results - replace with actual search
      const mockResults: SearchResult[] = [
        {
          id: '1',
          title: searchTerm,
          subtitle: 'Search result',
          type: 'suggestion'
        }
      ];

      setResults(mockResults);
    } catch (error) {
      // Production: error logging removed
    } finally {
      setIsLoading(false);
    }
  };

  const getSuggestions = async (partial: string) => {
    if (partial.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      // Implement your suggestions logic here
      // This is a placeholder for actual suggestions
      const mockSuggestions: SearchSuggestion[] = [
        {
          id: '1',
          text: `${partial}...`,
          type: 'control_number',
          count: 5
        }
      ];

      setSuggestions(mockSuggestions);
    } catch (error) {
      // Production: error logging removed
    }
  };

  return {
    query,
    setQuery,
    suggestions,
    results,
    isLoading,
    search,
    getSuggestions
  };
}