import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/lib/supabaseClient';
import {
  formatFreAmount,
  mapToTransactionDetail,
  TransactionCategory,
  TransactionDetail,
  transactionCategoryBadge,
  transactionCategoryLabels,
} from '@/components/spaces/utilisateur/transaction-utils';
import { cn } from '@/lib/utils';
import { ArrowLeft, ListFilter, RefreshCcw, Search } from 'lucide-react';

interface TransactionHistoryPageProps {
  visible: boolean;
  onClose: () => void;
  authUserId?: string | null;
  onSelectTransaction?: (transaction: TransactionDetail) => void;
}

type RangeFilter = 'all' | '7d' | '30d' | '90d';

const rangeToMs: Record<Exclude<RangeFilter, 'all'>, number> = {
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  '90d': 90 * 24 * 60 * 60 * 1000,
};

const typeFilters: Array<{ id: 'all' | TransactionCategory; label: string }> = [
  { id: 'all', label: 'Toutes' },
  { id: 'deposit', label: 'Depots' },
  { id: 'transfer', label: 'Transferts' },
  { id: 'merchant', label: 'Paiements' },
  { id: 'wallet', label: 'Wallet' },
  { id: 'staking', label: 'Staking' },
  { id: 'other', label: 'Autres' },
];

const formatDate = (value: string) =>
  new Date(value).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

