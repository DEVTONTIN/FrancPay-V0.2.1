import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Award, Coins, Lock, RefreshCcw, ShieldCheck, Clock3, Layers, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { TRANSFER_FEE_FRE, TRANSFER_FEE_LABEL } from '@/config/fees';

type StakeProductRecord = {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  apyPercent: number;
  lockPeriodDays: number;
  minAmountFre: number;
  maxAmountFre: number | null;
  isLocked: boolean;
};

type StakePositionRecord = {
  id: string;
  productId?: string;
  principalFre: number;
  rewardAccruedFre: number;
  status: 'ACTIVE' | 'REDEEMED' | 'CANCELLED';
  lockedUntil?: string | null;
  nextRewardAt?: string | null;
  redeemedAt?: string | null;
  createdAt: string;
  productSnapshot?: Record<string, any>;
  product?: StakeProductRecord | null;
};

type PositionGroup = {
  key: string;
  label: string;
  positions: StakePositionRecord[];
  stats: {
    totalPrincipal: number;
    totalRewards: number;
    totalDailyReward: number;
    nextRewardAt?: string;
    lockedUntil?: string | null;
    isLocked: boolean;
  };
};

interface UtilisateurInvestSectionProps {
  authUserId: string | null;
  balanceFre: number;
  onRefreshWallet?: () => Promise<void> | void;
}

const formatter = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatNumber = (value: number) => formatter.format(value || 0);

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: 'short',
    });
  } catch {
    return value;
  }
};

const computeDailyReward = (principal: number, apyPercent: number) => {
  if (!principal || !apyPercent) return 0;
  return Number(((principal * apyPercent) / 100 / 365).toFixed(2));
};

const resolvePositionTitle = (position: StakePositionRecord) => {
  const snapshotTitle =
    typeof position.productSnapshot?.title === 'string' ? position.productSnapshot?.title : undefined;
  return position.product?.title ?? snapshotTitle ?? 'Staking';
};

const resolvePositionCode = (position: StakePositionRecord) => {
  const snapshotCode =
    typeof position.productSnapshot?.code === 'string' ? position.productSnapshot?.code : undefined;
  return position.product?.code ?? snapshotCode ?? position.productId ?? position.id;
};

const classicGroupKey = 'stacking_classic';

const normalizeStakeProductRecord = (input: Record<string, any>, fallbackId?: string): StakeProductRecord => {
  const resolveString = (value: any, fallback: string) =>
    typeof value === 'string' && value.trim().length > 0 ? value : fallback;
  const code = resolveString(input.code, fallbackId ?? 'STAKE');
  const id = resolveString(input.id, fallbackId ?? code);
  return {
    id,
    code,
    title: resolveString(input.title, 'Staking'),
    description:
      typeof input.description === 'string'
        ? input.description
        : input.description === null || input.description === undefined
        ? null
        : String(input.description),
    apyPercent: Number(input.apyPercent ?? 0),
    lockPeriodDays: Number(input.lockPeriodDays ?? 0),
    minAmountFre: Number(input.minAmountFre ?? 0),
    maxAmountFre:
      input.maxAmountFre === null || input.maxAmountFre === undefined ? null : Number(input.maxAmountFre),
    isLocked: Boolean(
      input.isLocked !== undefined ? input.isLocked : Number(input.lockPeriodDays ?? 0) > 0
    ),
  };
};

