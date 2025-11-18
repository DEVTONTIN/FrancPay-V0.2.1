import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import type { PostgrestError } from '@supabase/supabase-js';
import { UtilisateurHeader, type BalanceDisplayCurrency } from '@/components/spaces/utilisateur/UtilisateurHeader';
import { UtilisateurHomeSection, TransactionDisplay } from '@/components/spaces/utilisateur/UtilisateurHomeSection';
import { UtilisateurPaySection } from '@/components/spaces/utilisateur/UtilisateurPaySection';
import { UtilisateurSettingsSection, ProfileFormState } from '@/components/spaces/utilisateur/UtilisateurSettingsSection';
import { ShareDrawer } from '@/components/spaces/utilisateur/ShareDrawer';
import { DepositDrawer } from '@/components/spaces/utilisateur/DepositDrawer';
import { ProfessionalApplicationDrawer } from '@/components/spaces/utilisateur/ProfessionalApplicationDrawer';
import { ProfessionalAccessPortal } from '@/components/spaces/utilisateur/ProfessionalAccessPortal';
import { useOnchainDepositSync } from '@/hooks/useOnchainDepositSync';
import { UtilisateurInvestSection } from '@/components/spaces/utilisateur/UtilisateurInvestSection';
import { TransactionHistoryPage } from '@/components/spaces/utilisateur/TransactionHistorySheet';
import { TransactionDetailDrawer } from '@/components/spaces/utilisateur/TransactionDetailDrawer';
import { SendFundsPage } from '@/components/spaces/utilisateur/SendFundsPage';
import { UtilisateurProfilePage } from '@/components/spaces/utilisateur/UtilisateurProfilePage';
import {
  aggregateStakingRewardRows,
  formatFreAmount,
  formatTransactionTitle,
  mapToTransactionDetail,
  resolveTransactionCategory,
  SupabaseTransactionRow,
  TransactionDetail,
} from '@/components/spaces/utilisateur/transaction-utils';
import { generateReferralCodeFromId } from '@/lib/referral';
import { useFreExchangeRates } from '@/hooks/useFreExchangeRates';

type UtilisateurSection = 'home' | 'invest' | 'settings' | 'pay';

const RECENT_TRANSACTION_DISPLAY_LIMIT = 5;
const RECENT_TRANSACTION_BUFFER_LIMIT = 40;
const supportedCurrencies: BalanceDisplayCurrency[] = ['FRE', 'EUR', 'USDT', 'TON'];
const twoDecimalFormatter = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatSupabaseError = (error: unknown) => {
  if (!error) return 'Une erreur inattendue est survenue.';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (typeof (error as { message?: string }).message === 'string') {
    return (error as { message: string }).message;
  }
  return 'Impossible de valider cette operation.';
};

interface UtilisateurHomeProps {
  activeSection: UtilisateurSection;
  onChangeSection?: (section: UtilisateurSection) => void;
  historyVisible: boolean;
  onHistoryOpen: () => void;
  onHistoryClose: () => void;
  sendVisible: boolean;
  onSendOpen: () => void;
  onSendClose: () => void;
}

