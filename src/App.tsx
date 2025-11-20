import React, { useEffect, useMemo, useState } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { HeroSection } from '@/components/landing/HeroSection';
import { SignupDrawer } from '@/components/auth/SignupDrawer';
import { LoginDrawer } from '@/components/auth/LoginDrawer';
import { SignupPage } from '@/components/auth/SignupPage';
import { MobileNav } from '@/components/navigation/MobileNav';
import { UtilisateurHome } from '@/components/spaces/UtilisateurHome';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AuthCallback } from '@/components/auth/AuthCallback';
import { KycPage } from '@/components/kyc/KycPage';
import { FaqPage } from '@/components/faq/FaqPage';
import { supabase } from '@/lib/supabaseClient';
import './App.css';

type AppView = 'landing' | 'utilisateur';

const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [utilisateurSection, setUtilisateurSection] = useState<'home' | 'invest' | 'pay' | 'settings'>('home');
  const [isSignupOpen, setIsSignupOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [signupProfile, setSignupProfile] = useState<'utilisateur' | null>(null);
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
    if (requestedSpace === 'utilisateur') {
      setCurrentView('utilisateur');
      setUtilisateurSection('home');
      return;
    }
    const stored = localStorage.getItem('francpay_last_space');
    if (stored === 'utilisateur') {
      setCurrentView('utilisateur');
      setUtilisateurSection('home');
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

      setCurrentView('utilisateur');
      setUtilisateurSection('home');
      localStorage.setItem('francpay_last_space', 'utilisateur');
    };

    syncSession();
  }, []);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setCurrentView('landing');
        setUtilisateurSection('home');
        localStorage.removeItem('francpay_last_space');
      }
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <>
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

      <SignupDrawer
        open={isSignupOpen}
        onOpenChange={setIsSignupOpen}
        onSelectProfile={() => setSignupProfile('utilisateur')}
      />
      <LoginDrawer
        open={isLoginOpen}
        onOpenChange={setIsLoginOpen}
        onSuccess={() => {
          setCurrentView('utilisateur');
          setUtilisateurSection('home');
          localStorage.setItem('francpay_last_space', 'utilisateur');
          setIsLoginOpen(false);
        }}
      />
      {signupProfile && (
        <SignupPage
          profileType={signupProfile}
          onClose={() => setSignupProfile(null)}
          onSuccess={() => {
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
  const isKycPage = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.location.pathname.startsWith('/kyc');
  }, []);
  const isFaqPage = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.location.pathname.startsWith('/faq');
  }, []);

  return (
    <>
      {isAuthCallback ? <AuthCallback /> : isKycPage ? <KycPage /> : isFaqPage ? <FaqPage /> : <AppContent />}
      <Toaster />
    </>
  );
}

export default App;
