import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { PlanType } from '@/types/plans';
import { identifyUser, resetAnalytics, setUserPlan } from '@/lib/analytics';

interface Profile {
  id: string;
  email: string;
  current_plan: PlanType;
  display_name?: string | null;
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
  signUp: (email: string, password: string) => Promise<{ error: Error | null; needsConfirmation: boolean; alreadyRegistered: boolean }>;
  requestPasswordReset: (email: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; emailNotConfirmed: boolean }>;
  resendConfirmation: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  
  // Data methods
  fetchProfile: () => Promise<void>;
  checkAdminRole: () => Promise<void>;
}

// Where the confirmation link lands. /login detects the session from the URL hash and forwards the user in.
// Captured at module load, before supabase-js consumes/clears the URL hash, so /login can show
// a friendly message when a confirmation link is expired or invalid (#error_code=otp_expired ...).
export const initialAuthUrlError: { code: string; description: string } | null = (() => {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.hash.replace(/^#/, '') || window.location.search);
  const err = params.get('error_code') || params.get('error');
  return err ? { code: err, description: params.get('error_description') || '' } : null;
})();

export const emailConfirmRedirect = () => `${window.location.origin}/login?confirmed=1`;
export const PASSWORD_RESET_REDIRECT = 'https://promptforgepro.me/reset-password';
export const RECOVERY_FLAG = 'pfp_password_recovery';
// Captured at module load too: a recovery link lands with #...&type=recovery before supabase-js clears it.
if (typeof window !== 'undefined' && /(^|[#&?])type=recovery(&|$)/.test(window.location.hash || window.location.search)) {
  try { sessionStorage.setItem(RECOVERY_FLAG, '1'); } catch { /* ignore */ }
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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: emailConfirmRedirect() },
    });
    // With "Confirm email" enabled, signUp returns a user but no session until the link is clicked.
    // For an already-registered email Supabase returns an obfuscated user with an empty `identities`
    // array, no session, and sends no mail: report it so the UI doesn't claim a link was sent.
    const alreadyRegistered = !error && !!data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0;
    return { error: error as Error | null, needsConfirmation: !error && !alreadyRegistered && !data.session, alreadyRegistered };
  },

  requestPasswordReset: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: PASSWORD_RESET_REDIRECT });
    return { error: error as Error | null };
  },
  
  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    const code = (error as { code?: string } | null)?.code;
    const emailNotConfirmed = !!error && (code === 'email_not_confirmed' || /email not confirmed/i.test(error.message || ''));
    return { error: error as Error | null, emailNotConfirmed };
  },

  resendConfirmation: async (email) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: emailConfirmRedirect() },
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
      setUserPlan((data as Profile).current_plan);
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

// Initialize auth listener - avoid async deadlock
supabase.auth.onAuthStateChange((event, session) => {
  const store = useAuthStore.getState();

  // Mark as loading while we resolve profile + roles
  store.setIsLoading(true);

  // Synchronous updates first
  store.setSession(session);
  store.setUser(session?.user ?? null);

  if (session?.user) identifyUser(session.user.id);
  else if (event === 'SIGNED_OUT') resetAnalytics();

  // Recovery link landed anywhere (e.g. Site URL fallback): send the user to set a new password.
  if (event === 'PASSWORD_RECOVERY') {
    try { sessionStorage.setItem(RECOVERY_FLAG, '1'); } catch { /* ignore */ }
    if (window.location.pathname !== '/reset-password') window.location.replace('/reset-password');
  }

  // Defer async operations with setTimeout to prevent deadlock
  if (session?.user) {
    setTimeout(async () => {
      try {
        await Promise.all([store.fetchProfile(), store.checkAdminRole()]);
      } finally {
        store.setIsLoading(false);
      }
    }, 0);
  } else {
    store.setProfile(null);
    store.setIsAdmin(false);
    store.setIsLoading(false);
  }
});

// Check initial session
supabase.auth.getSession().then(async ({ data: { session } }) => {
  const store = useAuthStore.getState();

  store.setIsLoading(true);
  store.setSession(session);
  store.setUser(session?.user ?? null);
  if (session?.user) identifyUser(session.user.id);

  try {
    if (session?.user) {
      await Promise.all([store.fetchProfile(), store.checkAdminRole()]);
    } else {
      store.setProfile(null);
      store.setIsAdmin(false);
    }
  } finally {
    store.setIsLoading(false);
  }
});
