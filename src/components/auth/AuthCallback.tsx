import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabaseClient';

type PortalSpace = 'utilisateur';
type CallbackStatus = 'loading' | 'success' | 'error';

export const AuthCallback = () => {
  const [status, setStatus] = useState<CallbackStatus>('loading');
  const [message, setMessage] = useState(
    'Validation de votre session sécurisée FrancPay...'
  );
  const [space, setSpace] = useState<PortalSpace>('utilisateur');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedSpace: PortalSpace = 'utilisateur';
    setSpace(requestedSpace);

    const finishCallback = async () => {
      try {
        if (params.get('error')) {
          throw new Error(
            params.get('error_description') ?? 'Autorisation refusée.'
          );
        }

        if (params.get('code')) {
          const { error } = await supabase.auth.exchangeCodeForSession(
            window.location.href
          );
          if (error) throw error;
        } else {
          const { error } = await supabase.auth.getSession();
          if (error) throw error;
        }

        localStorage.setItem('francpay_last_space', 'utilisateur');
        setStatus('success');
        setMessage('Connexion confirmée. Redirection en cours...');
        setTimeout(() => {
          window.location.replace(`/?space=utilisateur`);
        }, 1400);
      } catch (error) {
        setStatus('error');
        setMessage(
          error instanceof Error
            ? error.message
            : 'Impossible de finaliser la connexion.'
        );
      }
    };

    finishCallback();
  }, []);

  const handleBackHome = () => {
    window.location.replace('/?space=utilisateur');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
      <Card className="max-w-lg w-full bg-slate-900/70 border-slate-800 text-white">
        <CardHeader className="text-center space-y-4">
          <CardTitle className="text-2xl font-semibold">
            Portail Utilisateur
          </CardTitle>
          <CardDescription className="text-slate-300">
            Nous sécurisons votre session via Supabase Auth et vos préférences
            FrancPay. Merci de patienter une seconde.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 py-10">
          {status === 'loading' && (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-emerald-400" />
              <p className="text-sm text-slate-200">{message}</p>
            </>
          )}
          {status === 'success' && (
            <>
              <CheckCircle2 className="h-10 w-10 text-emerald-400" />
              <p className="text-sm text-slate-200">{message}</p>
            </>
          )}
          {status === 'error' && (
            <>
              <AlertTriangle className="h-10 w-10 text-red-400" />
              <p className="text-sm text-red-200">{message}</p>
            </>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button
            onClick={handleBackHome}
            variant="outline"
            className="border-slate-700 text-white hover:bg-slate-800"
          >
            Retourner à l&apos;accueil
          </Button>
          <p className="text-xs text-slate-500 text-center">
            Besoin d&apos;aide ? Contactez support@francpay.com avec la date et
            l&apos;heure de la tentative de connexion.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};
