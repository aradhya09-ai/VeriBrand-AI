import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import AppShell from "./components/AppShell";
import { useApp } from "./lib/store";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Overview from "./pages/Overview";
import BrandStudio from "./pages/brand/BrandStudio";
import NewAudit from "./pages/NewAudit";
import AuditHistory from "./pages/AuditHistory";
import AuditResults from "./pages/AuditResults";
import TruthTrace from "./pages/TruthTrace";
import RewriteStudio from "./pages/RewriteStudio";
import Approvals from "./pages/Approvals";
import BrandPulse from "./pages/BrandPulse";
import VisualGuard from "./pages/VisualGuard";
import Campaigns from "./pages/Campaigns";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import InfoPage from "./pages/Info";

function RequireAuth({ children }: { children: ReactNode }) {
  const { state } = useApp();
  const location = useLocation();
  if (!state.session) {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  }
  if (!state.onboarded && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/signin" element={<Auth />} />
      <Route path="/signup" element={<Auth />} />
      <Route path="/forgot-password" element={<Auth />} />
      <Route path="/docs" element={<InfoPage page="docs" />} />
      <Route path="/help" element={<InfoPage page="help" />} />
      <Route path="/security" element={<InfoPage page="security" />} />
      <Route path="/privacy" element={<InfoPage page="privacy" />} />
      <Route path="/terms" element={<InfoPage page="terms" />} />

      <Route
        path="/onboarding"
        element={
          <RequireAuth>
            <Onboarding />
          </RequireAuth>
        }
      />

      <Route
        path="/app"
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<Overview />} />
        <Route path="brand" element={<BrandStudio />} />
        <Route path="audit/new" element={<NewAudit />} />
        <Route path="audits" element={<AuditHistory />} />
        <Route path="audits/:id" element={<AuditResults />} />
        <Route path="truthtrace" element={<TruthTrace />} />
        <Route path="rewrite" element={<RewriteStudio />} />
        <Route path="approvals" element={<Approvals />} />
        <Route path="approvals/:id" element={<Approvals />} />
        <Route path="pulse" element={<BrandPulse />} />
        <Route path="visual" element={<VisualGuard />} />
        <Route path="campaigns" element={<Campaigns />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
