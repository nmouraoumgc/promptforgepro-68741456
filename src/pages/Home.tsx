// "/" entry: signed-in users go to the app dashboard (/app); everyone else sees the public landing page.
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import Landing from '@/pages/Landing';

/** True when supabase-js has a persisted session, so we can avoid flashing the landing page for members. */
function hasStoredSession(): boolean {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) || '';
      if (k.startsWith('sb-') && k.endsWith('-auth-token')) return true;
    }
  } catch { /* ignore */ }
  return false;
}

export default function Home() {
  const { user, isLoading } = useAuthStore();
  if (user) return <Navigate to="/app" replace />;
  if (isLoading && hasStoredSession()) {
    return <div className="min-h-screen bg-background" aria-busy="true" />;
  }
  return <Landing />;
}
