import { useState } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Chrome, X } from 'lucide-react';
import { AuthApiError } from '@supabase/supabase-js';

type LoginDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export const LoginDrawer: React.FC<LoginDrawerProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  const reset = () => {
    setEmail('');
    setPassword('');
  };

  const closeDrawer = () => {
    onOpenChange(false);
    reset();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email || !password) {
      toast({
        title: 'Champs manquants',
        description: 'Merci de renseigner email et mot de passe.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      toast({ title: 'Connexion réussie' });
      closeDrawer();
      onSuccess();
    } catch (error) {
      let description =
        error instanceof Error ? error.message : 'Réessaie dans un instant.';
      if (
        error instanceof AuthApiError &&
        error.status === 400 &&
        error.message?.toLowerCase().includes('email not confirmed')
      ) {
        description = 'Confirme ton email avant de te connecter.';
      }
      toast({
        title: 'Connexion impossible',
        description,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      setOauthLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?space=utilisateur`,
          queryParams: { prompt: 'select_account' },
          scopes: 'email profile',
        },
      });
      if (error) throw error;
      toast({
        title: 'Redirection Google engagée',
        description: 'Valide la connexion dans la fenêtre Google.',
      });
    } catch (error) {
      toast({
        title: 'Connexion Google refusée',
        description:
          error instanceof Error
            ? error.message
            : 'Google OAuth a renvoyé une erreur.',
        variant: 'destructive',
      });
      setOauthLoading(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[70vh] bg-slate-950 text-white border-slate-800">
        <DrawerHeader className="space-y-2">
          <div className="text-sm text-emerald-400 uppercase tracking-[0.3em]">
            Accès sécurisé
          </div>
          <DrawerTitle>Connexion FrancPay</DrawerTitle>
          <DrawerDescription className="text-slate-400">
            Authentifie-toi via email + mot de passe ou Google.
          </DrawerDescription>
        </DrawerHeader>

        <form className="px-4 py-2 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@email.com"
              className="bg-slate-900/40 border-slate-800"
            />
          </div>
          <div className="space-y-2">
            <Label>Mot de passe</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="bg-slate-900/40 border-slate-800"
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-emerald-500 hover:bg-emerald-400"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Se connecter'
            )}
          </Button>
        </form>

        <div className="px-4 pb-4 space-y-3">
          <Button
            type="button"
            variant="outline"
            className="w-full border-slate-700 text-white hover:bg-slate-800"
            disabled={oauthLoading}
            onClick={handleGoogle}
          >
            {oauthLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Chrome className="h-4 w-4 mr-2" />
                Continuer avec Google
              </>
            )}
          </Button>
        </div>

        <button
          className="absolute top-4 right-4 text-slate-500 hover:text-white"
          onClick={closeDrawer}
        >
          <X className="h-4 w-4" />
        </button>
      </DrawerContent>
    </Drawer>
  );
};
