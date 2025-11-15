import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRightLeft, Share2, Plus, Settings } from 'lucide-react';
import { formatFreAmount } from '@/components/spaces/utilisateur/transaction-utils';

export interface TransactionDisplay {
  id: string;
  title: string;
  amount: number;
  createdAt: string;
}

interface UtilisateurHomeSectionProps {
  transactions: TransactionDisplay[];
  isLoading?: boolean;
  onShare?: () => void;
  onDeposit?: () => void;
  onShowHistory?: () => void;
  onSelectTransaction?: (transactionId: string) => void;
  onOpenSettings?: () => void;
  onOpenSendPage?: () => void;
}

const quickActions = [
  { id: 'deposit' as const, label: 'Ajouter', icon: Plus },
  { id: 'send' as const, label: 'Envoyer', icon: ArrowRightLeft },
  { id: 'share' as const, label: 'Partager', icon: Share2 },
  { id: 'settings' as const, label: 'Paramètres', icon: Settings },
];

export const UtilisateurHomeSection: React.FC<UtilisateurHomeSectionProps> = ({
  transactions,
  isLoading = false,
  onShare,
  onDeposit,
  onShowHistory,
  onSelectTransaction,
  onOpenSettings,
  onOpenSendPage,
}) => {
  const resolveHandler = (actionId: (typeof quickActions)[number]['id']) => {
    switch (actionId) {
      case 'deposit':
        return onDeposit;
      case 'send':
        return onOpenSendPage;
      case 'share':
        return onShare;
      case 'settings':
        return onOpenSettings;
      default:
        return undefined;
    }
  };

  return (
    <>
      <div className="mt-6 grid grid-cols-4 gap-4 px-2">
        {quickActions.map((action) => {
          const handleClick = resolveHandler(action.id);
          return (
            <button
              key={action.label}
              type={handleClick ? 'button' : undefined}
              onClick={handleClick}
              className="flex flex-col items-center gap-1 text-[8px] text-slate-300 tracking-wide focus:outline-none"
            >
              <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center">
                <action.icon className="h-5 w-5 text-white" />
              </div>
              <span>{action.label}</span>
            </button>
          );
        })}
      </div>

      <Card className="bg-slate-900/80 border-slate-800 rounded-3xl">
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-semibold">Offre FrancPay</p>
          <p className="text-xs text-slate-300">
            Inscris-toi sur FrancNumerique.com et beneficie de 50 FRE offerts (limite 31/12/2025).
          </p>
        </CardContent>
      </Card>

      <section>
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-200">Recent transaction</p>
          <button
            type="button"
            onClick={onShowHistory}
            className="text-[11px] font-semibold text-emerald-300 underline-offset-2 hover:underline"
          >
            Tous voir
          </button>
        </div>
        <p className="mb-3 text-[11px] text-slate-400">
          Ici apparaitront les transactions recentes du compte.
        </p>
        <Card className="bg-slate-900/80 border-slate-800 rounded-3xl overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="px-4 py-6 text-center text-xs text-slate-500">Chargement des transactions...</div>
            ) : transactions.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-slate-500">Aucune transaction recente.</div>
            ) : (
              transactions.map((tx, index) => (
                <button
                  key={tx.id}
                  type="button"
                  onClick={() => onSelectTransaction?.(tx.id)}
                  className={`flex w-full justify-between items-center px-4 py-3 ${
                    index < transactions.length - 1 ? 'border-b border-slate-800/70' : ''
                  } ${onSelectTransaction ? 'hover:bg-slate-900/60 transition' : ''}`}
                >
              <div className="flex flex-col flex-1 text-left">
                <p className="text-[13px] font-semibold">{tx.title}</p>
                <p className="text-[10px] uppercase tracking-wide text-slate-500">
                  {new Date(tx.createdAt).toLocaleString('fr-FR', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${tx.amount >= 0 ? 'text-emerald-400' : 'text-slate-200'}`}>
                      {formatFreAmount(tx.amount, { showSign: true })}
                    </p>
                    <p className="text-[11px] text-slate-400">FRE</p>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </>
  );
};
