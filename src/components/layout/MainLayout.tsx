import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import Dashboard from '../../pages/Dashboard';
import SalesDashboard from '../../pages/SalesDashboard';
import SettingsPanel from '../../pages/settings/SettingsPanel';
import CreateCompanyModal from '../onboarding/CreateCompanyModal';
import { SubscriptionProvider } from '../../contexts/SubscriptionProvider';
import SubscriptionGuard from './SubscriptionGuard';

const MainLayout: React.FC = () => {
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [wasSidebarExpandedBeforeSettings, setWasSidebarExpandedBeforeSettings] = useState(false);
  const [isCreateCompanyModalOpen, setIsCreateCompanyModalOpen] = useState(false);
  const [activeItem, setActiveItem] = useState('Dashboard');

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

  const renderContent = () => {
    switch (activeItem) {
      case 'Dashboard':
        return <Dashboard />;
      case 'Painel de Vendas':
        return <SalesDashboard />;
      // Adicione outros casos aqui para outros itens de menu
      default:
        return <Dashboard />;
    }
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
          setActiveItem={setActiveItem}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <SubscriptionGuard>
            <main className="flex-1 overflow-y-auto scrollbar-styled pr-2">
              {renderContent()}
            </main>
          </SubscriptionGuard>
        </div>
        
        <AnimatePresence>
          {isSettingsPanelOpen && <SettingsPanel onClose={handleCloseSettings} />}
        </AnimatePresence>
        <AnimatePresence>
          {isCreateCompanyModalOpen && (
            <CreateCompanyModal 
              onClose={() => setIsCreateCompanyModalOpen(false)}
              onCompanyCreated={handleCompanyCreated}
            />
          )}
        </AnimatePresence>
      </div>
    </SubscriptionProvider>
  );
};

export default MainLayout;
