import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../../components/landing/Header';
import Hero from '../../components/landing/Hero';
// import Pricing from '../../components/landing/Pricing';
import Features from '../../components/landing/Features';
import FAQ from '../../components/landing/FAQ';
import Footer from '../../components/landing/Footer';
import SignUpModal from '../../components/landing/SignUpModal';
import LoginModal from '../../components/landing/LoginModal';
import { AnimatePresence } from 'framer-motion';
import { OnboardingIntent } from '@/types/onboarding';

const LandingPage: React.FC = () => {
  const [isSignUpModalOpen, setIsSignUpModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [onboardingIntent, setOnboardingIntent] = useState<OnboardingIntent | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const openLoginModal = () => {
    setIsSignUpModalOpen(false);
    setIsLoginModalOpen(true);
  };

  const openSignUpModal = (intent: OnboardingIntent | null = null) => {
    setOnboardingIntent(intent);
    setIsLoginModalOpen(false);
    setIsSignUpModalOpen(true);
  };

  const closeModals = () => {
    setIsLoginModalOpen(false);
    setIsSignUpModalOpen(false);
    setOnboardingIntent(null);
  };

  useEffect(() => {
    // Gatilho para abrir o modal via estado de navegação (ex: vindo da página de confirmação)
    if (location.state?.openLogin) {
      openLoginModal();
      // Limpa o estado para evitar que o modal reabra
      navigate(location.pathname, { replace: true, state: {} });
    }

    // Gatilho para abrir o modal via parâmetro de URL (ex: erprevo.com/?action=login)
    if (searchParams.get('action') === 'login') {
      openLoginModal();
      // Limpa o parâmetro da URL após abrir o modal
      navigate(location.pathname, { replace: true });
    }
  }, [location.state, searchParams, navigate]);

  return (
    <div className="bg-white">
      <Header onLoginClick={openLoginModal} />
      <main>
        <Hero onSignUpClick={() => openSignUpModal({ type: 'trial', planSlug: 'PRO', billingCycle: 'yearly' })} />
        {/* <Pricing onSignUpClick={openSignUpModal} /> */}
        <Features />
        <FAQ />
      </main>
      <Footer />

      <AnimatePresence>
        {isSignUpModalOpen && (
          <SignUpModal 
            onClose={closeModals} 
            onLoginClick={openLoginModal} 
            intent={onboardingIntent}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isLoginModalOpen && (
          <LoginModal onClose={closeModals} onSignUpClick={() => openSignUpModal()} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default LandingPage;
