import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useIsEnglish } from '@/i18n/lang';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ 
  children, 
  requireAuth = true,
  requireAdmin = false 
}: ProtectedRouteProps) {
  const { user, isAdmin, isLoading } = useAuthStore();
  const isEnglish = useIsEnglish();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">{isEnglish ? 'Loading...' : 'A carregar...'}</div>
      </div>
    );
  }

  if (requireAuth && !user) {
    // Keep the intended path so login/signup can send the user back (postAuthPath still prefers /pricing
    // when a campaign code is stored and the target is just the dashboard).
    const target = location.pathname + location.search;
    return <Navigate to={`/login?redirect=${encodeURIComponent(target)}`} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}
