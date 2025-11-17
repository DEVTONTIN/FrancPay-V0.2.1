import React, { useEffect, useMemo, useState } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { HeroSection } from '@/components/landing/HeroSection';
import { AuthPortal } from '@/components/auth/AuthPortal';
import { SignupDrawer } from '@/components/auth/SignupDrawer';
import { LoginDrawer } from '@/components/auth/LoginDrawer';
import { SignupPage } from '@/components/auth/SignupPage';
import { SpaceSelector } from '@/components/navigation/SpaceSelector';
import { MobileNav } from '@/components/navigation/MobileNav';
import { ProNav } from '@/components/navigation/ProNav';
import { UtilisateurHome } from '@/components/spaces/UtilisateurHome';
import { ProfessionalSpace } from '@/components/spaces/ProfessionalSpace';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Home, ArrowLeft } from 'lucide-react';
import { AuthCallback } from '@/components/auth/AuthCallback';
import { supabase } from '@/lib/supabaseClient';
import './App.css';

type AppView = 'landing' | 'space-selector' | 'utilisateur' | 'professional';

const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [utilisateurSection, setUtilisateurSection] = useState<'home' | 'invest' | 'pay' | 'settings'>('home');
  const [proSection, setProSection] = useState<'clients' | 'dashboard' | 'encaissement' | 'settings'>('dashboard');
  const [isSignupOpen, setIsSignupOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [signupProfile, setSignupProfile] =
    useState<'utilisateur' | 'professional' | null>(null);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [sendVisible, setSendVisible] = useState(false);
  const [verificationDialogOpen, setVerificationDialogOpen] = useState(false);

  useEffect(() => {
    if (window.location.hash && window.location.hash.includes('access_token')) {
      window.history.replaceState(
        null,
        document.title,
        window.location.pathname + window.location.search
      );
    }
    const params = new URLSearchParams(window.location.search);
    const requestedSpace = params.get('space');
    const requestedSection = params.get('section');
    if (requestedSpace === 'professional') {
      if (
        requestedSection === 'clients' ||
        requestedSection === 'dashboard' ||
        requestedSection === 'encaissement' ||
        requestedSection === 'settings'
      ) {
        setProSection(requestedSection);
      }
      setCurrentView('professional');
      return;
    }
    if (requestedSpace === 'utilisateur') {
      setCurrentView('utilisateur');
      setUtilisateurSection('home');
      return;
    }
    const stored = localStorage.getItem('francpay_last_space');
    if (stored === 'professional') {
      setCurrentView('professional');
      const storedProSection = localStorage.getItem('francpay_last_pro_section');
      if (
        storedProSection === 'clients' ||
        storedProSection === 'dashboard' ||
        storedProSection === 'encaissement' ||
        storedProSection === 'settings'
      ) {
        setProSection(storedProSection);
      }
    } else if (stored === 'utilisateur') {
      setCurrentView('utilisateur');
    }
  }, []);

  useEffect(() => {
    const syncSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setCurrentView('landing');
        setUtilisateurSection('home');
        localStorage.removeItem('francpay_last_space');
        return;
      }

      const { data } = await supabase
        .from('UserProfile')
        .select('profileType')
        .eq('authUserId', session.user.id)
        .maybeSingle();

      const view =
        data?.profileType === 'PROFESSIONAL' ? 'professional' : 'utilisateur';
      setCurrentView(view);
      if (view === 'utilisateur') {
        setUtilisateurSection('home');
      } else {
        setProSection('dashboard');
      }
      localStorage.setItem('francpay_last_space', view);
    };

    syncSession();
  }, []);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setCurrentView('landing');
        setUtilisateurSection('home');
        setProSection('dashboard');
        localStorage.removeItem('francpay_last_space');
      }
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (currentView === 'professional') {
      localStorage.setItem('francpay_last_space', 'professional');
    } else if (currentView === 'utilisateur') {
      localStorage.setItem('francpay_last_space', 'utilisateur');
    }
  }, [currentView]);

  useEffect(() => {
    localStorage.setItem('francpay_last_pro_section', proSection);
  }, [proSection]);

  const handleGetStarted = () => {
    setCurrentView('space-selector');
  };

  const handleSelectSpace = (space: 'utilisateur' | 'professional') => {
    setCurrentView(space);
    if (space === 'utilisateur') {
      setUtilisateurSection('home');
    }
  };

  const handleBackToHome = () => {
    setCurrentView('landing');
  };

  const handleBackToSpaces = () => {
    setCurrentView('space-selector');
  };

  // Navigation Header for spaces
  const renderNavigation = () => {
    if (currentView === 'utilisateur' || currentView === 'professional') {
      return (
        <div className="hidden md:flex fixed top-4 left-4 z-40 gap-2">
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
            <HeroSection
              onConnexion={() => setIsLoginOpen(true)}
              onInscription={() => setIsSignupOpen(true)}
            />
          </main>
        </div>
      )}

      {currentView === 'space-selector' && (
        <SpaceSelector onSelectSpace={handleSelectSpace} />
      )}

      {currentView === 'utilisateur' && (
        <UtilisateurHome
          activeSection={utilisateurSection}
          onChangeSection={(section) => {
            setUtilisateurSection(section);
            setHistoryVisible(false);
          }}
          historyVisible={historyVisible}
          onHistoryOpen={() => setHistoryVisible(true)}
          onHistoryClose={() => setHistoryVisible(false)}
          sendVisible={sendVisible}
          onSendOpen={() => setSendVisible(true)}
          onSendClose={() => setSendVisible(false)}
        />
      )}
      
      {currentView === 'professional' && <ProfessionalSpace activeSection={proSection} onSectionChange={setProSection} />}

      {currentView === 'utilisateur' && (
        <MobileNav
          active={utilisateurSection}
          onChange={(tab) => {
            setUtilisateurSection(tab);
            setHistoryVisible(false);
          }}
          onHistory={() => setHistoryVisible(true)}
          historyActive={historyVisible}
        />
      )}
      {currentView === 'professional' && (
        <ProNav active={proSection} onChange={setProSection} />
      )}

      <SignupDrawer
        open={isSignupOpen}
        onOpenChange={setIsSignupOpen}
        onSelectProfile={(type) => setSignupProfile(type)}
      />
      <LoginDrawer
        open={isLoginOpen}
        onOpenChange={setIsLoginOpen}
        onSuccess={(type) => {
          const view = type === 'professional' ? 'professional' : 'utilisateur';
          setCurrentView(view);
          if (view === 'utilisateur') {
            setUtilisateurSection('home');
          }
          localStorage.setItem('francpay_last_space', view);
          setIsLoginOpen(false);
        }}
      />
      {signupProfile && (
        <SignupPage
          profileType={signupProfile}
          onClose={() => setSignupProfile(null)}
          onSuccess={(_type) => {
            setSignupProfile(null);
            setIsLoginOpen(true);
            setVerificationDialogOpen(true);
          }}
        />
      )}

      <Dialog
        modal={false}
        open={verificationDialogOpen}
        onOpenChange={setVerificationDialogOpen}
      >
        <DialogContent className="bg-slate-950 text-white border-slate-800">
          <DialogHeader>
            <DialogTitle>Confirme ton email</DialogTitle>
            <DialogDescription className="text-slate-400">
              Un lien de validation vient de t etre envoye. Valide ton adresse
              email pour pouvoir te connecter a FrancPay.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              className="bg-emerald-500 hover:bg-emerald-400 text-white"
              onClick={() => setVerificationDialogOpen(false)}
            >
              J ai compris
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

function App() {
  const isAuthCallback = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.location.pathname.startsWith('/auth/callback');
  }, []);

  return (
    <>
      {isAuthCallback ? <AuthCallback /> : <AppContent />}
      <Toaster />
    </>
  );
}

export default App;
