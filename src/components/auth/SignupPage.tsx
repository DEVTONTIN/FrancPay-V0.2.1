import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, Chrome, ArrowLeft } from 'lucide-react';
import { AuthApiError } from '@supabase/supabase-js';

type SignupPageProps = {
  profileType: 'utilisateur';
  onClose: () => void;
  onSuccess: () => void;
};

const defaultForm = {
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  referralCode: '',
  bio: '',
};

export const SignupPage: React.FC<SignupPageProps> = ({
  profileType,
  onClose,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  const handleChange = (field: keyof typeof form, value: string) => {
    const nextValue = field === 'username' ? value.toLowerCase() : value;
    setForm((prev) => ({ ...prev, [field]: nextValue }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.username || !form.email || !form.password) {
      toast({
        title: 'Champs requis',
        description: 'Merci de remplir toutes les informations obligatoires.',
        variant: 'destructive',
      });
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast({
        title: 'Mots de passe différents',
        description: 'La confirmation doit correspondre au mot de passe.',
        variant: 'destructive',
      });
      return;
    }
    try {
      setLoading(true);
      const redirectTo = `${window.location.origin}/auth/callback?space=utilisateur`;

      const { error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            profile_type: profileType,
            username: form.username,
            referral_code: form.referralCode || undefined,
            bio: form.bio || undefined,
          },
        },
      });
      if (error) throw error;

      toast({
        title: 'Compte cree',
        description:
          'Un email de confirmation t a ete envoye. Valide-le avant de te connecter.',
        duration: 8000,
      });
      onSuccess();
    } catch (error) {
      let description =
        error instanceof Error ? error.message : 'Ressaie dans un instant.';
      if (error instanceof AuthApiError) {
        if (error.status === 429) {
          description = 'Trop de tentatives. Patiente quelques minutes.';
        }
      }
      toast({
        title: 'Inscription impossible',
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
          error instanceof Error ? error.message : 'Google OAuth a renvoyé une erreur.',
        variant: 'destructive',
      });
      setOauthLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-white overflow-y-auto">
      <div className="max-w-lg mx-auto px-5 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            className="text-slate-400 hover:text-white"
            onClick={onClose}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-400">
            Inscription
          </p>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Créer un compte Utilisateur</h1>
          <p className="text-sm text-slate-400">
            Rejoins FrancPay en quelques secondes. Toutes les données sont chiffrées et conformes aux standards TON.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <Label>Nom d’utilisateur</Label>
            <Input
              value={form.username}
              onChange={(e) => handleChange('username', e.target.value)}
              placeholder="ex: francpay_225"
              className="bg-slate-900/40 border-slate-800"
            />
          </div>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="vous@email.com"
              className="bg-slate-900/40 border-slate-800"
            />
          </div>
          <div className="space-y-1">
            <Label>Mot de passe</Label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => handleChange('password', e.target.value)}
              placeholder="********"
              className="bg-slate-900/40 border-slate-800"
            />
          </div>
          <div className="space-y-1">
            <Label>Confirmation</Label>
            <Input
              type="password"
              value={form.confirmPassword}
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
              placeholder="********"
              className="bg-slate-900/40 border-slate-800"
            />
          </div>
          <div className="space-y-1">
            <Label>Code parrainage (optionnel)</Label>
            <Input
              value={form.referralCode}
              onChange={(e) => handleChange('referralCode', e.target.value)}
              placeholder="Code partenaire"
              className="bg-slate-900/40 border-slate-800"
            />
          </div>
          <div className="space-y-1">
            <Label>À propos / projet (optionnel)</Label>
            <Textarea
              value={form.bio}
              onChange={(e) => handleChange('bio', e.target.value)}
              placeholder="Décrivez votre activité, usage, besoin..."
              className="bg-slate-900/40 border-slate-800 min-h-[100px]"
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-emerald-500 hover:bg-emerald-400"
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Créer mon compte'}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full border-slate-700 text-white hover:bg-slate-800"
            onClick={handleGoogle}
            disabled={oauthLoading}
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
        </form>
      </div>
    </div>
  );
};
