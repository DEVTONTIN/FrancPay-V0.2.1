import React from 'react';
import { ArrowLeft, BadgeCheck, Camera, FileText, Home, ScanFace } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface KycPageProps {
  onBack?: () => void;
  onStart?: () => void;
}

const docItems = [
  { title: 'Piece didentite', description: 'Passeport, CNI ou permis de conduire en cours de validite.', icon: <BadgeCheck className="h-5 w-5 text-emerald-400" /> },
  { title: 'Selfie controle', description: 'Photo recente, sans accessoire, visage entier visible.', icon: <ScanFace className="h-5 w-5 text-cyan-300" /> },
  { title: 'Justificatif de domicile', description: 'Facture (< 3 mois) ou attestation officielle avec adresse.', icon: <Home className="h-5 w-5 text-amber-300" /> },
];

const steps = [
  'Confirme tes informations personnelles.',
  'Depose tes documents et prends un selfie controle.',
  'Verification automatique (quelques minutes).',
  'Validation manuelle si necessaire.',
];

export const KycPage: React.FC<KycPageProps> = ({ onBack, onStart }) => {
  const handleStart = () => {
    if (onStart) {
      onStart();
      return;
    }
    // Fallback navigation to a dedicated KYC start route
    if (typeof window !== 'undefined') {
      window.location.assign('/kyc/start');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white">
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-300 hover:text-white"
              onClick={() => {
                if (onBack) {
                  onBack();
                } else {
                  window.location.href = '/';
                }
              }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </Button>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Verification</p>
              <p className="text-xl font-semibold text-white">Parcours KYC</p>
            </div>
          </div>
          <BadgeCheck className="h-7 w-7 text-emerald-400" />
        </div>

        <Card className="bg-slate-900/80 border-slate-800 rounded-3xl">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Camera className="h-5 w-5 text-emerald-400" />
              <div>
                <p className="text-lg font-semibold text-white">Pourquoi fournir tes documents ?</p>
                <p className="text-sm text-slate-400">
                  Nous devons verifier ton identite pour proteger ton compte, respecter les obligations regulatoires
                  et debloquer les limites d envoi/retrait.
                </p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {docItems.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    {item.icon}
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
            <Button
              className="w-full rounded-2xl bg-emerald-500 text-slate-950 font-semibold hover:bg-emerald-400"
              onClick={handleStart}
            >
              Commencer la verification
            </Button>
            <p className="text-[11px] text-slate-400">
              Astuce : assure-toi davoir une bonne lumiere et des documents lisibles pour eviter les rejections.
            </p>
          </div>
        </Card>

        <Card className="bg-slate-900/70 border-slate-800 rounded-3xl">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-400" />
              <p className="text-sm font-semibold text-white">Etapes</p>
            </div>
            <div className="space-y-3">
              {steps.map((step, index) => (
                <div
                  key={step}
                  className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-slate-300">
                    {index + 1}
                  </div>
                  <p className="text-sm text-slate-200">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="bg-slate-900/70 border-slate-800 rounded-3xl">
          <div className="p-6 space-y-3">
            <p className="text-sm font-semibold text-white">Support</p>
            <p className="text-xs text-slate-300">
              En cas de blocage ou de rejet, contacte le support: <span className="text-emerald-300">support@francpay.com</span>.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};
