import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { PromoCodeDialog } from '@/components/promo/PromoCodeDialog';
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout";
import Dashboard from "@/pages/Dashboard";
import PromptLibrary from "@/pages/PromptLibrary";
import PromptDetail from "@/pages/PromptDetail";
import Create from "@/pages/Create";
import BrandKit from "@/pages/BrandKit";
import { RedirectToCreate, RedirectToPromptTab } from "@/components/layout/LegacyRedirects";
import Learn from "@/pages/Learn";
import LessonDetail from "@/pages/LessonDetail";
import { RouteMeta } from '@/lib/pageMeta';
import PromptPacks from "@/pages/PromptPacks";
import PackDetail from "@/pages/PackDetail";
import Settings from "@/pages/Settings";
import Pricing from "@/pages/Pricing";
import Checkout from "@/pages/Checkout";
import PurchaseSuccess from "@/pages/PurchaseSuccess";
import SubscriptionSuccess from "@/pages/SubscriptionSuccess";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Account from "@/pages/Account";
import Plans from "@/pages/Plans";
import Admin from "@/pages/Admin";
import Terms from "@/pages/legal/Terms";
import Refunds from "@/pages/legal/Refunds";
import Privacy from "@/pages/legal/Privacy";
import NotFound from "./pages/NotFound";
import Unsubscribe from '@/pages/Unsubscribe';
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <RouteMeta />
        <Routes>
          {/* Auth routes (no layout) */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Public legal pages (no auth required) */}
          <Route path="/terms" element={<Terms />} />
          <Route path="/refunds" element={<Refunds />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/unsubscribe" element={<Unsubscribe />} />
          
          {/* App routes */}
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
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
            <Route path="/learn" element={<Learn />} />
            <Route path="/learn/:slug" element={<LessonDetail />} />
            <Route path="/packs" element={<PromptPacks />} />
            <Route path="/packs/:slug" element={<PackDetail />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
            <Route path="/purchase-success" element={<ProtectedRoute><PurchaseSuccess /></ProtectedRoute>} />
            <Route path="/subscription-success" element={<ProtectedRoute><SubscriptionSuccess /></ProtectedRoute>} />
            <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
            <Route path="/planos" element={<ProtectedRoute><Plans /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute requireAdmin><Admin /></ProtectedRoute>} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
