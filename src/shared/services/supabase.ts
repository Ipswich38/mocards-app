// Shared Supabase Client
// Centralized Supabase configuration with enterprise features

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create Supabase client with enterprise configurations
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce' // Enhanced security
  },
  realtime: {
    params: {
      eventsPerSecond: 10 // Rate limiting for real-time updates
    }
  },
  global: {
    headers: {
      'X-Application-Name': 'MOCARDS-Enterprise'
    }
  }
});

// Database type definitions for better TypeScript support
export interface Database {
  auth_mgmt: {
    user_profiles: {
      Row: {
        id: string;
        email: string;
        full_name: string | null;
        role: string;
        clinic_id: string | null;
        is_active: boolean;
        last_login: string | null;
        failed_login_attempts: number;
        locked_until: string | null;
        password_changed_at: string;
        created_at: string;
        updated_at: string;
        metadata: Record<string, any>;
      };
      Insert: {
        id?: string;
        email: string;
        full_name?: string | null;
        role?: string;
        clinic_id?: string | null;
        is_active?: boolean;
        last_login?: string | null;
        failed_login_attempts?: number;
        locked_until?: string | null;
        password_changed_at?: string;
        created_at?: string;
        updated_at?: string;
        metadata?: Record<string, any>;
      };
      Update: {
        id?: string;
        email?: string;
        full_name?: string | null;
        role?: string;
        clinic_id?: string | null;
        is_active?: boolean;
        last_login?: string | null;
        failed_login_attempts?: number;
        locked_until?: string | null;
        password_changed_at?: string;
        created_at?: string;
        updated_at?: string;
        metadata?: Record<string, any>;
      };
    };
    user_sessions: {
      Row: {
        id: string;
        user_id: string;
        session_token: string;
        ip_address: string | null;
        user_agent: string | null;
        is_active: boolean;
        expires_at: string;
        created_at: string;
        last_activity: string;
      };
    };
    security_events: {
      Row: {
        id: string;
        user_id: string;
        event_type: string;
        ip_address: string | null;
        user_agent: string | null;
        details: Record<string, any>;
        created_at: string;
      };
      Insert: {
        id?: string;
        user_id?: string;
        event_type: string;
        ip_address?: string | null;
        user_agent?: string | null;
        details?: Record<string, any>;
        created_at?: string;
      };
    };
  };
  clinics: {
    clinics: {
      Row: {
        id: string;
        name: string;
        code: string;
        email: string;
        contact_number: string;
        address: string;
        region: string;
        plan_id: string | null;
        password_hash: string;
        is_active: boolean;
        subscription_status: string;
        subscription_expires: string | null;
        tenant_id: string;
        created_at: string;
        updated_at: string;
        metadata: Record<string, any>;
      };
    };
  };
  cards: {
    cards: {
      Row: {
        id: string;
        control_number: string;
        full_name: string;
        birth_date: string;
        address: string;
        contact_number: string;
        emergency_contact: string;
        clinic_id: string | null;
        category_id: string | null;
        status: string;
        perks_total: number;
        perks_used: number;
        issue_date: string;
        expiry_date: string;
        qr_code_data: string | null;
        tenant_id: string | null;
        created_at: string;
        updated_at: string;
        metadata: Record<string, any>;
      };
    };
  };
}

// Enhanced error handling
export class SupabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'SupabaseError';
  }
}

// Utility functions for common operations
export const supabaseUtils = {
  // Handle Supabase responses with proper error handling
  handleResponse: <T>(response: { data: T | null; error: any }) => {
    if (response.error) {
      throw new SupabaseError(
        response.error.message || 'Database operation failed',
        response.error.code,
        response.error.details
      );
    }
    return response.data;
  },

  // Batch insert with error handling
  batchInsert: async <T>(
    table: string,
    data: T[],
    options?: { chunk_size?: number }
  ) => {
    const chunkSize = options?.chunk_size || 100;
    const results = [];

    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      const response = await supabase
        .from(table)
        .insert(chunk)
        .select();

      results.push(supabaseUtils.handleResponse(response));
    }

    return results.flat();
  },

  // Safe upsert operation
  safeUpsert: async <T>(
    table: string,
    data: T,
    conflictColumns: string[]
  ) => {
    const response = await supabase
      .from(table)
      .upsert(data, {
        onConflict: conflictColumns.join(',')
      })
      .select();

    return supabaseUtils.handleResponse(response);
  },

  // Paginated query
  paginatedQuery: async (
    table: string,
    page: number = 1,
    limit: number = 20,
    filters?: Record<string, any>
  ) => {
    let query = supabase
      .from(table)
      .select('*', { count: 'exact' });

    // Apply filters
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }

    const offset = (page - 1) * limit;
    const response = await query
      .range(offset, offset + limit - 1);

    const data = supabaseUtils.handleResponse(response);

    return {
      data,
      count: response.count || 0,
      page,
      limit,
      totalPages: Math.ceil((response.count || 0) / limit)
    };
  }
};

// Connection health check
export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('auth_mgmt.user_profiles').select('count').limit(1);
    return !error;
  } catch {
    return false;
  }
};

// Real-time subscription helper
export const createRealtimeSubscription = (
  table: string,
  callback: (payload: any) => void,
  filter?: string
) => {
  let channel = supabase
    .channel(`public:${table}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table,
        ...(filter && { filter })
      },
      callback
    );

  return {
    subscribe: () => channel.subscribe(),
    unsubscribe: () => supabase.removeChannel(channel)
  };
};

export default supabase;