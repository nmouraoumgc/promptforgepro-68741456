import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { PromoCodeDialog } from '@/components/promo/PromoCodeDialog';
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout";
import Dashboard from "@/pages/Dashboard";
import GuidedBuilder from "@/pages/GuidedBuilder";
import PromptLibrary from "@/pages/PromptLibrary";
import PromptOptimizer from "@/pages/PromptOptimizer";
import VersionHistory from "@/pages/VersionHistory";
import PromptTester from "@/pages/PromptTester";
import QuickPrompt from "@/pages/QuickPrompt";
import Learn from "@/pages/Learn";
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
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Auth routes (no layout) */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Public legal pages (no auth required) */}
          <Route path="/terms" element={<Terms />} />
          <Route path="/refunds" element={<Refunds />} />
          <Route path="/privacy" element={<Privacy />} />
          
          {/* App routes */}
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/builder" element={<GuidedBuilder />} />
            <Route path="/quick" element={<QuickPrompt />} />
            <Route path="/library" element={<PromptLibrary />} />
            <Route path="/optimizer" element={<PromptOptimizer />} />
            <Route path="/versions" element={<VersionHistory />} />
            <Route path="/tester" element={<PromptTester />} />
            <Route path="/learn" element={<Learn />} />
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
