// Old routes from the 9-item menu keep working: they redirect to the new screens and forward
// query strings and navigation state (e.g. lesson "Experimenta já" -> Optimizer prefill).
import { Navigate, useLocation } from 'react-router-dom';
import { usePromptStore } from '@/stores/promptStore';
import { useLibraryLoading } from '@/components/library/useLibraryLoading';

export function RedirectToCreate({ mode }: { mode: 'quick' | 'guided' | 'optimize' }) {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  params.set('mode', mode);
  return <Navigate to={{ pathname: '/create', search: `?${params.toString()}` }} state={location.state} replace />;
}

/** /tester and /versions: open the most recent library prompt on that tab, or the library with a hint. */
export function RedirectToPromptTab({ tab }: { tab: 'test' | 'versions' }) {
  const location = useLocation();
  const prompts = usePromptStore((s) => s.prompts);
  const activeId = usePromptStore((s) => s.activePromptId);
  const target = prompts.find((p) => p.id === activeId)
    ?? [...prompts].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
  const loading = useLibraryLoading();
  if (!target && loading) return null;
  if (!target) return <Navigate to={{ pathname: '/library', search: `?hint=${tab}` }} state={location.state} replace />;
  return <Navigate to={{ pathname: `/library/${target.id}`, search: `?tab=${tab}` }} state={location.state} replace />;
}
