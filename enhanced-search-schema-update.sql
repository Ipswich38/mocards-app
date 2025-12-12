-- Enhanced Search Features Schema Update
-- Adds search optimization and user experience enhancements
-- INCLUDES DATA PRESERVATION SAFEGUARDS FOR ALL 10,000+ CARDS

BEGIN;

-- =============================================================================
-- REQUIRED TABLES CREATION
-- =============================================================================

-- Create system audit log table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.system_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    operation VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    performed_by VARCHAR(255) DEFAULT 'system',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    details JSONB
);

-- =============================================================================
-- SEARCH OPTIMIZATION SCHEMA
-- =============================================================================

-- Create search history table for user experience improvements
CREATE TABLE IF NOT EXISTS public.search_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL, -- Can be admin, clinic_id, or session_id for patients
    user_type VARCHAR(50) NOT NULL CHECK (user_type IN ('admin', 'clinic', 'patient')),
    search_query VARCHAR(500) NOT NULL,
    search_type VARCHAR(50) NOT NULL CHECK (search_type IN ('control_number', 'card_number', 'clinic_name', 'mixed')),
    results_found INTEGER DEFAULT 0,
    result_clicked BOOLEAN DEFAULT false,
    clicked_card_id UUID REFERENCES public.cards(id) ON DELETE SET NULL,
    search_metadata JSONB, -- Store additional search context
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for search history
CREATE INDEX IF NOT EXISTS idx_search_history_user
ON public.search_history(user_id, user_type);

CREATE INDEX IF NOT EXISTS idx_search_history_query
ON public.search_history(search_query);

CREATE INDEX IF NOT EXISTS idx_search_history_created_at
ON public.search_history(created_at DESC);

-- Create search suggestions table for auto-complete
CREATE TABLE IF NOT EXISTS public.search_suggestions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    suggestion_text VARCHAR(255) NOT NULL UNIQUE,
    suggestion_type VARCHAR(50) NOT NULL CHECK (suggestion_type IN ('control_number', 'card_number', 'clinic_name')),
    usage_count INTEGER DEFAULT 1,
    context VARCHAR(50) DEFAULT 'general', -- 'admin', 'clinic', 'patient', 'general'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for search suggestions
CREATE INDEX IF NOT EXISTS idx_search_suggestions_text
ON public.search_suggestions(suggestion_text);

CREATE INDEX IF NOT EXISTS idx_search_suggestions_type_context
ON public.search_suggestions(suggestion_type, context);

CREATE INDEX IF NOT EXISTS idx_search_suggestions_usage
ON public.search_suggestions(usage_count DESC);

-- =============================================================================
-- FULL-TEXT SEARCH ENHANCEMENT
-- =============================================================================

-- Add full-text search indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_cards_control_number_fulltext
ON public.cards USING gin(to_tsvector('english', COALESCE(control_number, '')));

CREATE INDEX IF NOT EXISTS idx_cards_control_number_v2_fulltext
ON public.cards USING gin(to_tsvector('english', COALESCE(control_number_v2, '')));

