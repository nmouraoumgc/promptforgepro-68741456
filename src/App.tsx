import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { PromoCodeDialog } from '@/components/promo/PromoCodeDialog';
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout";
import { RedirectToCreate, RedirectToPromptTab } from "@/components/layout/LegacyRedirects";
import { RouteMeta } from '@/lib/pageMeta';
import { lazy, Suspense } from 'react';
import Home from "@/pages/Home";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ThemeSync } from "@/components/layout/ThemeSync";
import PaddleRetain from "@/components/PaddleRetain";

// Route-level code splitting: only the landing page (and the shell) ship in the main bundle.
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const PromptLibrary = lazy(() => import("@/pages/PromptLibrary"));
const PromptDetail = lazy(() => import("@/pages/PromptDetail"));
const Create = lazy(() => import("@/pages/Create"));
const BrandKit = lazy(() => import("@/pages/BrandKit"));
const Learn = lazy(() => import("@/pages/Learn"));
const LessonDetail = lazy(() => import("@/pages/LessonDetail"));
const PromptPacks = lazy(() => import("@/pages/PromptPacks"));
const PackDetail = lazy(() => import("@/pages/PackDetail"));
const Settings = lazy(() => import("@/pages/Settings"));
const Pricing = lazy(() => import("@/pages/Pricing"));
const Checkout = lazy(() => import("@/pages/Checkout"));
const PurchaseSuccess = lazy(() => import("@/pages/PurchaseSuccess"));
const SubscriptionSuccess = lazy(() => import("@/pages/SubscriptionSuccess"));
const Login = lazy(() => import("@/pages/Login"));
const Signup = lazy(() => import("@/pages/Signup"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const Account = lazy(() => import("@/pages/Account"));
const Admin = lazy(() => import("@/pages/Admin"));
const Terms = lazy(() => import("@/pages/legal/Terms"));
const Refunds = lazy(() => import("@/pages/legal/Refunds"));
const Privacy = lazy(() => import("@/pages/legal/Privacy"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Unsubscribe = lazy(() => import("@/pages/Unsubscribe"));

const RouteFallback = () => <div className="min-h-[50vh]" aria-busy="true" />;

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <RouteMeta />
        <ThemeSync />
        <PaddleRetain />
        <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Auth routes (no layout) */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Public legal pages (no auth required) */}
          <Route path="/terms" element={<Terms />} />
          <Route path="/refunds" element={<Refunds />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/unsubscribe" element={<Unsubscribe />} />

          {/* Public landing (signed-in users are redirected to /app) */}
          <Route path="/" element={<Home />} />
          <Route path="/planos" element={<Navigate to="/pricing" replace />} />
          
          {/* Public page inside the app shell: logged-out visitors can see prices; checkout CTAs send them to login/signup */}
          <Route element={<AppLayout />}>
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/learn" element={<Learn />} />
            <Route path="/learn/:slug" element={<LessonDetail />} />
          </Route>

          {/* App routes: every screen in the app layout requires sign-in (redirects to /login?redirect=<path>) */}
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/app" element={<Dashboard />} />
            <Route path="/create" element={<Create />} />
            <Route path="/library" element={<PromptLibrary />} />
            <Route path="/library/:id" element={<PromptDetail />} />
            <Route path="/brand" element={<BrandKit />} />
            {/* Legacy routes (old 9-item menu) -> new screens */}
            <Route path="/builder" element={<RedirectToCreate mode="guided" />} />
            <Route path="/quick" element={<RedirectToCreate mode="quick" />} />
            <Route path="/optimizer" element={<RedirectToCreate mode="optimize" />} />
            <Route path="/versions" element={<RedirectToPromptTab tab="versions" />} />
            <Route path="/tester" element={<RedirectToPromptTab tab="test" />} />

            <Route path="/packs" element={<PromptPacks />} />
            <Route path="/packs/:slug" element={<PackDetail />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/purchase-success" element={<PurchaseSuccess />} />
            <Route path="/subscription-success" element={<SubscriptionSuccess />} />
            <Route path="/account" element={<Account />} />
            <Route path="/admin" element={<ProtectedRoute requireAdmin><Admin /></ProtectedRoute>} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
