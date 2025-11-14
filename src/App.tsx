import React from 'react';
import { useState } from 'react';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { Toaster } from '@/components/ui/toaster';
import { useTonWallet } from '@/hooks/useTonWallet';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { AccountsSection } from '@/components/landing/AccountsSection';
import { AppDemoSection } from '@/components/landing/AppDemoSection';
import { CTASection } from '@/components/landing/CTASection';
import { SpaceSelector } from '@/components/navigation/SpaceSelector';
import { PersonalSpace } from '@/components/spaces/PersonalSpace';
import { ProfessionalSpace } from '@/components/spaces/ProfessionalSpace';
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft } from 'lucide-react';
import './App.css';

const manifestUrl = 'https://raw.githubusercontent.com/ton-community/tutorials/main/03-wallet/test/public/tonconnect-manifest.json';

type AppView = 'landing' | 'space-selector' | 'personal' | 'professional';

const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('landing');
  const { isConnected } = useTonWallet();

  const handleGetStarted = () => {
    setCurrentView('space-selector');
  };

  const handleSelectSpace = (space: 'personal' | 'professional') => {
    setCurrentView(space);
  };

  const handleBackToHome = () => {
    setCurrentView('landing');
  };

  const handleBackToSpaces = () => {
    setCurrentView('space-selector');
  };

  // Navigation Header for spaces
  const renderNavigation = () => {
    if (currentView === 'personal' || currentView === 'professional') {
      return (
        <div className="fixed top-4 left-4 z-50 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBackToHome}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <Home className="w-4 h-4 mr-2" />
            Accueil
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBackToSpaces}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Espaces
          </Button>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      {renderNavigation()}
      
      {currentView === 'landing' && (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black text-white">
          <main>
            <HeroSection onGetStarted={handleGetStarted} />
            <FeaturesSection />
            <AccountsSection onGetStarted={handleGetStarted} />
            <AppDemoSection />
            <CTASection onGetStarted={handleGetStarted} />
          </main>

          <footer className="border-t border-slate-800 py-12 px-4">
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-lg"></div>
                  <span className="text-xl font-bold text-white">FrancPay</span>
                </div>
                <div className="text-slate-400 text-sm">
                  © 2025 FrancPay. Powered by TON Blockchain.
                </div>
              </div>
            </div>
          </footer>
        </div>
      )}

      {currentView === 'space-selector' && (
        <SpaceSelector onSelectSpace={handleSelectSpace} />
      )}

      {currentView === 'personal' && <PersonalSpace />}
      
      {currentView === 'professional' && <ProfessionalSpace />}
    </>
  );
};

function App() {
  return (
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      <AppContent />
      <Toaster />
    </TonConnectUIProvider>
  );
}

export default App;