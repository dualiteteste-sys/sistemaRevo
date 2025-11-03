import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthProvider';
import MainLayout from './components/layout/MainLayout';
import PendingVerificationPage from './pages/auth/PendingVerificationPage';
import LandingPage from './pages/landing/LandingPage';
import BillingSuccessPage from './pages/billing/SuccessPage';
import BillingCancelPage from './pages/billing/CancelPage';
import RevoSendPage from './pages/landing/RevoSendPage';
import RevoFluxoPage from './pages/landing/RevoFluxoPage';
import Dashboard from './pages/Dashboard';
import SalesDashboard from './pages/SalesDashboard';
import ProductsPage from './pages/products/ProductsPage';
import PartnersPage from './pages/partners/PartnersPage';
import CarriersPage from './pages/carriers/CarriersPage';
import ServicesPage from './pages/services/ServicesPage';
import OsPage from './pages/os/OsPage';
import AuthConfirmed from './pages/auth/Confirmed';
import CepSearchPage from './pages/tools/CepSearchPage';
import CnpjSearchPage from './pages/tools/CnpjSearchPage';
import NfeInputPage from './pages/tools/NfeInputPage';

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { session, loading } = useAuth();
  const location = useLocation();

  // Show a global spinner only on the very first load when there's no session yet.
  // This prevents the entire app from unmounting on subsequent background session checks.
  if (loading && !session) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="w-16 h-16 border-4 border-blue-500 border-dashed rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }
  
  return children;
};

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/revo-send" element={<RevoSendPage />} />
      <Route path="/revo-fluxo" element={<RevoFluxoPage />} />
      
      <Route path="/auth/pending-verification" element={<PendingVerificationPage />} />
      <Route path="/auth/confirmed" element={<AuthConfirmed />} />
      
      <Route 
        path="/app"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="sales-dashboard" element={<SalesDashboard />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="partners" element={<PartnersPage />} />
        <Route path="carriers" element={<CarriersPage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="ordens-de-servico" element={<OsPage />} />
        <Route path="cep-search" element={<CepSearchPage />} />
        <Route path="cnpj-search" element={<CnpjSearchPage />} />
        <Route path="nfe-input" element={<NfeInputPage />} />
        
        <Route path="billing/success" element={<BillingSuccessPage />} />
        <Route path="billing/cancel" element={<BillingCancelPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
