import { cn } from '@/lib/utils';

export type TransactionCategory = 'deposit' | 'transfer' | 'wallet' | 'merchant' | 'staking' | 'other';

export interface SupabaseTransactionRow {
  id: string;
  context: string;
  counterparty: string;
  amountFre: number | string;
  feeFre?: number | string | null;
  metadata?: Record<string, any> | null;
  createdAt: string;
}

export interface TransactionDetail {
  id: string;
  context: string;
  counterparty: string;
  amount: number;
  fee: number;
  createdAt: string;
  metadata: Record<string, any> | null;
  category: TransactionCategory;
  direction: 'in' | 'out' | 'neutral';
  title: string;
}

const sanitizeMetadata = (metadata: unknown): Record<string, any> | null => {
  if (!metadata) return null;
  if (Array.isArray(metadata)) return null;
  if (typeof metadata === 'object') {
    return metadata as Record<string, any>;
  }
  return null;
};

export const resolveTransactionCategory = (
  context: string,
  extras?: { counterparty?: string; metadata?: Record<string, any> | null }
): TransactionCategory => {
  const normalized = (context || '').toLowerCase();
  if (normalized.includes('deposit')) return 'deposit';
  if (normalized.includes('stake')) return 'staking';
  if (normalized.includes('merchant') || normalized.includes('payment')) return 'merchant';
  if (normalized.includes('wallet')) return 'wallet';
  if (normalized.includes('transfer') || normalized.includes('contact')) return 'transfer';

  const counterparty = (extras?.counterparty || '').toLowerCase();
  if (counterparty.includes('stake')) return 'staking';

  if (extras?.metadata && typeof extras.metadata === 'object') {
    const metadataString = JSON.stringify(extras.metadata).toLowerCase();
    if (metadataString.includes('stake')) {
      return 'staking';
    }
    if ('productCode' in extras.metadata) {
      return 'staking';
    }
  }
  return 'other';
};

export const transactionCategoryLabels: Record<TransactionCategory, string> = {
  deposit: 'Dépôt',
  transfer: 'Transfert',
  wallet: 'Wallet',
  merchant: 'Paiement',
  staking: 'Staking',
  other: 'Autre',
};

export const transactionCategoryBadge = (category: TransactionCategory) => {
  const base = 'text-xs px-3 py-1 rounded-full border';
  switch (category) {
    case 'deposit':
      return cn(base, 'border-emerald-400 text-emerald-300 bg-emerald-500/10');
    case 'transfer':
      return cn(base, 'border-sky-400 text-sky-200 bg-sky-500/10');
    case 'wallet':
      return cn(base, 'border-indigo-400 text-indigo-200 bg-indigo-500/10');
    case 'merchant':
      return cn(base, 'border-amber-400 text-amber-200 bg-amber-500/10');
    case 'staking':
      return cn(base, 'border-fuchsia-400 text-fuchsia-200 bg-fuchsia-500/10');
    default:
      return cn(base, 'border-slate-500 text-slate-300 bg-slate-500/10');
  }
};

const formatCounterparty = (value?: string | null) => value?.trim() || 'FrancPay';

export const formatTransactionTitle = (context: string, counterparty: string, amount: number) => {
  const category = resolveTransactionCategory(context, { counterparty });
  const target = formatCounterparty(counterparty);
  switch (category) {
    case 'deposit':
      return 'Dépôt on-chain';
    case 'merchant':
      return `Paiement ${target}`;
    case 'wallet':
      return `Wallet ${target}`;
    case 'staking':
      return amount >= 0 ? `Récompense staking` : `Blocage staking`;
    case 'transfer':
      return `Transfert ${target}`;
    default:
      return `Opération ${target}`;
  }
};

export const mapToTransactionDetail = (row: SupabaseTransactionRow): TransactionDetail => {
  const amount = Number(row.amountFre) || 0;
  const fee = Number(row.feeFre) || 0;
  const metadata = sanitizeMetadata(row.metadata);
  const category = resolveTransactionCategory(row.context, { counterparty: row.counterparty, metadata });
  return {
    id: row.id,
    context: row.context,
    counterparty: row.counterparty,
    amount,
    fee,
    createdAt: row.createdAt,
    metadata,
    category,
    direction: amount > 0 ? 'in' : amount < 0 ? 'out' : 'neutral',
    title: formatTransactionTitle(row.context, row.counterparty, amount),
  };
};

const freFormatter = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatFreAmount = (value: number, options?: { showSign?: boolean }) => {
  const absolute = Math.abs(value);
  const formatted = freFormatter.format(absolute);
  if (absolute === 0) {
    return options?.showSign ? `+${formatted}` : formatted;
  }
  if (value < 0) {
    return `-${formatted}`;
  }
  if (options?.showSign) {
    return `+${formatted}`;
  }
  return formatted;
};
