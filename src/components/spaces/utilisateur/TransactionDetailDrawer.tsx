import React, { useMemo, useState } from 'react';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Copy, CalendarClock, Wallet } from 'lucide-react';
import {
  formatFreAmount,
  TransactionDetail,
  transactionCategoryBadge,
  transactionCategoryLabels,
} from '@/components/spaces/utilisateur/transaction-utils';

interface TransactionDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  transaction?: TransactionDetail | null;
  isLoading?: boolean;
  error?: string | null;
  onReload?: () => void;
}

const formatMetadataValue = (value: unknown) => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return '—';
  }
};

export const TransactionDetailDrawer: React.FC<TransactionDetailDrawerProps> = ({
  open,
  onClose,
  transaction,
  isLoading = false,
  error,
  onReload,
}) => {
  const [copied, setCopied] = useState(false);

  const metadataEntries = useMemo(() => {
    if (!transaction?.metadata) return [];
    return Object.entries(transaction.metadata).map(([key, value]) => ({
      key,
      value: formatMetadataValue(value),
    }));
  }, [transaction]);

  const handleCopyId = async () => {
    if (!transaction?.id) return;
    try {
      await navigator.clipboard.writeText(transaction.id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex h-full items-center justify-center text-sm text-slate-400">
          Chargement des détails...
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex h-full flex-col items-center justify-center space-y-3 text-center text-sm text-red-300">
          <p>{error}</p>
          {onReload && (
            <Button size="sm" variant="outline" className="border-slate-700 text-white" onClick={onReload}>
              Réessayer
            </Button>
          )}
        </div>
      );
    }

    if (!transaction) {
      return (
        <div className="flex h-full items-center justify-center text-sm text-slate-400">
          Sélectionne une transaction pour voir les détails.
        </div>
      );
    }

    const badgeClass = transactionCategoryBadge(transaction.category);
    const counterpartyLabel =
      transaction.category === 'deposit' ? 'On-chain' : transaction.counterparty || 'FrancPay';

    return (
      <div className="flex flex-col gap-5 px-4 pb-8 pt-2 text-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              {transaction.direction === 'in' ? 'Entrée' : transaction.direction === 'out' ? 'Sortie' : 'Neutre'}
            </p>
            <p className="text-3xl font-semibold text-white">
              {`${formatFreAmount(transaction.amount, { showSign: true })} FRE`}
            </p>
          </div>
          <Badge className={badgeClass}>{transactionCategoryLabels[transaction.category]}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-3">
            <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Contrepartie</p>
            <p className="mt-1 text-base font-medium text-white">{counterpartyLabel}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-3">
            <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Frais</p>
            <p className="mt-1 text-base font-medium text-white">{transaction.fee.toFixed(2)} FRE</p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <CalendarClock className="h-4 w-4" />
            {new Date(transaction.createdAt).toLocaleString('fr-FR', {
              weekday: 'short',
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
          <Separator className="my-3 bg-slate-800" />
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.35em] text-slate-500">Identifiant</span>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-slate-300 hover:text-white"
                onClick={handleCopyId}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="break-all text-[13px] text-white">{transaction.id}</p>
            {copied && <p className="text-[10px] text-emerald-400">Identifiant copié</p>}
          </div>
        </div>

        <div className="space-y-2 rounded-3xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Wallet className="h-4 w-4" />
            Détails additionnels
          </div>
          {metadataEntries.length === 0 ? (
            <p className="text-[13px] text-slate-400">Aucune donnée complémentaire.</p>
          ) : (
            <dl className="space-y-2 text-[13px]">
              {metadataEntries.map((entry) => (
                <div key={entry.key} className="flex justify-between gap-4">
                  <dt className="text-slate-500">{entry.key}</dt>
                  <dd className="text-right text-white">{entry.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    );
  };

  return (
    <Drawer open={open} onOpenChange={(value) => !value && onClose()}>
      <DrawerContent className="h-[85vh] overflow-hidden border border-slate-900 bg-slate-950 text-white">
        <DrawerHeader className="border-b border-slate-900">
          <DrawerTitle>Détails de la transaction</DrawerTitle>
          <DrawerDescription className="text-slate-400">
            Glisse vers le bas pour fermer cette fiche.
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto">{renderContent()}</div>
        <DrawerClose className="absolute right-6 top-4 text-slate-400 hover:text-white">Fermer</DrawerClose>
      </DrawerContent>
    </Drawer>
  );
};