export const UtilisateurInvestSection: React.FC<UtilisateurInvestSectionProps> = ({
  authUserId,
  balanceFre,
  onRefreshWallet,
}) => {
  const [products, setProducts] = useState<StakeProductRecord[]>([]);
  const [positions, setPositions] = useState<StakePositionRecord[]>([]);
  const [fetching, setFetching] = useState(false);
  const [stakeInputs, setStakeInputs] = useState<Record<string, string>>({});
  const [pendingStake, setPendingStake] = useState<string | null>(null);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [stakePreview, setStakePreview] = useState<{ product: StakeProductRecord; amount: number } | null>(null);
  const [resultModal, setResultModal] = useState<{ status: 'success' | 'error'; title: string; message: string } | null>(
    null
  );
  const [withdrawSelection, setWithdrawSelection] = useState<{ position: StakePositionRecord; amountInput: string } | null>(
    null
  );
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawConfirm, setWithdrawConfirm] = useState<{
    position: StakePositionRecord;
    amount: number;
    inputValue: string;
  } | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const loadInvestData = useCallback(async () => {
    setFetching(true);
    const [{ data: productData, error: productError }, positionResult] = await Promise.all([
      supabase
        .from('StakeProduct')
        .select('*')
        .eq('isActive', true)
        .order('apyPercent', { ascending: false }),
      authUserId
        ? supabase
            .from('UserStakePosition')
            .select(
              'id,productId,principalFre,rewardAccruedFre,status,lockedUntil,nextRewardAt,redeemedAt,createdAt,productSnapshot,product:productId(id,code,title,description,apyPercent,lockPeriodDays,minAmountFre,maxAmountFre,isLocked)'
            )
            .eq('authUserId', authUserId)
            .order('createdAt', { ascending: false })
        : { data: [], error: null },
    ]);

    if (productError) {
      console.error('Stake product fetch error', productError);
    } else if (productData) {
      const normalized: StakeProductRecord[] = (productData ?? []).map((product, index) =>
        normalizeStakeProductRecord(product as Record<string, any>, `STAKE-${index}`)
      );
      setProducts(normalized);
    }

    if ('error' in positionResult && positionResult.error) {
      console.error('Stake position fetch error', positionResult.error);
      setPositions([]);
    } else {
      const normalized: StakePositionRecord[] = (positionResult.data ?? []).map((row, index) => {
        const typedRow = row as Record<string, any>;
        const snapshot = (typedRow.productSnapshot ?? {}) as Record<string, any>;
        const normalizedProduct = typedRow.product
          ? normalizeStakeProductRecord(typedRow.product as Record<string, any>, typedRow.productId)
          : normalizeStakeProductRecord(snapshot, typedRow.productId ?? `POSITION-${index}`);
        const statusValue = (typedRow.status as StakePositionRecord['status']) ?? 'ACTIVE';
        return {
          id: String(typedRow.id ?? `position-${index}`),
          productId: typeof typedRow.productId === 'string' ? typedRow.productId : normalizedProduct.id,
          principalFre: Number(typedRow.principalFre ?? 0),
          rewardAccruedFre: Number(typedRow.rewardAccruedFre ?? 0),
          status: statusValue,
          lockedUntil: typedRow.lockedUntil ?? null,
          nextRewardAt: typedRow.nextRewardAt ?? null,
          redeemedAt: typedRow.redeemedAt ?? null,
          createdAt: typedRow.createdAt ?? new Date().toISOString(),
          productSnapshot: snapshot,
          product: normalizedProduct,
        };
      });
      setPositions(normalized);
    }

    setFetching(false);
  }, [authUserId]);

  useEffect(() => {
    loadInvestData();
  }, [loadInvestData]);

  const handleStakeInputChange = (code: string, value: string) => {
    setStakeInputs((prev) => ({ ...prev, [code]: value }));
  };

  const closeConfirm = () => setStakePreview(null);

  const handleStakePrompt = (product: StakeProductRecord) => {
    if (!authUserId) {
      setFeedback({ type: 'error', message: 'Connectez-vous pour investir.' });
      return;
    }
    const rawValue = stakeInputs[product.code] || '';
    const numericValue = Number(rawValue.replace(',', '.'));
    if (!numericValue || Number.isNaN(numericValue)) {
      setFeedback({ type: 'error', message: 'Saisissez un montant valide.' });
      return;
    }
    if (numericValue < product.minAmountFre) {
      setFeedback({
        type: 'error',
        message: `Minimum ${formatNumber(product.minAmountFre)} FRE requis.`,
      });
      return;
    }
    if (product.maxAmountFre && numericValue > product.maxAmountFre) {
      setFeedback({
        type: 'error',
        message: `Maximum ${formatNumber(product.maxAmountFre)} FRE autorisé pour cette offre.`,
      });
      return;
    }
    const totalCost = numericValue + TRANSFER_FEE_FRE;
    if (totalCost > balanceFre) {
      setFeedback({
        type: 'error',
        message: `Montant supérieur à votre solde disponible après frais (${TRANSFER_FEE_LABEL}).`,
      });
      return;
    }

    setStakePreview({ product, amount: numericValue });
    setFeedback(null);
  };

  const confirmStake = async () => {
    if (!stakePreview) return;
    const preview = stakePreview;
    closeConfirm();
    setPendingStake(preview.product.code);
    try {
      const { error } = await supabase.rpc('rpc_user_stake_create', {
        p_product_code: preview.product.code,
        p_amount_fre: preview.amount,
      });
      if (error) throw error;
      setStakeInputs((prev) => ({ ...prev, [preview.product.code]: '' }));
      setResultModal({
        status: 'success',
        title: 'Staking confirmé',
        message: `Votre mise de ${formatNumber(preview.amount)} FRE sur ${preview.product.title} est en cours de synchronisation.`,
      });
      await loadInvestData();
      await onRefreshWallet?.();
    } catch (error) {
      console.error('Stake creation error', error);
      setResultModal({
        status: 'error',
        title: 'Echec du staking',
        message: error instanceof Error ? error.message : 'Impossible de créer la position.',
      });
    } finally {
      setPendingStake(null);
    }
  };

  const openWithdrawPrompt = (position: StakePositionRecord) => {
    if (!authUserId) {
      setFeedback({ type: 'error', message: 'Connectez-vous pour retirer.' });
      return;
    }
    setWithdrawSelection({ position, amountInput: position.principalFre.toString() });
    setWithdrawError(null);
  };

  const closeWithdrawPrompt = () => {
    setWithdrawSelection(null);
    setWithdrawError(null);
  };

  const handleWithdrawAmountChange = (value: string) => {
    setWithdrawSelection((prev) => (prev ? { ...prev, amountInput: value } : prev));
    setWithdrawError(null);
  };

  const proceedWithdrawConfirmation = () => {
    if (!withdrawSelection) return;
    const numericValue = Number(withdrawSelection.amountInput.replace(',', '.'));
    if (!numericValue || Number.isNaN(numericValue)) {
      setWithdrawError('Saisissez un montant valide.');
      return;
    }
    if (numericValue <= 0) {
      setWithdrawError('Le montant doit etre superieur a 0.');
      return;
    }
    if (numericValue > withdrawSelection.position.principalFre) {
      setWithdrawError('Montant superieur au capital disponible sur cette position.');
      return;
    }
    setWithdrawConfirm({
      position: withdrawSelection.position,
      amount: numericValue,
      inputValue: withdrawSelection.amountInput,
    });
    setWithdrawSelection(null);
  };

  const handleWithdrawConfirmCancel = () => {
    if (!withdrawConfirm) return;
    setWithdrawSelection({
      position: withdrawConfirm.position,
      amountInput: withdrawConfirm.inputValue,
    });
    setWithdrawConfirm(null);
  };

  const executeRedeem = async (position: StakePositionRecord, amountFre: number) => {
    if (!authUserId) return;
    setRedeeming(position.id);
    setFeedback(null);
    try {
      const { error } = await supabase.rpc('rpc_user_stake_withdraw', {
        p_position_id: position.id,
        p_amount_fre: amountFre,
      });
      if (error) throw error;
      setResultModal({
        status: 'success',
        title: 'Retrait en cours',
        message: `Votre demande de retrait de ${formatNumber(amountFre)} FRE sur ${resolvePositionTitle(position)} est en cours de traitement.`,
      });
      await loadInvestData();
      await onRefreshWallet?.();
    } catch (error) {
      console.error('Stake redeem error', error);
      setResultModal({
        status: 'error',
        title: 'Retrait impossible',
        message: error instanceof Error ? error.message : 'Retrait impossible pour cette position.',
      });
    } finally {
      setRedeeming(null);
      setWithdrawConfirm(null);
    }
  };

  const activePositions = useMemo(() => positions.filter((pos) => pos.status === 'ACTIVE'), [positions]);
  const historicalPositions = useMemo(() => positions.filter((pos) => pos.status !== 'ACTIVE'), [positions]);
  const totalLocked = useMemo(
    () => activePositions.reduce((acc, pos) => acc + pos.principalFre, 0),
    [activePositions]
  );
  const totalRewards = useMemo(
    () => positions.reduce((acc, pos) => acc + pos.rewardAccruedFre, 0),
    [positions]
  );
  const totalDailyReward = useMemo(
    () =>
      activePositions.reduce((acc, pos) => {
        const apy = pos.product?.apyPercent ?? Number(pos.productSnapshot?.apyPercent ?? 0);
        return acc + computeDailyReward(pos.principalFre, apy);
      }, 0),
    [activePositions]
  );
  const nextRewardAt = useMemo(() => {
    const nextDates = activePositions
      .map((pos) => pos.nextRewardAt)
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    return nextDates[0];
  }, [activePositions]);

  const groupedActivePositions = useMemo(() => {
    const groups = new Map<string, PositionGroup>();
    activePositions.forEach((position) => {
      const code = resolvePositionCode(position);
      const title = resolvePositionTitle(position);
      const descriptor = `${code} ${title}`.toLowerCase();
      const isClassic = descriptor.includes('classic');
      const key = isClassic ? classicGroupKey : code;
      const label = isClassic ? 'Staking classic' : title;
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          label,
          positions: [],
          stats: {
            totalPrincipal: 0,
            totalRewards: 0,
            totalDailyReward: 0,
            nextRewardAt: undefined,
            lockedUntil: null,
            isLocked: Boolean(position.product?.isLocked ?? position.productSnapshot?.isLocked ?? false),
          },
        });
      }
      const group = groups.get(key)!;
      group.positions.push(position);
      group.stats.totalPrincipal += position.principalFre;
      group.stats.totalRewards += position.rewardAccruedFre;
      const apy = position.product?.apyPercent ?? Number(position.productSnapshot?.apyPercent ?? 0);
      group.stats.totalDailyReward += computeDailyReward(position.principalFre, apy);
      const positionNextRewardAt =
        typeof position.nextRewardAt === 'string' && position.nextRewardAt.length > 0
          ? position.nextRewardAt
          : undefined;
      const nextRewardDate = positionNextRewardAt ? new Date(positionNextRewardAt) : null;
      if (nextRewardDate) {
        const groupNextRewardDate = group.stats.nextRewardAt ? new Date(group.stats.nextRewardAt) : null;
        if (!groupNextRewardDate || nextRewardDate < groupNextRewardDate) {
          group.stats.nextRewardAt = positionNextRewardAt;
        }
      }
      const positionLockedUntil = position.lockedUntil ?? null;
      const positionLockedUntilDate = positionLockedUntil ? new Date(positionLockedUntil) : null;
      const lockActive =
        Boolean(position.product?.isLocked ?? position.productSnapshot?.isLocked ?? false) &&
        positionLockedUntilDate !== null &&
        positionLockedUntilDate > new Date();
      if (lockActive && positionLockedUntilDate && positionLockedUntil) {
        group.stats.isLocked = true;
        const groupLockedUntilDate = group.stats.lockedUntil ? new Date(group.stats.lockedUntil) : null;
        if (!groupLockedUntilDate || positionLockedUntilDate > groupLockedUntilDate) {
          group.stats.lockedUntil = positionLockedUntil;
        }
      }
    });
    const arr = Array.from(groups.values());
    arr.sort((a, b) => {
      if (a.key === classicGroupKey && b.key !== classicGroupKey) return -1;
      if (b.key === classicGroupKey && a.key !== classicGroupKey) return 1;
      return a.label.localeCompare(b.label);
    });
    return arr;
  }, [activePositions]);

  const getGroupDefaultExpanded = (group: PositionGroup) =>
    group.positions.length <= 1 || group.key === classicGroupKey;

  const isGroupExpanded = (group: PositionGroup) =>
    expandedGroups[group.key] ?? getGroupDefaultExpanded(group);

  const toggleGroupExpanded = (group: PositionGroup) => {
    const defaultValue = getGroupDefaultExpanded(group);
    setExpandedGroups((prev) => ({
      ...prev,
      [group.key]: !(prev[group.key] ?? defaultValue),
    }));
  };

  return (
    <section className="space-y-4">
      <Card className="bg-slate-900/80 border-slate-800 rounded-3xl">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.35em] text-emerald-400">
            <span>Investir</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-emerald-300 hover:text-emerald-100 hover:bg-slate-800/60"
              onClick={loadInvestData}
              disabled={fetching}
            >
              <RefreshCcw className={`h-3.5 w-3.5 mr-1 ${fetching ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm text-slate-200">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
              <p className="text-[11px] text-slate-400">Solde disponible</p>
              <p className="text-xl font-semibold">{formatNumber(balanceFre)} FRE</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
              <p className="text-[11px] text-slate-400">Capital immobilisé</p>
              <p className="text-xl font-semibold text-emerald-400">{formatNumber(totalLocked)} FRE</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
              <p className="text-[11px] text-slate-400">Rewards cumulés</p>
              <p className="text-xl font-semibold text-emerald-300">{formatNumber(totalRewards)} FRE</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
              <p className="text-[11px] text-slate-400">Prochaine distribution</p>
              <p className="text-sm font-semibold text-white">{formatDateTime(nextRewardAt)}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 col-span-2">
              <p className="text-[11px] text-slate-400">Rewards quotidiens estimés</p>
              <p className="text-xl font-semibold text-emerald-300">
                {formatNumber(totalDailyReward)} FRE
                <span className="text-[11px] text-slate-400 ml-2">/ jour vers 08h00</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <Clock3 className="h-3.5 w-3.5 text-emerald-300" />
            Rewards versés chaque jour à 08:00 (UTC) automatiquement par FrancPay.
          </div>
        </CardContent>
      </Card>

      {feedback && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
              : 'border-rose-500/30 bg-rose-500/10 text-rose-100'
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="space-y-3">
        {products.map((product) => (
          <Card key={product.code} className="bg-slate-900/80 border-slate-800 rounded-3xl">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-slate-400">{product.code}</p>
                  <p className="text-lg font-semibold">{product.title}</p>
                  <p className="text-xs text-slate-400">{product.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-emerald-400">{product.apyPercent}%</p>
                  <p className="text-[11px] text-slate-400">APY fixe</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 text-[11px] text-slate-300">
                <Badge variant="outline" className="border-slate-700 bg-slate-900/60">
                  <Lock className="h-3 w-3 mr-1" />
                  {product.lockPeriodDays > 0 ? `Blocage ${product.lockPeriodDays} jours` : 'Retrait libre'}
                </Badge>
                <Badge variant="outline" className="border-slate-700 bg-slate-900/60">
                  <Award className="h-3 w-3 mr-1" />
                  Paiement quotidien 08h00
                </Badge>
                <Badge variant="outline" className="border-slate-700 bg-slate-900/60">
                  <Coins className="h-3 w-3 mr-1" />
                  Min {formatNumber(product.minAmountFre)} FRE
                  {product.maxAmountFre ? ` · Max ${formatNumber(product.maxAmountFre)} FRE` : ''}
                </Badge>
              </div>

              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={product.minAmountFre}
                  step="100"
                  placeholder={product.minAmountFre ? product.minAmountFre.toString() : '1000'}
                  value={stakeInputs[product.code] || ''}
                  onChange={(event) => handleStakeInputChange(product.code, event.target.value)}
                  className="bg-slate-950 border-slate-800 text-white text-base"
                />
                <Button
                  className="flex-1 rounded-2xl bg-emerald-500 text-slate-950 font-semibold hover:bg-emerald-400 disabled:opacity-40"
                  onClick={() => handleStakePrompt(product)}
                  disabled={pendingStake === product.code || fetching}
                >
                  {pendingStake === product.code ? 'Validation...' : 'Commencer'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-slate-900/80 border-slate-800 rounded-3xl">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Positions actives
          </div>

          {fetching ? (
            <p className="text-xs text-slate-400">Chargement des positions...</p>
          ) : groupedActivePositions.length === 0 ? (
            <p className="text-xs text-slate-500">Aucun staking en cours. Selectionnez une offre ci-dessus.</p>
          ) : (
            <div className="space-y-3">
              {groupedActivePositions.map((group) => {
                if (group.positions.length === 1) {
                  const position = group.positions[0];
                  const isLockedFuture =
                    Boolean(position.product?.isLocked) &&
                    !!position.lockedUntil &&
                    new Date(position.lockedUntil) > new Date();
                  return (
                    <div
                      key={position.id}
                      className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold">{resolvePositionTitle(position)}</p>
                          <p className="text-[11px] text-slate-500">Cree le {formatDateTime(position.createdAt)}</p>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            position.product?.isLocked
                              ? 'border-amber-400/50 text-amber-300'
                              : 'border-emerald-400/50 text-emerald-200'
                          }
                        >
                          {position.product?.isLocked ? 'Bloque' : 'Flexible'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-[11px] text-slate-400">Capital</p>
                          <p className="font-semibold">{formatNumber(position.principalFre)} FRE</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-400">Rewards cumules</p>
                          <p className="font-semibold text-emerald-300">{formatNumber(position.rewardAccruedFre)} FRE</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-400">Prochaine reward</p>
                          <p className="font-semibold">{formatDateTime(position.nextRewardAt)}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-400">Deblocage</p>
                          <p className="font-semibold">
                            {position.product?.isLocked ? formatDateTime(position.lockedUntil) : 'Disponible immediat'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-400">Reward quotidien</p>
                          <p className="font-semibold text-emerald-200">
                            {formatNumber(
                              computeDailyReward(
                                position.principalFre,
                                position.product?.apyPercent ?? Number(position.productSnapshot?.apyPercent ?? 0)
                              )
                            )}{' '}
                            FRE
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className="mt-2 h-11 w-full rounded-xl border-slate-700 text-white hover:bg-slate-800/60 disabled:opacity-40"
                        onClick={() => openWithdrawPrompt(position)}
                        disabled={redeeming === position.id || isLockedFuture}
                      >
                        {redeeming === position.id ? 'Traitement...' : 'Retirer'}
                      </Button>
                    </div>
                  );
                }
                const aggregatedUnlockLabel = group.stats.isLocked
                  ? group.stats.lockedUntil
                    ? `Bloque jusqu'au ${formatDateTime(group.stats.lockedUntil)}`
                    : 'Bloque'
                  : 'Disponible immediat';
                const expanded = isGroupExpanded(group);
                return (
                  <div key={group.key} className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{group.label}</p>
                        <p className="text-[11px] text-slate-500">
                          {group.positions.length} positions actives regroupees
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            group.stats.isLocked
                              ? 'border-amber-400/50 text-amber-300'
                              : 'border-emerald-400/50 text-emerald-200'
                          }
                        >
                          {group.stats.isLocked ? 'Bloque' : 'Flexible'}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[11px] text-slate-300 hover:bg-slate-900/60"
                          onClick={() => toggleGroupExpanded(group)}
                        >
                          {expanded ? 'Masquer' : 'Details'}
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-[11px] text-slate-400">Capital total</p>
                        <p className="font-semibold">{formatNumber(group.stats.totalPrincipal)} FRE</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-400">Rewards cumules</p>
                        <p className="font-semibold text-emerald-300">{formatNumber(group.stats.totalRewards)} FRE</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-400">Prochaine reward</p>
                        <p className="font-semibold">{formatDateTime(group.stats.nextRewardAt)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-400">Disponibilite</p>
                        <p className="font-semibold">{aggregatedUnlockLabel}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-400">Rewards quotidiens</p>
                        <p className="font-semibold text-emerald-200">
                          {formatNumber(group.stats.totalDailyReward)} FRE
                        </p>
                      </div>
                    </div>
                    {expanded && (
                      <div className="space-y-3 border-t border-slate-800/60 pt-3">
                        {group.positions.map((position) => {
                          const isLockedFuture =
                            Boolean(position.product?.isLocked) &&
                            !!position.lockedUntil &&
                            new Date(position.lockedUntil) > new Date();
                          return (
                            <div
                              key={position.id}
                              className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-3 space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-semibold">{resolvePositionTitle(position)}</p>
                                  <p className="text-[11px] text-slate-500">
                                    Cree le {formatDateTime(position.createdAt)}
                                  </p>
                                </div>
                                <Badge
                                  variant="outline"
                                  className={
                                    position.product?.isLocked
                                      ? 'border-amber-400/50 text-amber-300'
                                      : 'border-emerald-400/50 text-emerald-200'
                                  }
                                >
                                  {position.product?.isLocked ? 'Bloque' : 'Flexible'}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <p className="text-[11px] text-slate-400">Capital</p>
                                  <p className="font-semibold">{formatNumber(position.principalFre)} FRE</p>
                                </div>
                                <div>
                                  <p className="text-[11px] text-slate-400">Rewards cumules</p>
                                  <p className="font-semibold text-emerald-300">
                                    {formatNumber(position.rewardAccruedFre)} FRE
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[11px] text-slate-400">Prochaine reward</p>
                                  <p className="font-semibold">{formatDateTime(position.nextRewardAt)}</p>
                                </div>
                                <div>
                                  <p className="text-[11px] text-slate-400">Deblocage</p>
                                  <p className="font-semibold">
                                    {position.product?.isLocked ? formatDateTime(position.lockedUntil) : 'Disponible immediat'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[11px] text-slate-400">Reward quotidien</p>
                                  <p className="font-semibold text-emerald-200">
                                    {formatNumber(
                                      computeDailyReward(
                                        position.principalFre,
                                        position.product?.apyPercent ?? Number(position.productSnapshot?.apyPercent ?? 0)
                                      )
                                    )}{' '}
                                    FRE
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                className="mt-1 h-11 w-full rounded-xl border-slate-700 text-white hover:bg-slate-800/60 disabled:opacity-40"
                                disabled={redeeming === position.id || isLockedFuture}
                                onClick={() => openWithdrawPrompt(position)}
                              >
                                {redeeming === position.id ? 'Traitement...' : 'Retirer'}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {historicalPositions.length > 0 && (
        <Card className="bg-slate-900/60 border-slate-900 rounded-3xl">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
              <Layers className="h-4 w-4 text-slate-400" />
              Historique
            </div>
            <div className="space-y-2 text-xs text-slate-400">
              {historicalPositions.slice(0, 5).map((position) => (
                <div key={position.id} className="flex items-center justify-between border-b border-slate-800/60 pb-2 last:border-0">
                  <div>
                    <p className="text-sm text-white">{position.product?.title ?? 'Staking'}</p>
                    <p className="text-[11px] text-slate-500">
                      Capital {formatNumber(position.principalFre)} FRE · Clôturé le {formatDateTime(position.redeemedAt)}
                    </p>
                  </div>
                  <Badge variant="outline" className="border-slate-700 text-slate-300">
                    {position.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={Boolean(withdrawSelection)}
        onOpenChange={(open) => {
          if (!open) {
            closeWithdrawPrompt();
          }
        }}
      >
        <DialogContent className="bg-slate-950 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-lg">Montant a retirer</DialogTitle>
          </DialogHeader>
          {withdrawSelection && (
            <div className="space-y-3 text-sm text-slate-300">
              <p>
                Indiquez le montant a retirer de votre position&nbsp;
                <span className="font-semibold text-white">{resolvePositionTitle(withdrawSelection.position)}</span>.
              </p>
              <Input
                type="number"
                className="bg-slate-900 border-slate-800 text-white"
                value={withdrawSelection.amountInput}
                onChange={(event) => handleWithdrawAmountChange(event.target.value)}
                min={0}
                step="0.01"
              />
              <p className="text-[11px] text-slate-500">
                Capital disponible: {formatNumber(withdrawSelection.position.principalFre)} FRE.
              </p>
              {withdrawError && <p className="text-xs text-rose-400">{withdrawError}</p>}
            </div>
          )}
          <div className="mt-4 flex gap-2">
            <Button className="flex-1 rounded-xl bg-slate-800 text-white" variant="ghost" onClick={closeWithdrawPrompt}>
              Annuler
            </Button>
            <Button className="flex-1 rounded-xl bg-emerald-500 text-slate-950" onClick={proceedWithdrawConfirmation}>
              Continuer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(withdrawConfirm)}
        onOpenChange={(open) => {
          if (!open) {
            handleWithdrawConfirmCancel();
          }
        }}
      >
        <AlertDialogContent className="bg-slate-950 border-slate-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">Confirmer le retrait</AlertDialogTitle>
          </AlertDialogHeader>
          {withdrawConfirm && (
            <div className="space-y-2 text-sm text-slate-300">
              <p>
                Vous confirmez retirer{' '}
                <span className="text-emerald-400 font-semibold">
                  {formatNumber(withdrawConfirm.amount)} FRE
                </span>{' '}
                de la position <span className="font-semibold">{resolvePositionTitle(withdrawConfirm.position)}</span> ?
              </p>
              <p className="text-[11px] text-slate-500">
                Le capital sera libere sur votre portefeuille si la position est eligible.
              </p>
            </div>
          )}
          <AlertDialogFooter className="mt-4 flex gap-2">
            <AlertDialogCancel
              className="flex-1 rounded-xl bg-slate-800 text-white hover:bg-slate-700"
              onClick={handleWithdrawConfirmCancel}
            >
              Retour
            </AlertDialogCancel>
            <AlertDialogAction
              className="flex-1 rounded-xl bg-emerald-500 text-slate-950 font-semibold disabled:opacity-40"
              onClick={() => withdrawConfirm && executeRedeem(withdrawConfirm.position, withdrawConfirm.amount)}
              disabled={redeeming === withdrawConfirm?.position.id}
            >
              {redeeming === withdrawConfirm?.position.id ? 'Traitement...' : 'Confirmer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(stakePreview)}
        onOpenChange={(open) => {
          if (!open) {
            closeConfirm();
          }
        }}
      >
        <AlertDialogContent className="bg-slate-950 border-slate-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">Confirmer le staking</AlertDialogTitle>
          </AlertDialogHeader>
          {stakePreview && (
            <div className="space-y-3 text-sm text-slate-300">
              <p>
                Vous allez immobiliser{' '}
                <span className="text-emerald-400 font-semibold">{formatNumber(stakePreview.amount)} FRE</span> sur
                l&rsquo;offre <span className="font-semibold">{stakePreview.product.title}</span> à{' '}
                {stakePreview.product.apyPercent}% APY.
              </p>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-3 text-xs">
                <p>Blocage: {stakePreview.product.isLocked ? `${stakePreview.product.lockPeriodDays} jours` : 'Flexible'}</p>
                <p>Rewards quotidiens à 08h00 (UTC) crédités automatiquement.</p>
                <p>
                  Estimation: ~{formatNumber(computeDailyReward(stakePreview.amount, stakePreview.product.apyPercent))} FRE
                  / jour.
                </p>
                <p>Frais de service: {TRANSFER_FEE_LABEL} débités en complément du capital.</p>
              </div>
            </div>
          )}
          <AlertDialogFooter className="mt-4 flex gap-2">
            <AlertDialogCancel className="flex-1 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              className="flex-1 rounded-xl bg-emerald-500 text-slate-950 font-semibold hover:bg-emerald-400 disabled:opacity-40"
              onClick={confirmStake}
              disabled={!!pendingStake}
            >
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={Boolean(resultModal)}
        onOpenChange={(open) => {
          if (!open) {
            setResultModal(null);
          }
        }}
      >
        <DialogContent className="bg-slate-950 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              {resultModal?.status === 'success' ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-rose-400" />
              )}
              {resultModal?.title}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-300">{resultModal?.message}</p>
          <div className="mt-4 flex justify-end">
            <Button className="rounded-xl bg-slate-800 text-white" onClick={() => setResultModal(null)}>
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};
