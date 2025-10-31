import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import SettingsPanel from '../../pages/settings/SettingsPanel';
import CreateCompanyModal from '../onboarding/CreateCompanyModal';
import { SubscriptionProvider } from '../../contexts/SubscriptionProvider';
import SubscriptionGuard from './SubscriptionGuard';
import { menuConfig } from '../../config/menuConfig';
import { useAuth } from '../../contexts/AuthProvider';

const findActiveItem = (pathname: string): string => {
  for (const group of menuConfig) {
    if (group.children) {
      for (const child of group.children) {
        if (pathname.startsWith(child.href)) {
          return child.name;
        }
      }
    }
    if (pathname.startsWith(group.href)) {
      return group.name;
    }
  }
  return 'Dashboard'; // Fallback
};

const MainLayout: React.FC = () => {
  const { empresas, loading: authLoading } = useAuth();
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [wasSidebarExpandedBeforeSettings, setWasSidebarExpandedBeforeSettings] = useState(false);
  const [isCreateCompanyModalOpen, setIsCreateCompanyModalOpen] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();
  const [activeItem, setActiveItem] = useState(() => findActiveItem(location.pathname));

  useEffect(() => {
    setActiveItem(findActiveItem(location.pathname));
  }, [location.pathname]);
  
  useEffect(() => {
    if (!authLoading && empresas.length === 0) {
      setIsCreateCompanyModalOpen(true);
    }
  }, [authLoading, empresas]);

  const handleOpenSettings = () => {
    setWasSidebarExpandedBeforeSettings(!isSidebarCollapsed);
    setIsSidebarCollapsed(true);
    setIsSettingsPanelOpen(true);
  };

  const handleCloseSettings = () => {
    setIsSettingsPanelOpen(false);
    setIsSidebarCollapsed(!wasSidebarExpandedBeforeSettings);
  };

  const handleCompanyCreated = () => {
    setIsCreateCompanyModalOpen(false);
    handleOpenSettings();
  };
  
  const handleCloseCreateCompanyModal = () => {
    if (empresas.length === 0) {
      return;
    }
    setIsCreateCompanyModalOpen(false);
  };

  const handleSetActiveItem = (name: string) => {
    const item = menuConfig.flatMap(g => g.children || g).find(i => i.name === name);
    if (item && item.href && item.href !== '#') {
      navigate(item.href);
    }
    setActiveItem(name);
  };

  return (
    <SubscriptionProvider>
      <div className="h-screen p-4 flex gap-4">
        <Sidebar 
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
          onOpenSettings={handleOpenSettings}
          onOpenCreateCompanyModal={() => setIsCreateCompanyModalOpen(true)}
          activeItem={activeItem}
          setActiveItem={handleSetActiveItem}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <SubscriptionGuard>
            <main className="flex-1 overflow-y-auto scrollbar-styled pr-2">
              <Outlet />
            </main>
          </SubscriptionGuard>
        </div>
        
        <AnimatePresence>
          {isSettingsPanelOpen && <SettingsPanel onClose={handleCloseSettings} />}
        </AnimatePresence>
        <AnimatePresence>
          {isCreateCompanyModalOpen && (
            <CreateCompanyModal 
              onClose={handleCloseCreateCompanyModal}
              onCompanyCreated={handleCompanyCreated}
            />
          )}
        </AnimatePresence>
      </div>
    </SubscriptionProvider>
  );
};

export default MainLayout;
