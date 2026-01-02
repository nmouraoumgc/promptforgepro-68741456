import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
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
import NotFound from "./pages/NotFound";

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
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/purchase-success" element={<PurchaseSuccess />} />
            <Route path="/subscription-success" element={<SubscriptionSuccess />} />
            <Route path="/account" element={<Account />} />
            <Route path="/planos" element={<Plans />} />
            <Route path="/admin" element={<Admin />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