export const UtilisateurHome: React.FC<UtilisateurHomeProps> = ({
  activeSection,
  onChangeSection,
  historyVisible,
  onHistoryOpen,
  onHistoryClose,
  sendVisible,
  onSendOpen,
  onSendClose,
}) => {
  const { toast } = useToast();
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string>('');
  const [profileEmail, setProfileEmail] = useState<string>('');
  const [referralCode, setReferralCode] = useState<string>('');
  const [balanceFre, setBalanceFre] = useState<number>(0);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [transfersLocked, setTransfersLocked] = useState(false);
  const [transferLockReason, setTransferLockReason] = useState('');

  const [walletStatus, setWalletStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [walletMessage, setWalletMessage] = useState<string | null>(null);
  const [walletForm, setWalletForm] = useState({ address: '', amount: '', note: '' });

  const [contactStatus, setContactStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [contactFeedback, setContactFeedback] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState({ handle: '', amount: '', note: '' });
  const [transactions, setTransactions] = useState<TransactionDisplay[]>([]);
  const [, setRawTransactions] = useState<SupabaseTransactionRow[]>([]);
  const [aggregatedTransactionRows, setAggregatedTransactionRows] = useState<SupabaseTransactionRow[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [balanceCurrency, setBalanceCurrency] = useState<BalanceDisplayCurrency>('FRE');
  const transactionsLoadedRef = useRef(false);
  const [logoutPending, setLogoutPending] = useState(false);
  const [shareDrawerOpen, setShareDrawerOpen] = useState(false);
  const [depositDrawerOpen, setDepositDrawerOpen] = useState(false);
  const [proApplicationDrawerOpen, setProApplicationDrawerOpen] = useState(false);
  const [proAccessPortalOpen, setProAccessPortalOpen] = useState(false);
  const [proApplicationStatus, setProApplicationStatus] = useState<'idle' | 'pending' | 'approved'>('idle');
  const [proAccessGranted, setProAccessGranted] = useState(false);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [detailTransaction, setDetailTransaction] = useState<TransactionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailTargetId, setDetailTargetId] = useState<string | null>(null);
  const [profilePageOpen, setProfilePageOpen] = useState(false);
  const { rates, loading: ratesLoading, error: ratesError } = useFreExchangeRates();
  const defaultProfileDetails: ProfileFormState = useMemo(
    () => ({
      firstName: '',
      lastName: '',
      birthDate: '',
      email: '',
      phoneNumber: '',
      addressLine1: '',
      addressLine2: '',
      postalCode: '',
      city: '',
      country: '',
    }),
    []
  );
  const [profileDetails, setProfileDetails] = useState<ProfileFormState>(defaultProfileDetails);
  const profileSelectColumns =
    'username,referralCode,email,firstName,lastName,birthDate,phoneNumber,addressLine1,addressLine2,postalCode,city,country';

  const mapTransactionRow = useCallback((tx: SupabaseTransactionRow): TransactionDisplay => {
    const amountValue = Number(tx.amountFre) || 0;
    const metadata =
      tx.metadata && typeof tx.metadata === 'object' && !Array.isArray(tx.metadata)
        ? (tx.metadata as Record<string, unknown>)
        : null;
    const category = resolveTransactionCategory(tx.context, { counterparty: tx.counterparty, metadata });
    const transactionIdsValue = metadata?.transactionIds;
    const sourceTransactionIds = Array.isArray(transactionIdsValue)
      ? transactionIdsValue.filter((value): value is string => typeof value === 'string')
      : undefined;
      return {
        id: tx.id,
        title: formatTransactionTitle(
          tx.context,
          tx.counterparty,
          amountValue,
          (tx.metadata as Record<string, unknown> | null) ?? null
        ),
      amount: amountValue,
      createdAt: tx.createdAt,
      metadata,
      counterparty: tx.counterparty,
      category,
      isAggregate: Boolean(metadata?.aggregated),
      sourceTransactionIds,
    };
  }, []);

  const updateRecentTransactions = useCallback(
    (rows: SupabaseTransactionRow[]) => {
      const aggregatedRows = aggregateStakingRewardRows(rows).slice(0, RECENT_TRANSACTION_DISPLAY_LIMIT);
      setAggregatedTransactionRows(aggregatedRows);
      setTransactions(aggregatedRows.map(mapTransactionRow));
    },
    [mapTransactionRow]
  );

  const ensureProfileRecord = useCallback(
    async (sessionUser: { id: string; email?: string | null; user_metadata?: Record<string, unknown> | undefined }) => {
      if (!sessionUser?.id) return null;
      const usernameMeta =
        typeof sessionUser.user_metadata?.username === 'string' ? sessionUser.user_metadata.username : undefined;
      const fallbackSeed =
        usernameMeta ||
        sessionUser.email?.split('@')[0] ||
        `francpay_${sessionUser.id.replace(/-/g, '').slice(0, 6)}`;
      const normalizeUsername = (value: string) => {
        const trimmed = value.trim().replace(/\s+/g, '_');
        const sanitized = trimmed.replace(/[^a-zA-Z0-9_]/g, '_').replace(/_+/g, '_');
        const bounded = sanitized.slice(0, 20).replace(/^_+|_+$/g, '');
        if (bounded) return bounded;
        return `francpay_${Math.random().toString(36).slice(2, 6)}`;
      };
      const fallbackBase = normalizeUsername(fallbackSeed);
      const fallbackEmail = sessionUser.email || `${fallbackBase}@users.francpay.local`;
      const referredByCode =
        typeof sessionUser.user_metadata?.referral_code === 'string'
          ? sessionUser.user_metadata?.referral_code.toUpperCase()
          : null;
      const buildPayload = (usernameCandidate: string) => ({
        authUserId: sessionUser.id,
        username: usernameCandidate,
        email: fallbackEmail,
        profileType: 'UTILISATEUR' as const,
        referralCode: generateReferralCodeFromId(sessionUser.id),
        referredByCode,
      });

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const candidate =
          attempt === 0
            ? fallbackBase
            : normalizeUsername(`${fallbackBase}_${Math.random().toString(36).slice(2, 6)}`);
        const { data, error } = await supabase
          .from('UserProfile')
          .insert(buildPayload(candidate))
          .select(profileSelectColumns)
          .maybeSingle();
        if (!error) {
          return data;
        }
        const pgError = error as PostgrestError;
        if (pgError.code !== '23505') {
          console.error('ensure_profile_error', pgError);
          break;
        }
      }

      const { data: existing } = await supabase
        .from('UserProfile')
        .select(profileSelectColumns)
        .eq('authUserId', sessionUser.id)
        .maybeSingle();
      return existing || null;
    },
    [profileSelectColumns]
  );

  const refreshProfile = useCallback(async () => {
    setIsProfileLoading(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setAuthUserId(null);
      setUsername('');
      setProfileEmail('');
      setBalanceFre(0);
      setRawTransactions([]);
      setAggregatedTransactionRows([]);
      setTransactions([]);
      setTransactionsLoading(false);
      transactionsLoadedRef.current = false;
      setProfileDetails(defaultProfileDetails);
      setTransfersLocked(false);
      setTransferLockReason('');
      setIsProfileLoading(false);
      return;
    }

    setAuthUserId(session.user.id);
    setProfileEmail(session.user.email || '');
    const emailConfirmed = Boolean(session.user.email_confirmed_at || session.user.confirmed_at);
    setTransfersLocked(!emailConfirmed);
    setTransferLockReason(
      emailConfirmed ? '' : 'Valide ton email pour activer les envois vers les utilisateurs FrancPay ou via TON.'
    );

    if (!transactionsLoadedRef.current) {
      setTransactionsLoading(true);
    }

    const [
      { data: profileData, error: profileError },
      { data: balanceData, error: balanceError },
      { data: txData, error: txError },
      { data: professionalApplicationData, error: professionalApplicationError },
    ] = await Promise.all([
      supabase
        .from('UserProfile')
        .select(profileSelectColumns)
        .eq('authUserId', session.user.id)
        .maybeSingle(),
      supabase.from('UserWalletBalance').select('balanceFre').eq('authUserId', session.user.id).maybeSingle(),
      supabase
        .from('UserPaymentTransaction')
        .select('id,counterparty,amountFre,createdAt,context,metadata')
        .eq('authUserId', session.user.id)
        .order('createdAt', { ascending: false })
        .limit(RECENT_TRANSACTION_BUFFER_LIMIT),
      supabase
        .from('ProfessionalApplication')
        .select('status')
        .eq('authUserId', session.user.id)
        .order('submittedAt', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    let resolvedProfile = profileData;
    if (profileError) {
      console.error('Erreur profil', profileError);
    }
    if (!resolvedProfile) {
      resolvedProfile = await ensureProfileRecord(session.user);
    }
    if (resolvedProfile) {
      if (resolvedProfile.username) {
        setUsername(resolvedProfile.username);
      }
      let referralValue = resolvedProfile.referralCode;
      if (!referralValue) {
        const fallbackReferralCode = generateReferralCodeFromId(session.user.id);
        const { data: updatedReferral, error: referralUpdateError } = await supabase
          .from('UserProfile')
          .update({ referralCode: fallbackReferralCode })
          .eq('authUserId', session.user.id)
          .select('referralCode')
          .maybeSingle();
        if (referralUpdateError) {
          console.error('Erreur assignation referral', referralUpdateError);
        }
        referralValue = updatedReferral?.referralCode || fallbackReferralCode;
      }
      setReferralCode(referralValue);
      const resolvedEmail = resolvedProfile.email || session.user.email || `${session.user.id.slice(0, 6)}@users.francpay.local`;
      setProfileEmail(resolvedEmail);
      setProfileDetails({
        firstName: resolvedProfile.firstName ?? '',
        lastName: resolvedProfile.lastName ?? '',
        birthDate: resolvedProfile.birthDate ?? '',
        email: resolvedEmail,
        phoneNumber: resolvedProfile.phoneNumber ?? '',
        addressLine1: resolvedProfile.addressLine1 ?? '',
        addressLine2: resolvedProfile.addressLine2 ?? '',
        postalCode: resolvedProfile.postalCode ?? '',
        city: resolvedProfile.city ?? '',
        country: resolvedProfile.country ?? '',
      });
    } else {
      const fallbackEmail = session.user.email || `${session.user.id.slice(0, 6)}@users.francpay.local`;
      setProfileEmail(fallbackEmail);
    }

    if (balanceError) {
      console.error('Erreur balance', balanceError);
    } else if (balanceData?.balanceFre !== undefined && balanceData?.balanceFre !== null) {
      setBalanceFre(Number(balanceData.balanceFre));
    }

    if (txError) {
      console.error('Erreur transactions', txError);
      setRawTransactions([]);
      setAggregatedTransactionRows([]);
      setTransactions([]);
    } else if (txData) {
      setRawTransactions(txData);
      updateRecentTransactions(txData);
    } else {
      setRawTransactions([]);
      setAggregatedTransactionRows([]);
      setTransactions([]);
    }

    if (professionalApplicationError) {
      console.error('Erreur statut dossier pro', professionalApplicationError);
    }
    const applicationStatus = professionalApplicationData?.status;
    if (applicationStatus === 'APPROVED') {
      setProApplicationStatus('approved');
      setProAccessGranted(true);
    } else if (applicationStatus === 'PENDING') {
      setProApplicationStatus('pending');
      setProAccessGranted(false);
    } else if (applicationStatus === 'REJECTED' || !applicationStatus) {
      setProApplicationStatus('idle');
      setProAccessGranted(false);
    }

    if (!transactionsLoadedRef.current) {
      setTransactionsLoading(false);
      transactionsLoadedRef.current = true;
    }
    setIsProfileLoading(false);
  }, [defaultProfileDetails, ensureProfileRecord, updateRecentTransactions]);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedStatus = localStorage.getItem('francpay_pro_application_status');
    if (storedStatus === 'pending' || storedStatus === 'approved') {
      setProApplicationStatus(storedStatus);
    }
    const storedAccess = localStorage.getItem('francpay_pro_access_granted');
    if (storedAccess === 'true') {
      setProAccessGranted(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (proApplicationStatus === 'idle') {
      localStorage.removeItem('francpay_pro_application_status');
      return;
    }
    localStorage.setItem('francpay_pro_application_status', proApplicationStatus);
  }, [proApplicationStatus]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('francpay_pro_access_granted', proAccessGranted ? 'true' : 'false');
  }, [proAccessGranted]);


  const handleMerchantPayment = useCallback(
    async (payload: { reference: string; amount: string; tag?: string; name?: string }) => {
      const amountValue = Number(payload.amount) || 0;
      if (!payload.reference || amountValue <= 0) {
        return { success: false, message: 'Reference commercant ou montant invalide.' };
      }
      try {
        const { error } = await supabase.rpc('rpc_user_merchant_payment', {
          p_reference: payload.reference,
          p_amount_fre: amountValue,
          p_tag: payload.tag || null,
          p_metadata: {
            merchantName: payload.name,
            initiatedFrom: 'utilisateur_app',
          },
        });
        if (error) throw error;
        await refreshProfile();
        return { success: true, message: 'Paiement commercant valide.' };
      } catch (rpcError) {
        console.error('merchant_payment_error', rpcError);
        return { success: false, message: formatSupabaseError(rpcError) };
      }
    },
    [refreshProfile]
  );

  const handleProfessionalApplicationSubmitted = useCallback(
    (status: 'pending' | 'approved') => {
      setProApplicationStatus(status);
      if (status === 'approved') {
        setProAccessGranted(true);
        setProAccessPortalOpen(true);
      }
    },
    []
  );

  const handleWalletClose = useCallback(() => {
    setWalletStatus('idle');
    setWalletMessage(null);
    setWalletForm({ address: '', amount: '', note: '' });
  }, []);

  const handleContactClose = useCallback(() => {
    setContactStatus('idle');
    setContactFeedback(null);
    setContactForm({ handle: '', amount: '', note: '' });
  }, []);

  const handleWalletConfirm = useCallback(async () => {
    const amountValue = Number(walletForm.amount) || 0;
    if (!walletForm.address || amountValue <= 0) {
      setWalletStatus('error');
      setWalletMessage('Indique une adresse TON valide et un montant positif.');
      return;
    }
    try {
      setWalletStatus('pending');
      setWalletMessage(null);
      const { error } = await supabase.rpc('rpc_user_wallet_payment', {
        p_wallet_address: walletForm.address.trim(),
        p_amount_fre: amountValue,
        p_note: walletForm.note || null,
        p_metadata: {
          initiatedFrom: 'utilisateur_app',
        },
      });
      if (error) throw error;
      setWalletStatus('success');
      setWalletMessage('Paiement transmis au wallet TON.');
      await refreshProfile();
    } catch (rpcError) {
      console.error('wallet_payment_error', rpcError);
      setWalletStatus('error');
      setWalletMessage(formatSupabaseError(rpcError));
    }
  }, [walletForm.address, walletForm.amount, walletForm.note, refreshProfile]);

  const handleWalletError = () => {
    setWalletStatus('error');
    setWalletMessage('Paiement annule.');
  };

  const handleContactConfirm = useCallback(async () => {
    const amountValue = Number(contactForm.amount) || 0;
    if (!contactForm.handle || amountValue <= 0) {
      setContactStatus('error');
      setContactFeedback('Identifiant et montant requis.');
      return;
    }
    try {
      setContactStatus('pending');
      setContactFeedback(null);
      const { error } = await supabase.rpc('rpc_transfer_between_users', {
        p_handle: contactForm.handle,
        p_amount: amountValue,
        p_note: contactForm.note || null,
      });
      if (error) throw error;
      setContactStatus('success');
      setContactFeedback('Transfert effectue et recu.');
      await refreshProfile();
    } catch (error) {
      console.error('Transfer contact error', error);
      setContactStatus('error');
      setContactFeedback(formatSupabaseError(error));
    }
  }, [contactForm.handle, contactForm.amount, contactForm.note, refreshProfile]);

  const handleContactError = () => {
    setContactStatus('error');
    setContactFeedback('Action annulee.');
  };

  const verifyContactHandle = useCallback(
    async (handle: string) => {
      const normalized = handle.replace(/^@/, '').trim().toLowerCase();
      if (!normalized) return false;
      const { data, error } = await supabase.rpc('verify_user_handle', {
        p_handle: handle,
      });
      if (error) {
        console.error('verify_contact_handle_error', error);
        return false;
      }
      return Boolean(data);
    },
    []
  );

  const convertedBalanceValue = useMemo(() => {
    if (balanceCurrency === 'FRE') {
      return balanceFre;
    }
    if (!rates) {
      return null;
    }
    switch (balanceCurrency) {
      case 'EUR':
        return balanceFre * rates.priceUsd * rates.usdToEur;
      case 'USDT':
        return balanceFre * rates.priceUsd;
      case 'TON':
        return balanceFre * rates.priceTon;
      default:
        return balanceFre;
    }
  }, [balanceCurrency, balanceFre, rates]);

  const [balanceWhole, balanceCents] = useMemo(() => {
    if (balanceCurrency !== 'FRE' && convertedBalanceValue === null) {
      return ['--', '--'];
    }
    if (balanceCurrency === 'FRE') {
      const formatted = formatFreAmount(balanceFre);
      const parts = formatted.split(',');
      return [parts[0], parts[1] ?? '00'];
    }
    const formatted = twoDecimalFormatter.format(convertedBalanceValue ?? 0);
    const parts = formatted.split(',');
    return [parts[0], parts[1] ?? '00'];
  }, [balanceCurrency, balanceFre, convertedBalanceValue]);

  const currencyMenuOptions = useMemo(
    () =>
      supportedCurrencies.map((currency) => ({
        id: currency,
        label:
          currency === 'FRE'
            ? 'Franc numerique (FRE)'
            : currency === 'EUR'
              ? 'Euro (EUR)'
              : currency === 'USDT'
                ? 'Tether (USDT)'
                : 'Toncoin (TON)',
        description:
          currency === 'FRE'
            ? 'Solde natif'
            : currency === 'EUR'
              ? 'Conversion USD->EUR'
              : currency === 'USDT'
                ? 'Base sur le prix GeckoTerminal'
                : 'Base sur la paire TON GeckoTerminal',
        disabled: currency !== 'FRE' && !rates,
      })),
    [rates]
  );

  const currencyHint = useMemo(() => {
    if (rates) {
      const usd = rates.priceUsd >= 0.01 ? rates.priceUsd.toFixed(4) : rates.priceUsd.toFixed(6);
      const ton = rates.priceTon >= 0.01 ? rates.priceTon.toFixed(6) : rates.priceTon.toFixed(8);
      return `1 FRE ~ ${usd} $ / ${ton} TON`;
    }
    if (ratesError) {
      return ratesError;
    }
    if (ratesLoading) {
      return 'Chargement du cours du FRE...';
    }
    return null;
  }, [rates, ratesError, ratesLoading]);

  const depositTag = useMemo(() => {
    if (referralCode) return referralCode;
    if (authUserId) return `FRP-${authUserId.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
    return undefined;
  }, [referralCode, authUserId]);

  useEffect(() => {
    if (!rates && balanceCurrency !== 'FRE') {
      setBalanceCurrency('FRE');
    }
  }, [rates, balanceCurrency]);

  useOnchainDepositSync({
    enabled: Boolean(authUserId),
    onDeposit: refreshProfile,
  });

  const handleCurrencyChange = useCallback(
    (nextCurrency: BalanceDisplayCurrency) => {
      if (nextCurrency !== 'FRE' && !rates) {
        return;
      }
      setBalanceCurrency(nextCurrency);
    },
    [rates]
  );

  useEffect(() => {
    if (!authUserId) return;

    const channel = supabase
      .channel(`utilisateur-home-${authUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'UserWalletBalance',
          filter: `authUserId=eq.${authUserId}`,
        },
        (payload) => {
          const balanceRecordNew = payload.new as { balanceFre?: number } | null;
          const balanceRecordOld = payload.old as { balanceFre?: number } | null;
          const balanceValue = balanceRecordNew?.balanceFre ?? balanceRecordOld?.balanceFre;
          if (balanceValue === undefined || balanceValue === null) return;
          setBalanceFre(Number(balanceValue));
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'UserPaymentTransaction',
          filter: `authUserId=eq.${authUserId}`,
        },
        (payload) => {
          const updatedRow = (payload.new || payload.old) as SupabaseTransactionRow | null;
          if (!updatedRow) return;

          setRawTransactions((prev) => {
            let nextRows: SupabaseTransactionRow[];
            if (payload.eventType === 'DELETE') {
              nextRows = prev.filter((row) => row.id !== updatedRow.id);
            } else if (payload.eventType === 'UPDATE') {
              nextRows = prev.map((row) => (row.id === updatedRow.id ? updatedRow : row));
            } else {
              nextRows = [updatedRow, ...prev];
            }
            const ordered = nextRows
              .slice()
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, RECENT_TRANSACTION_BUFFER_LIMIT);
            updateRecentTransactions(ordered);
            return ordered;
          });
          setTransactionsLoading(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authUserId, updateRecentTransactions]);

  const handleLogoutConfirm = useCallback(async () => {
    setLogoutPending(true);
    await supabase.auth.signOut();
    setLogoutPending(false);
    setAuthUserId(null);
    setUsername('');
    setProfileEmail('');
    setBalanceFre(0);
    setRawTransactions([]);
    setAggregatedTransactionRows([]);
    setTransactions([]);
    setTransactionsLoading(false);
    transactionsLoadedRef.current = false;
    setProfileDetails(defaultProfileDetails);
  }, [defaultProfileDetails]);

  useEffect(() => {
    if (!depositDrawerOpen) return;
    const intervalId = window.setInterval(() => {
      refreshProfile();
    }, 5000);
    return () => window.clearInterval(intervalId);
  }, [depositDrawerOpen, refreshProfile]);

  const handleManualDepositRefresh = useCallback(() => {
    refreshProfile();
  }, [refreshProfile]);

  const handleOpenSendPage = useCallback(() => {
    if (transfersLocked) {
      toast({
        title: 'Envoi verrouillé',
        description: transferLockReason || 'Valide ton email pour débloquer cette action.',
        variant: 'destructive',
      });
      return;
    }
    onSendOpen();
  }, [transfersLocked, transferLockReason, onSendOpen, toast]);

  const handleSendPageClose = useCallback(() => {
    onSendClose();
    handleContactClose();
    handleWalletClose();
  }, [onSendClose, handleContactClose, handleWalletClose]);

  useEffect(() => {
    if (transfersLocked && sendVisible) {
      onSendClose();
      handleContactClose();
      handleWalletClose();
    }
  }, [transfersLocked, sendVisible, onSendClose, handleContactClose, handleWalletClose]);

  const openTransactionDetail = useCallback(
    async (transactionId: string, preset?: TransactionDetail) => {
      if (!transactionId) return;
      setDetailTargetId(transactionId);
      setDetailDrawerOpen(true);
      setDetailError(null);
      if (preset) {
        setDetailTransaction(preset);
        setDetailLoading(false);
        return;
      }
      setDetailLoading(true);
      setDetailTransaction(null);
      try {
        const { data, error } = await supabase
          .from('UserPaymentTransaction')
          .select('id,context,counterparty,amountFre,feeFre,metadata,createdAt')
          .eq('id', transactionId)
          .maybeSingle();
        if (error || !data) {
          throw error || new Error('transaction_not_found');
        }
        setDetailTransaction(mapToTransactionDetail(data));
      } catch (detailError) {
        console.error('Transaction detail error', detailError);
        setDetailError('Impossible de charger les détails de la transaction.');
      } finally {
        setDetailLoading(false);
      }
    },
    []
  );

  const handleRecentTransactionSelect = useCallback(
    (tx: TransactionDisplay) => {
      if (tx.isAggregate) {
        const sourceRow = aggregatedTransactionRows.find((row) => row.id === tx.id);
        if (sourceRow) {
          openTransactionDetail(sourceRow.id, mapToTransactionDetail(sourceRow));
          return;
        }
        const fallbackDetail: TransactionDetail = {
          id: tx.id,
          context: 'staking_reward_aggregate',
          counterparty: tx.counterparty || 'Staking',
          amount: tx.amount,
          fee: 0,
          createdAt: tx.createdAt,
          metadata: tx.metadata ?? null,
          category: tx.category ?? 'staking',
          direction: tx.amount > 0 ? 'in' : tx.amount < 0 ? 'out' : 'neutral',
          title: tx.title,
        };
        openTransactionDetail(tx.id, fallbackDetail);
        return;
      }
      openTransactionDetail(tx.id);
    },
    [aggregatedTransactionRows, openTransactionDetail]
  );

const closeTransactionDetail = useCallback(() => {
  setDetailDrawerOpen(false);
  setDetailTransaction(null);
  setDetailError(null);
  setDetailTargetId(null);
}, []);

  const handleProfileSave = useCallback(
    async (nextProfile: ProfileFormState) => {
      if (!authUserId) {
        return { success: false, message: 'Connexion requise.' };
      }
      const updatePayload = {
        firstName: nextProfile.firstName || null,
        lastName: nextProfile.lastName || null,
        birthDate: nextProfile.birthDate || null,
        phoneNumber: nextProfile.phoneNumber || null,
        addressLine1: nextProfile.addressLine1 || null,
        addressLine2: nextProfile.addressLine2 || null,
        postalCode: nextProfile.postalCode || null,
        city: nextProfile.city || null,
        country: nextProfile.country || null,
        email: nextProfile.email || null,
        updatedAt: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from('UserProfile')
        .update(updatePayload)
        .eq('authUserId', authUserId)
        .select(profileSelectColumns)
        .maybeSingle();
      if (error) {
        console.error('profile_update_error', error);
        return { success: false, message: 'Impossible de mettre à jour le profil.' };
      }
      const normalized: ProfileFormState = {
        firstName: data?.firstName ?? '',
        lastName: data?.lastName ?? '',
        birthDate: data?.birthDate ?? '',
        email: data?.email ?? '',
        phoneNumber: data?.phoneNumber ?? '',
        addressLine1: data?.addressLine1 ?? '',
        addressLine2: data?.addressLine2 ?? '',
        postalCode: data?.postalCode ?? '',
        city: data?.city ?? '',
        country: data?.country ?? '',
      };
      setProfileDetails(normalized);
      if (normalized.email) {
        setProfileEmail(normalized.email);
      }
      return { success: true, message: 'Profil mis à jour.' };
    },
    [authUserId]
  );

  const handleHistoryTransactionSelect = useCallback(
    (tx: TransactionDetail) => {
      openTransactionDetail(tx.id, tx);
    },
    [openTransactionDetail]
  );

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-slate-900 to-slate-950 text-white py-4 px-4 pb-28">
        <div className="max-w-md mx-auto space-y-6">
          <UtilisateurHeader
            username={username || (isProfileLoading ? 'Chargement...' : 'FrancPay')}
            showBalance={activeSection === 'home'}
            balanceWhole={balanceWhole}
            balanceCents={balanceCents}
            balanceCurrency={balanceCurrency}
            onChangeCurrency={handleCurrencyChange}
            currencyOptions={currencyMenuOptions}
            conversionHint={currencyHint}
            onOpenProApplication={() => setProApplicationDrawerOpen(true)}
            onOpenProPortal={() => setProAccessPortalOpen(true)}
            proApplicationStatus={proApplicationStatus}
            proAccessGranted={proAccessGranted}
          />

          {activeSection === 'home' && (
            <UtilisateurHomeSection
              transactions={transactions}
              isLoading={transactionsLoading}
              onShare={() => setShareDrawerOpen(true)}
              onDeposit={() => setDepositDrawerOpen(true)}
              onShowHistory={onHistoryOpen}
              onSelectTransaction={handleRecentTransactionSelect}
              onOpenSettings={() => onChangeSection?.('settings')}
              onOpenSendPage={handleOpenSendPage}
              sendDisabled={transfersLocked}
              sendDisabledReason={transferLockReason}
            />
          )}

      {activeSection === 'pay' && (
        <UtilisateurPaySection
          onPersistTransaction={handleMerchantPayment}
        />
      )}

          {activeSection === 'invest' && (
            <UtilisateurInvestSection
              authUserId={authUserId}
              balanceFre={balanceFre}
              onRefreshWallet={refreshProfile}
            />
          )}

          {activeSection === 'settings' && (
            <UtilisateurSettingsSection
              profileName={username || 'FrancPay'}
              profileEmail={profileEmail}
              profileDetails={profileDetails}
              onLogoutConfirm={handleLogoutConfirm}
              logoutPending={logoutPending}
              onOpenProfilePage={() => setProfilePageOpen(true)}
            />
          )}
      </div>
    </div>

      <TransactionHistoryPage
        visible={historyVisible}
        authUserId={authUserId}
        onClose={onHistoryClose}
        onSelectTransaction={handleHistoryTransactionSelect}
      />

      <UtilisateurProfilePage
        open={profilePageOpen}
        onClose={() => setProfilePageOpen(false)}
        profileName={username || 'FrancPay'}
        profileEmail={profileEmail}
        profileDetails={profileDetails}
        onSaveProfile={handleProfileSave}
      />

      <SendFundsPage
        visible={sendVisible}
        onClose={handleSendPageClose}
        contactForm={contactForm}
        contactStatus={contactStatus}
        contactStatusMessage={contactFeedback}
        onContactChange={setContactForm}
        onContactConfirm={handleContactConfirm}
        onContactError={handleContactError}
        onValidateRecipient={verifyContactHandle}
        onResetContact={handleContactClose}
        walletForm={walletForm}
        walletStatus={walletStatus}
        walletStatusMessage={walletMessage}
        onWalletChange={setWalletForm}
        onWalletConfirm={handleWalletConfirm}
        onWalletError={handleWalletError}
        onResetWallet={handleWalletClose}
      />

      <TransactionDetailDrawer
        open={detailDrawerOpen}
        onClose={closeTransactionDetail}
        transaction={detailTransaction}
        isLoading={detailLoading}
        error={detailError}
        onReload={detailTargetId ? () => openTransactionDetail(detailTargetId) : undefined}
      />

      <ShareDrawer open={shareDrawerOpen} onClose={() => setShareDrawerOpen(false)} referralCode={referralCode} />

      <DepositDrawer
        open={depositDrawerOpen}
        onClose={() => setDepositDrawerOpen(false)}
        depositTag={depositTag}
        onManualRefresh={handleManualDepositRefresh}
      />
      <ProfessionalApplicationDrawer
        open={proApplicationDrawerOpen}
        onClose={() => setProApplicationDrawerOpen(false)}
        onSubmitted={handleProfessionalApplicationSubmitted}
        authUserId={authUserId}
        profileEmail={profileEmail}
      />
      <ProfessionalAccessPortal
        open={proAccessPortalOpen}
        onClose={() => setProAccessPortalOpen(false)}
        onNavigate={(target) => {
          const section = target === 'funds' ? 'dashboard' : 'encaissement';
          const destination = `/?space=professional&section=${section}`;
          window.location.href = destination;
        }}
      />
    </>
  );
};
