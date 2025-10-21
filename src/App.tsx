import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthProvider';
import MainLayout from './components/layout/MainLayout';
import AuthLayout from './pages/auth/AuthLayout';
import PendingVerificationPage from './pages/auth/PendingVerificationPage';
import CreateCompanyPage from './pages/onboarding/CreateCompanyPage';
import LandingPage from './pages/landing/LandingPage';
import BillingSuccessPage from './pages/billing/SuccessPage';
import BillingCancelPage from './pages/billing/CancelPage';
import RevoSendPage from './pages/landing/RevoSendPage';

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { session, loading, empresas } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="w-16 h-16 border-4 border-blue-500 border-dashed rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }
  
  if (empresas.length === 0) {
    return <CreateCompanyPage />;
  }

  return children;
};

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/revo-send" element={<RevoSendPage />} />
      
      <Route path="/auth" element={<AuthLayout />}>
        <Route path="pending-verification" element={<PendingVerificationPage />} />
      </Route>

      <Route 
        path="/app/*" 
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        } 
      />
      
      <Route path="/app/billing/success" element={<ProtectedRoute><BillingSuccessPage /></ProtectedRoute>} />
      <Route path="/app/billing/cancel" element={<ProtectedRoute><BillingCancelPage /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
