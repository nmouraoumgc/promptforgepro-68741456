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
import Learn from "@/pages/Learn";
import PromptPacks from "@/pages/PromptPacks";
import Settings from "@/pages/Settings";
import Pricing from "@/pages/Pricing";
import TikTokPack from "@/pages/TikTokPack";
import Checkout from "@/pages/Checkout";
import PurchaseSuccess from "@/pages/PurchaseSuccess";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/builder" element={<GuidedBuilder />} />
            <Route path="/library" element={<PromptLibrary />} />
            <Route path="/optimizer" element={<PromptOptimizer />} />
            <Route path="/versions" element={<VersionHistory />} />
            <Route path="/tester" element={<PromptTester />} />
            <Route path="/learn" element={<Learn />} />
            <Route path="/packs" element={<PromptPacks />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/packs/tiktok" element={<TikTokPack />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/purchase-success" element={<PurchaseSuccess />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
