import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './guards/ProtectedRoute';
import { AdminRoute } from './guards/AdminRoute';
import { Navbar } from './components/layout/Navbar';

import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { TwoFactorPage } from './pages/auth/TwoFactorPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { BondsCatalogPage } from './pages/bonds/BondsCatalogPage';
import { BondPurchasePage } from './pages/bonds/BondPurchasePage';
import { MyBondsPage } from './pages/bonds/MyBondsPage';
import { ReferralsPage } from './pages/referrals/ReferralsPage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminBondsPage } from './pages/admin/AdminBondsPage';
import { AdminTransactionsPage } from './pages/admin/AdminTransactionsPage';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-2fa" element={<TwoFactorPage />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Navbar />
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/bonds"
        element={
          <ProtectedRoute>
            <Navbar />
            <BondsCatalogPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/bonds/purchase/:bondType"
        element={
          <ProtectedRoute>
            <Navbar />
            <BondPurchasePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/my-bonds"
        element={
          <ProtectedRoute>
            <Navbar />
            <MyBondsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/referrals"
        element={
          <ProtectedRoute>
            <Navbar />
            <ReferralsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Navbar />
            <ProfilePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <AdminRoute>
            <Navbar />
            <AdminDashboardPage />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/users"
        element={
          <AdminRoute>
            <Navbar />
            <AdminUsersPage />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/bonds"
        element={
          <AdminRoute>
            <Navbar />
            <AdminBondsPage />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/transactions"
        element={
          <AdminRoute>
            <Navbar />
            <AdminTransactionsPage />
          </AdminRoute>
        }
      />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-bg">
          <AppRoutes />
        </div>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1A1A2E',
              color: '#fff',
              borderRadius: '12px',
            },
          }}
        />
      </AuthProvider>
    </Router>
  );
}

export default App;
