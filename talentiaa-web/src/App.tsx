import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RoleRedirect } from './components/RoleRedirect';
import LoginPage from './pages/auth/LoginPage';
import AdminLoginPage from './pages/auth/AdminLoginPage';
import SignupPage from './pages/auth/SignupPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';
import { OAuthCallback } from './pages/auth/OAuthCallback';
import CandidateDashboard from './pages/dashboard/CandidateDashboard';
import RecruiterDashboard from './pages/dashboard/RecruiterDashboard';
import AdminDashboard from './pages/dashboard/AdminDashboard';
import CreateJobPage from './pages/recruiter/CreateJobPage';
import ApplyJobPage from './pages/candidate/ApplyJobPage';
import JobBoardPage from './pages/public/JobBoardPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Auth pages */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />

          {/* OAuth callback intercepts error hashes before redirect */}
          <Route path="/auth/callback" element={<OAuthCallback />} />

          {/* Public: Job Board */}
          <Route path="/jobs" element={<JobBoardPage />} />

          {/* Protected: Candidate */}
          <Route
            path="/candidate/*"
            element={
              <ProtectedRoute allowedRoles={['candidate']}>
                <CandidateDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/candidate/apply/:jobId"
            element={
              <ProtectedRoute allowedRoles={['candidate']}>
                <ApplyJobPage />
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
          <Route
            path="/recruiter/jobs/create"
            element={
              <ProtectedRoute allowedRoles={['recruiter']}>
                <CreateJobPage />
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

          {/* Root: Public Job Board */}
          <Route path="/" element={<JobBoardPage />} />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
