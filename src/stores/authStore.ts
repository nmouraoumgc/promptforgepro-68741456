import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { PlanType } from '@/types/plans';

interface Profile {
  id: string;
  email: string;
  current_plan: PlanType;
}

interface AuthStore {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  isLoading: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setIsAdmin: (isAdmin: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  
  // Auth methods
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  
  // Data methods
  fetchProfile: () => Promise<void>;
  checkAdminRole: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  isAdmin: false,
  isLoading: true,
  
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setIsAdmin: (isAdmin) => set({ isAdmin }),
  setIsLoading: (isLoading) => set({ isLoading }),
  
  signUp: async (email, password) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { error: error as Error | null };
  },
  
  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  },
  
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, profile: null, isAdmin: false });
  },
  
  fetchProfile: async () => {
    const { user } = get();
    if (!user) return;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (!error && data) {
      set({ profile: data as Profile });
    }
  },
  
  checkAdminRole: async () => {
    const { user } = get();
    if (!user) {
      set({ isAdmin: false });
      return;
    }
    
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();
    
    set({ isAdmin: !error && data !== null });
  },
}));

// Initialize auth listener
supabase.auth.onAuthStateChange(async (event, session) => {
  const store = useAuthStore.getState();
  
  store.setSession(session);
  store.setUser(session?.user ?? null);
  
  if (session?.user) {
    await store.fetchProfile();
    await store.checkAdminRole();
  } else {
    store.setProfile(null);
    store.setIsAdmin(false);
  }
  
  store.setIsLoading(false);
});

// Check initial session
supabase.auth.getSession().then(({ data: { session } }) => {
  const store = useAuthStore.getState();
  store.setSession(session);
  store.setUser(session?.user ?? null);
  
  if (session?.user) {
    store.fetchProfile();
    store.checkAdminRole();
  }
  
  store.setIsLoading(false);
});
