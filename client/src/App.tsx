import { Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import TenantDashboard from "./pages/TenantDashboard";
import SuperAdminLayout from "./layouts/SuperAdminLayout";
import SuperAdminDashboard from "./pages/superadmin/SuperAdminDashboard";
import TenantsPage from "./pages/superadmin/TenantsPage";
import TenantLayout from "./layouts/TenantLayout";
import CrmPage from "./pages/tenant/CrmPage";
import AutoFollowupsPage from "./pages/tenant/AutoFollowupsPage";
import KnowledgeBasePage from "./pages/tenant/KnowledgeBasePage";
import SmartTriggersFlowPage from "./pages/tenant/smart-triggers/SmartTriggersFlowPage";
import SmartTriggersListPage from "./pages/tenant/smart-triggers/SmartTriggersListPage";
import AnalyticsPage from "./pages/tenant/AnalyticsPage";
import WhatsAppPage from "./pages/tenant/WhatsAppPage";
import IntegrationsPage from "./pages/tenant/IntegrationsPage";
import GmailSettingsPage from "./pages/tenant/GmailSettingsPage";
import ApprovalSettingsPage from "./pages/tenant/ApprovalSettingsPage";
import LeadInboxPage from "./pages/tenant/LeadInboxPage";
import TenantAccessGuidePage from "./pages/tenant/TenantAccessGuidePage";
import StaffPage from "./pages/tenant/StaffPage";
import ProfileSettingsPage from "./pages/ProfileSettingsPage";
import SmtpSettingsPage from "./pages/tenant/SmtpSettingsPage";

// Temporary home/dashboard page
function HomePage() {
  return (
    <div className="flex h-screen items-center justify-center">
      <h1 className="text-2xl font-semibold">Home / Dashboard</h1>
    </div>
  );
}

function App() {
  return (
    <Routes>
      {/* Home route */}
      <Route path="/" element={<HomePage />} />

      {/* Login route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Tenant app routes */}
      <Route path="/app" element={<TenantLayout />}>
        <Route index element={<TenantDashboard />} />
        <Route path="crm" element={<CrmPage />} />
        <Route path="auto-followups" element={<AutoFollowupsPage />} />
        <Route path="knowledge-base" element={<KnowledgeBasePage />} />
        <Route path="smart-triggers" element={<SmartTriggersListPage />} />
        <Route path="smart-triggers/:flowId" element={<SmartTriggersFlowPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="whatsapp" element={<WhatsAppPage />} />
        <Route path="integrations" element={<IntegrationsPage />} />
        <Route path="lead-inbox" element={<LeadInboxPage />} />
        <Route path="settings/gmail" element={<GmailSettingsPage />} />
        <Route path="settings/smtp" element={<SmtpSettingsPage />} />
        <Route path="settings/approvals" element={<ApprovalSettingsPage />} />
        <Route path="staff" element={<StaffPage />} />
        <Route path="access-guide" element={<TenantAccessGuidePage />} />
        <Route path="profile" element={<ProfileSettingsPage />} />
      </Route>

      <Route path="/superamanpanel" element={<SuperAdminLayout />}>
        <Route index element={<SuperAdminDashboard />} />
        <Route path="tenants" element={<TenantsPage />} />
        <Route path="profile" element={<ProfileSettingsPage />} />
      </Route>

      {/* Fallback for unknown routes */}
      <Route
        path="*"
        element={
          <div className="flex h-screen items-center justify-center">
            <p className="text-lg text-gray-600">404 – Page not found</p>
          </div>
        }
      />
    </Routes>
  );
}

export default App;