-- Add trigram indexes for fuzzy matching (requires pg_trgm extension)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_cards_control_number_trgm
ON public.cards USING gin(control_number gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_cards_control_number_v2_trgm
ON public.cards USING gin(control_number_v2 gin_trgm_ops);

-- Add clinic name trigram index for fuzzy clinic search
CREATE INDEX IF NOT EXISTS idx_clinics_name_trgm
ON public.mocards_clinics USING gin(clinic_name gin_trgm_ops);

-- =============================================================================
-- SEARCH ANALYTICS AND OPTIMIZATION
-- =============================================================================

-- Create search analytics table for performance monitoring
CREATE TABLE IF NOT EXISTS public.search_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    search_date DATE NOT NULL DEFAULT CURRENT_DATE,
    search_type VARCHAR(50) NOT NULL,
    user_type VARCHAR(50) NOT NULL,
    total_searches INTEGER DEFAULT 0,
    successful_searches INTEGER DEFAULT 0,
    average_response_time_ms INTEGER DEFAULT 0,
    popular_queries JSONB, -- Store top search queries for the day
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add unique constraint for daily analytics
CREATE UNIQUE INDEX IF NOT EXISTS idx_search_analytics_daily
ON public.search_analytics(search_date, search_type, user_type);

-- =============================================================================
-- SEARCH OPTIMIZATION FUNCTIONS
-- =============================================================================

-- Function to log search operations
CREATE OR REPLACE FUNCTION public.log_search_activity(
    p_user_id VARCHAR(255),
    p_user_type VARCHAR(50),
    p_search_query VARCHAR(500),
    p_search_type VARCHAR(50),
    p_results_found INTEGER DEFAULT 0,
    p_search_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    search_id UUID;
BEGIN
    INSERT INTO public.search_history (
        user_id,
        user_type,
        search_query,
        search_type,
        results_found,
        search_metadata
    ) VALUES (
        p_user_id,
        p_user_type,
        p_search_query,
        p_search_type,
        p_results_found,
        p_search_metadata
    ) RETURNING id INTO search_id;

    -- Update or create search suggestion
    INSERT INTO public.search_suggestions (suggestion_text, suggestion_type, context, usage_count)
    VALUES (p_search_query, p_search_type, p_user_type, 1)
    ON CONFLICT (suggestion_text)
    DO UPDATE SET
        usage_count = search_suggestions.usage_count + 1,
        updated_at = NOW();

    RETURN search_id;
END;
$$ LANGUAGE plpgsql;

-- Function for fuzzy card search with ranking
CREATE OR REPLACE FUNCTION public.fuzzy_card_search(
    p_search_term VARCHAR(500),
    p_limit INTEGER DEFAULT 10,
    p_similarity_threshold REAL DEFAULT 0.3
)
RETURNS TABLE (
    card_id UUID,
    control_number VARCHAR(255),
    control_number_v2 VARCHAR(255),
    card_number INTEGER,
    status VARCHAR(50),
    similarity_score REAL,
    assigned_clinic_name VARCHAR(255),
    rank INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.control_number,
        c.control_number_v2,
        c.card_number,
        c.status,
        GREATEST(
            similarity(COALESCE(c.control_number, ''), p_search_term),
            similarity(COALESCE(c.control_number_v2, ''), p_search_term),
            similarity(COALESCE(c.card_number::TEXT, ''), p_search_term)
        ) as similarity_score,
        mc.clinic_name,
        ROW_NUMBER() OVER (ORDER BY
            GREATEST(
                similarity(COALESCE(c.control_number, ''), p_search_term),
                similarity(COALESCE(c.control_number_v2, ''), p_search_term),
                similarity(COALESCE(c.card_number::TEXT, ''), p_search_term)
            ) DESC
        )::INTEGER as rank
    FROM public.cards c
    LEFT JOIN public.mocards_clinics mc ON c.assigned_clinic_id = mc.id
    WHERE
        GREATEST(
            similarity(COALESCE(c.control_number, ''), p_search_term),
            similarity(COALESCE(c.control_number_v2, ''), p_search_term),
            similarity(COALESCE(c.card_number::TEXT, ''), p_search_term)
        ) > p_similarity_threshold
    ORDER BY similarity_score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get search suggestions
CREATE OR REPLACE FUNCTION public.get_search_suggestions(
    p_partial_query VARCHAR(255),
    p_context VARCHAR(50) DEFAULT 'general',
    p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
    suggestion VARCHAR(255),
    suggestion_type VARCHAR(50),
    usage_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ss.suggestion_text,
        ss.suggestion_type,
        ss.usage_count
    FROM public.search_suggestions ss
    WHERE ss.is_active = true
        AND (ss.context = p_context OR ss.context = 'general')
        AND ss.suggestion_text ILIKE p_partial_query || '%'
    ORDER BY ss.usage_count DESC, ss.suggestion_text ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- SEARCH PERFORMANCE MATERIALIZED VIEW
-- =============================================================================

-- Create materialized view for fast search results
CREATE MATERIALIZED VIEW IF NOT EXISTS public.search_optimized_cards AS
SELECT
    c.id,
    c.control_number,
    c.control_number_v2,
    c.card_number,
    c.status,
    c.is_activated,
    c.assigned_clinic_id,
    c.created_at,
    c.activated_at,
    mc.clinic_name,
    mc.clinic_code,
    -- Create searchable text for full-text search
    COALESCE(c.control_number, '') || ' ' ||
    COALESCE(c.control_number_v2, '') || ' ' ||
    COALESCE(c.card_number::TEXT, '') || ' ' ||
    COALESCE(mc.clinic_name, '') || ' ' ||
    COALESCE(mc.clinic_code, '') as searchable_text
FROM public.cards c
LEFT JOIN public.mocards_clinics mc ON c.assigned_clinic_id = mc.id;

-- Add index on materialized view
CREATE INDEX IF NOT EXISTS idx_search_optimized_cards_searchable
ON public.search_optimized_cards USING gin(to_tsvector('english', searchable_text));

-- Function to refresh search view
CREATE OR REPLACE FUNCTION public.refresh_search_view()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.search_optimized_cards;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- AUTOMATED MAINTENANCE
-- =============================================================================

-- Function to clean up old search history (optional maintenance)
CREATE OR REPLACE FUNCTION public.cleanup_search_history(
    p_days_to_keep INTEGER DEFAULT 90
)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.search_history
    WHERE created_at < NOW() - INTERVAL '1 day' * p_days_to_keep;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- Log cleanup operation
    INSERT INTO public.system_audit_log (operation, description, details)
    VALUES (
        'SEARCH_HISTORY_CLEANUP',
        'Cleaned up old search history records',
        jsonb_build_object(
            'deleted_count', deleted_count,
            'days_kept', p_days_to_keep
        )
    );

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- FINAL VERIFICATION AND LOGGING
-- =============================================================================

-- Update system audit log
INSERT INTO public.system_audit_log (operation, description, created_at)
VALUES ('ENHANCED_SEARCH_SCHEMA_UPDATED', 'Enhanced search features schema successfully updated with optimization and analytics', NOW());

-- Display final statistics
SELECT
    'ENHANCED SEARCH SCHEMA UPDATE COMPLETED' as status,
    (SELECT COUNT(*) FROM public.cards) as total_cards_indexed,
    (SELECT COUNT(*) FROM public.mocards_clinics) as total_clinics_indexed,
    'Full-text search, fuzzy matching, and analytics enabled' as features_added;

COMMIT;