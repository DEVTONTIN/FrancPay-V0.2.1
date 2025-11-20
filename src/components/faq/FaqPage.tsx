import React from 'react';
import { ArrowLeft, HelpCircle, ShieldCheck, Send, Wallet, CreditCard, Building2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface FaqItem {
  question: string;
  answer: string;
  icon?: React.ReactNode;
}

const faqData: FaqItem[] = [
  {
    question: 'Comment securiser mes fonds ?',
    answer:
      'Active le PIN de transfert (4 chiffres) et valide ton email. Au-dela de 5 essais incorrects, le PIN est verrouille 15 minutes. Les envois/paiments exigent un PIN valide et sont limites a 1 000 000 FRE par transaction et 5 000 000 FRE par 24h (debits uniquement).',
    icon: <ShieldCheck className="h-4 w-4 text-emerald-300" />,
  },
  {
    question: 'Comment envoyer de largent a un contact ?',
    answer:
      'Ouvre Envoi, saisis le handle FrancPay (@pseudo), le montant, et ton PIN. Un frais fixe de 1.00 FRE est debite par envoi. Le debit et le credit sont enregistres immediatement et visibles dans lHistorique.',
    icon: <Send className="h-4 w-4 text-emerald-300" />,
  },
  {
    question: 'Comment payer un marchand ?',
    answer:
      'Dans Payer, saisis la reference ou le tag marchand, le montant et ton PIN. Le frais fixe est de 1.00 FRE. Un recu est stocke dans lHistorique avec la reference et le tag.',
    icon: <CreditCard className="h-4 w-4 text-emerald-300" />,
  },
  {
    question: 'Comment envoyer vers une adresse wallet ?',
    answer:
      'Renseigne ladresse wallet externe, le montant et ton PIN. Verifie ladresse: les envois externes sont definitifs. Un frais fixe de 1.00 FRE est applique. Un memo interne avec ladresse est enregistre.',
    icon: <Wallet className="h-4 w-4 text-emerald-300" />,
  },
  {
    question: 'Comment deposer des fonds on-chain ?',
    answer:
      'Dans Depot, recupere ton tag/identifiant. Envoie des fonds on-chain en lutilisant: la detection est automatique, un mouvement "depot" est ajoute et credite le solde FRE.',
    icon: <Building2 className="h-4 w-4 text-emerald-300" />,
  },
  {
    question: 'Comment consulter mon historique ?',
    answer:
      'Ouvre Historique pour filtrer par type (depot, transfert, marchand, wallet, staking), rechercher par mot-cle ou ID, et voir le detail (montant, frais, note/memo, horodatage).',
    icon: <HelpCircle className="h-4 w-4 text-emerald-300" />,
  },
  {
    question: 'Comment fonctionne le staking ou linvestissement ?',
    answer:
      'Dans Investir, suis le flux propose (allocation, confirmation). Les gains ou recompenses sont regroupees dans lHistorique (type staking). Lis les conditions (rendement, duree, risque) avant de valider.',
    icon: <HelpCircle className="h-4 w-4 text-emerald-300" />,
  },
  {
    question: 'Que faire en cas de blocage KYC ?',
    answer:
      'Relance le parcours KYC depuis KYC: selfie clair, piece en cours de validite, justificatif < 3 mois. En cas de refus, recharge des photos nettes sans reflet; sinon contacte le support avec la reference KYC.',
    icon: <ShieldCheck className="h-4 w-4 text-emerald-300" />,
  },
  {
    question: 'Comment contacter le support ?',
    answer:
      'Ecris a support@francpay.com avec ton email de compte, lID de transaction (si applicable) et une capture derreur. Le centre daide est accessible via le menu (FAQ).',
    icon: <HelpCircle className="h-4 w-4 text-emerald-300" />,
  },
];

export const FaqPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white">
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-300 hover:text-white"
            onClick={() => {
              window.location.assign('/');
            }}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Aide</p>
            <p className="text-xl font-semibold text-white">FAQ FrancPay</p>
          </div>
        </div>

        <Card className="bg-slate-900/80 border-slate-800 rounded-3xl">
          <div className="grid gap-3 p-6">
            {faqData.map((item) => (
              <div
                key={item.question}
                className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 flex gap-3"
              >
                <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900">
                  {item.icon}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white">{item.question}</p>
                  <p className="text-sm text-slate-300 leading-relaxed">{item.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