export const TransactionHistoryPage: React.FC<TransactionHistoryPageProps> = ({
  visible,
  onClose,
  authUserId,
  onSelectTransaction,
}) => {
  const [history, setHistory] = useState<TransactionDetail[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionCategory>('all');
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>('30d');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!authUserId) {
      setHistory([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: txError } = await supabase
        .from('UserPaymentTransaction')
        .select('id,context,counterparty,amountFre,feeFre,metadata,createdAt')
        .eq('authUserId', authUserId)
        .order('createdAt', { ascending: false })
        .limit(200);
      if (txError) {
        throw txError;
      }

      setHistory((data ?? []).map(mapToTransactionDetail));
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Transaction history error', err);
      setError('Impossible de charger les transactions.');
    } finally {
      setIsLoading(false);
    }
  }, [authUserId]);

  useEffect(() => {
    if (visible) {
      fetchHistory();
    }
  }, [visible, fetchHistory]);

  const filteredHistory = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const now = Date.now();
    return history.filter((tx) => {
      if (typeFilter !== 'all' && tx.category !== typeFilter) {
        return false;
      }
      if (rangeFilter !== 'all') {
        const threshold = now - rangeToMs[rangeFilter];
        if (new Date(tx.createdAt).getTime() < threshold) {
          return false;
        }
      }
      if (!normalizedSearch) return true;
      const haystack = [
        tx.title,
        tx.counterparty,
        tx.context,
        tx.id,
        tx.metadata ? JSON.stringify(tx.metadata) : '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [history, search, typeFilter, rangeFilter]);

  const stats = useMemo(() => {
    return history.reduce(
      (acc, tx) => {
        if (tx.amount > 0) acc.incoming += tx.amount;
        if (tx.amount < 0) acc.outgoing += Math.abs(tx.amount);
        if (tx.category === 'deposit') acc.deposits += tx.amount;
        return acc;
      },
      { incoming: 0, outgoing: 0, deposits: 0 }
    );
  }, [history]);

  const renderBody = () => {
    if (!authUserId) {
      return (
        <div className="flex h-full items-center justify-center text-sm text-slate-400">
          Connecte-toi pour consulter l&apos;historique.
        </div>
      );
    }

    if (isLoading && history.length === 0) {
      return (
        <div className="flex h-full items-center justify-center text-sm text-slate-400">
          Chargement de vos transactions...
        </div>
      );
    }

    if (error && history.length === 0) {
      return (
        <div className="flex h-full flex-col items-center justify-center space-y-3 text-center text-sm text-red-300">
          <p>{error}</p>
          <Button size="sm" variant="outline" className="border-slate-700 text-white" onClick={fetchHistory}>
            Réessayer
          </Button>
        </div>
      );
    }

    if (filteredHistory.length === 0) {
      return (
        <div className="flex h-full flex-col items-center justify-center space-y-2 text-center text-sm text-slate-400">
          <p>Aucune transaction ne correspond aux filtres actuels.</p>
          <Button size="sm" variant="ghost" className="text-white" onClick={() => setSearch('')}>
            Effacer la recherche
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-2 pb-16">
        {filteredHistory.map((tx) => {
          const note =
            typeof tx.metadata?.note === 'string'
              ? tx.metadata.note
              : typeof tx.metadata?.memo === 'string'
              ? tx.metadata.memo
              : null;
          const badgeClass = transactionCategoryBadge(tx.category);
          return (
            <button
              key={tx.id}
              type="button"
              onClick={() => onSelectTransaction?.(tx)}
              className="w-full rounded-3xl border border-slate-800/60 bg-slate-900/70 p-4 text-left transition hover:border-slate-600 hover:bg-slate-900"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">{tx.title}</p>
                  <p className="text-[11px] text-slate-400">{formatDate(tx.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p
                    className={cn(
                      'text-sm font-semibold',
                      tx.amount >= 0 ? 'text-emerald-400' : 'text-red-300'
                    )}
                  >
                    {`${formatFreAmount(tx.amount, { showSign: true })} FRE`}
                  </p>
                  <span className={cn('mt-1 inline-block text-[10px]', badgeClass)}>
                    {transactionCategoryLabels[tx.category]}
                  </span>
                </div>
              </div>
              {note && <p className="mt-2 text-[11px] text-slate-300 line-clamp-2">Note: {note}</p>}
            </button>
          );
        })}
      </div>
    );
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-slate-950 text-white">
      <div className="mx-auto flex min-h-full max-w-md flex-col px-4 pb-10 pt-6">
        <div className="space-y-3 border-b border-slate-900 pb-4">
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-300 hover:text-white"
              onClick={onClose}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-slate-700 text-white"
              onClick={fetchHistory}
              disabled={isLoading}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Actualiser
            </Button>
          </div>
          <div>
            <p className="text-xl font-semibold">Historique des transactions</p>
            <p className="text-xs text-slate-400">
              Recherche, filtres et details de toutes vos operations.
            </p>
          </div>
          {lastUpdated && (
            <p className="text-[11px] text-slate-500">
              Derniere mise a jour: {lastUpdated.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>

        <div className="py-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher une transaction ou un memo"
                className="border-slate-800 bg-slate-900 pl-9 text-white placeholder:text-slate-500"
              />
            </div>
            <ListFilter className="h-5 w-5 text-slate-500" />
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-2 text-xs">
            {typeFilters.map((filter) => (
              <Button
                key={filter.id}
                size="sm"
                variant={typeFilter === filter.id ? 'default' : 'outline'}
                className={cn(
                  'rounded-full border-slate-800',
                  typeFilter === filter.id ? 'bg-emerald-500 text-slate-950' : 'bg-transparent text-slate-200'
                )}
                onClick={() => setTypeFilter(filter.id)}
              >
                {filter.label}
              </Button>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
            <span>Periode:</span>
            <Select value={rangeFilter} onValueChange={(value) => setRangeFilter(value as RangeFilter)}>
              <SelectTrigger className="w-[180px] border-slate-800 bg-slate-900 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-slate-800 bg-slate-900 text-white">
                <SelectItem value="all">Depuis toujours</SelectItem>
                <SelectItem value="7d">7 derniers jours</SelectItem>
                <SelectItem value="30d">30 jours</SelectItem>
                <SelectItem value="90d">90 jours</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="mt-2 text-[11px] text-emerald-300">
            Les transactions de depot sont regroupees dans l onglet « Depots ».
          </p>
        </div>

        <div className="flex-1 pb-20">{renderBody()}</div>
      </div>
    </div>
  );
};
