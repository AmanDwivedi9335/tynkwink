import { Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import TenantDashboard from "./pages/TenantDashboard";
import SuperAdminLayout from "./layouts/SuperAdminLayout";
import SuperAdminDashboard from "./pages/superadmin/SuperAdminDashboard";
import TenantsPage from "./pages/superadmin/TenantsPage";

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
      <Route path="/app" element={<TenantDashboard />} />

      <Route path="/superamanpanel" element={<SuperAdminLayout />}>
        <Route index element={<SuperAdminDashboard />} />
        <Route path="tenants" element={<TenantsPage />} />
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
