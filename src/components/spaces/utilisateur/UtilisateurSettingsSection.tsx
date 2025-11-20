import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  ArrowRight,
  Bell,
  Globe2,
  HelpCircle,
  LogOut,
  Settings2,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';

export interface ProfileFormState {
  firstName: string;
  lastName: string;
  birthDate: string;
  email: string;
  phoneNumber: string;
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  city: string;
  country: string;
}

interface UtilisateurSettingsSectionProps {
  profileName: string;
  profileEmail?: string;
  profileDetails: ProfileFormState;
  onLogoutConfirm: () => Promise<void>;
  logoutPending: boolean;
  onOpenProfilePage: () => void;
}

export const UtilisateurSettingsSection: React.FC<UtilisateurSettingsSectionProps> = ({
  profileName,
  profileEmail,
  profileDetails,
  onLogoutConfirm,
  logoutPending,
  onOpenProfilePage,
}) => {
  const [securityPrefs, setSecurityPrefs] = useState({
    pinLock: true,
    deviceAlerts: true,
    biometric: false,
  });
  const [notificationPrefs, setNotificationPrefs] = useState({
    push: true,
    recap: true,
    sms: Boolean(profileDetails.phoneNumber),
  });
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const handleConfirmLogout = async () => {
    await onLogoutConfirm();
    setLogoutDialogOpen(false);
  };

  useEffect(() => {
    setNotificationPrefs((previous) => ({
      ...previous,
      sms: Boolean(profileDetails.phoneNumber),
    }));
  }, [profileDetails.phoneNumber]);

  const displayName = profileName || 'Utilisateur FrancPay';
  const displayEmail = profileDetails.email || profileEmail || 'email inconnu';
  const initials = useMemo(
    () =>
      displayName
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
    [displayName]
  );

  const locationSummary =
    profileDetails.city || profileDetails.country
      ? [profileDetails.city, profileDetails.country].filter(Boolean).join(' / ')
      : 'Localisation non renseignee';

  const addressSummary =
    profileDetails.addressLine1 || profileDetails.addressLine2 || profileDetails.postalCode
      ? [profileDetails.addressLine1, profileDetails.addressLine2, profileDetails.postalCode]
          .filter(Boolean)
          .join(', ')
      : 'Adresse non renseignee';

  return (
    <>
      <section className="space-y-5 pb-14">
        <Card className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950 border-slate-800 rounded-3xl shadow-xl">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-slate-950 font-semibold flex items-center justify-center text-xl">
                  {initials}
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-emerald-200/70">Espace FrancPay</p>
                  <p className="text-lg font-semibold text-white">{displayName}</p>
                  <p className="text-xs text-slate-300">{displayEmail}</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Badge className="bg-white/10 border-white/10 text-emerald-100">Compte actif</Badge>
                    <Badge className="bg-emerald-500/15 border-emerald-500/20 text-emerald-100">
                      Parametres synchronises
                    </Badge>
                  </div>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="rounded-xl bg-white/10 text-white border-white/10 hover:bg-white/20"
                onClick={onOpenProfilePage}
              >
                Gerer mon profil
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-slate-300">
              <div className="rounded-2xl bg-white/5 border border-white/5 p-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Identite</p>
                <p className="mt-1 font-semibold text-white">{displayName}</p>
              </div>
              <div className="rounded-2xl bg-white/5 border border-white/5 p-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Contact</p>
                <p className="mt-1 font-semibold text-white">
                  {profileDetails.phoneNumber || 'Tel non renseigne'}
                </p>
              </div>
              <div className="rounded-2xl bg-white/5 border border-white/5 p-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Localisation</p>
                <p className="mt-1 font-semibold text-white">{locationSummary}</p>
              </div>
              <div className="rounded-2xl bg-white/5 border border-white/5 p-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Profil</p>
                <p className="mt-1 font-semibold text-white">Complet a 65%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-slate-950/80 border-slate-900 rounded-3xl">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Securite transactionnelle
              </div>
              <div className="space-y-3">
                {[
                  {
                    title: 'Code transfert actif',
                    description: 'Requis pour confirmer les envois et retraits.',
                    key: 'pinLock' as const,
                  },
                  {
                    title: 'Alerte nouveaux appareils',
                    description: 'Notification si un appareil se connecte a votre compte.',
                    key: 'deviceAlerts' as const,
                  },
                  {
                    title: 'Biometrie',
                    description: 'Activer Face/Touch ID sur mobile compatible.',
                    key: 'biometric' as const,
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between rounded-2xl border border-slate-900 bg-slate-900/60 px-4 py-3"
                  >
                    <div className="max-w-[70%]">
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <p className="text-xs text-slate-400">{item.description}</p>
                    </div>
                    <Switch
                      checked={securityPrefs[item.key]}
                      onCheckedChange={(value) =>
                        setSecurityPrefs((previous) => ({ ...previous, [item.key]: value }))
                      }
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-950/80 border-slate-900 rounded-3xl">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Settings2 className="h-4 w-4 text-emerald-400" />
                Preferences d'app
              </div>
              <div className="space-y-3">
                {[
                  {
                    icon: Globe2,
                    title: 'Langue',
                    description: 'Francais (FR)',
                    action: 'Modifier',
                  },
                  {
                    icon: Bell,
                    title: 'Notifications push',
                    description: notificationPrefs.push ? 'Actives sur cet appareil' : 'Desactivees',
                    toggleKey: 'push' as const,
                  },
                  {
                    icon: Smartphone,
                    title: 'Mode compact',
                    description: 'Optimise pour mobile et petits ecrans.',
                    toggleKey: 'recap' as const,
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="flex items-center justify-between rounded-2xl border border-slate-900 bg-slate-900/60 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="rounded-xl bg-white/5 p-2 text-emerald-300">
                        <item.icon className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-white">{item.title}</p>
                        <p className="text-xs text-slate-400">{item.description}</p>
                      </div>
                    </div>
                    {item.toggleKey ? (
                      <Switch
                        checked={notificationPrefs[item.toggleKey]}
                        onCheckedChange={(value) =>
                          setNotificationPrefs((previous) => ({ ...previous, [item.toggleKey!]: value }))
                        }
                      />
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-emerald-200 hover:text-white"
                        onClick={onOpenProfilePage}
                      >
                        {item.action}
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-slate-950/80 border-slate-900 rounded-3xl">
            <CardContent className="p-5 space-y-3">
              <p className="text-sm font-semibold text-white">Identite et contact</p>
              <div className="space-y-2 text-sm text-slate-300">
                <div className="flex items-center justify-between rounded-2xl border border-slate-900 bg-slate-900/60 px-3 py-2">
                  <span>Email</span>
                  <span className="font-semibold text-white">{displayEmail}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-900 bg-slate-900/60 px-3 py-2">
                  <span>Telephone</span>
                  <span className="font-semibold text-white">
                    {profileDetails.phoneNumber || 'Non renseigne'}
                  </span>
                </div>
                <div className="rounded-2xl border border-slate-900 bg-slate-900/60 px-3 py-3">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Adresse</p>
                  <p className="text-sm font-semibold text-white mt-1">{addressSummary}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-950/80 border-slate-900 rounded-3xl">
            <CardContent className="p-5 h-full flex flex-col gap-3">
              <p className="text-sm font-semibold text-white">Support et assistance</p>
              <div className="space-y-2 text-sm text-slate-300 flex-1">
                <div className="rounded-2xl border border-slate-900 bg-slate-900/60 px-3 py-3">
                  <p className="text-sm font-semibold text-white">Centre d'aide</p>
                  <p className="text-xs text-slate-400">Guides, FAQ mobile et suivi incidents.</p>
                </div>
                <div className="rounded-2xl border border-slate-900 bg-slate-900/60 px-3 py-3">
                  <p className="text-sm font-semibold text-white">Support prioritaire</p>
                  <p className="text-xs text-slate-400">Equipe FrancPay disponible 24/7 par chat.</p>
                </div>
              </div>
              <Button className="w-full rounded-2xl bg-emerald-500 text-slate-950 font-semibold hover:bg-emerald-400 flex items-center justify-center gap-2">
                <HelpCircle className="h-4 w-4" />
                Ouvrir le support
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-slate-950/80 border-slate-900 rounded-3xl">
            <CardContent className="p-5 h-full flex flex-col gap-3">
              <p className="text-sm font-semibold text-white">Deconnexion et securite</p>
              <div className="rounded-2xl border border-slate-900 bg-slate-900/60 px-4 py-4 space-y-2">
                <p className="text-xs text-slate-400">
                  Quitter FrancPay sur cet appareil revoque les sessions actives et demande un nouveau code de transfert.
                </p>
                <Button
                  variant="outline"
                  className="w-full rounded-2xl border-red-500/60 text-red-200 hover:bg-red-500/10 flex items-center justify-center gap-2"
                  onClick={() => setLogoutDialogOpen(true)}
                  disabled={logoutPending}
                >
                  <LogOut className="h-4 w-4" />
                  Se deconnecter
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent className="bg-slate-950 text-white border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la deconnexion</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Vous allez etre deconnecte de FrancPay sur cet appareil. Continuer ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex justify-end gap-2">
            <Button variant="outline" className="border-slate-700 text-white" onClick={() => setLogoutDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              className="bg-red-500 text-white hover:bg-red-600"
              onClick={handleConfirmLogout}
              disabled={logoutPending}
            >
              {logoutPending ? 'Deconnexion...' : 'Confirmer'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
