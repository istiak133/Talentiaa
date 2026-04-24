import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RoleRedirect } from './components/RoleRedirect';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';
import { OAuthCallback } from './pages/auth/OAuthCallback';
import RecruiterSetupPage from './pages/auth/RecruiterSetupPage';
import CandidateDashboard from './pages/dashboard/CandidateDashboard';
import RecruiterDashboard from './pages/dashboard/RecruiterDashboard';
import AdminDashboard from './pages/dashboard/AdminDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Auth pages */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/recruiter-setup" element={<RecruiterSetupPage />} />

          {/* OAuth callback intercepts error hashes before redirect */}
          <Route path="/auth/callback" element={<OAuthCallback />} />

          {/* Protected: Candidate */}
          <Route
            path="/candidate/*"
            element={
              <ProtectedRoute allowedRoles={['candidate']}>
                <CandidateDashboard />
              </ProtectedRoute>
            }
          />

          {/* Protected: Recruiter */}
          <Route
            path="/recruiter/*"
            element={
              <ProtectedRoute allowedRoles={['recruiter']}>
                <RecruiterDashboard />
              </ProtectedRoute>
            }
          />

          {/* Protected: Admin */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Root redirect */}
          <Route path="/" element={<RoleRedirect />} />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
