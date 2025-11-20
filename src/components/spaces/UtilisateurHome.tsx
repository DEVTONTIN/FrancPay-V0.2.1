import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

import { supabase } from '@/lib/supabaseClient';

import { useToast } from '@/hooks/use-toast';

import type { PostgrestError } from '@supabase/supabase-js';

import { UtilisateurHeader, type BalanceDisplayCurrency } from '@/components/spaces/utilisateur/UtilisateurHeader';

import { UtilisateurHomeSection, TransactionDisplay } from '@/components/spaces/utilisateur/UtilisateurHomeSection';

import { UtilisateurPaySection } from '@/components/spaces/utilisateur/UtilisateurPaySection';

import { UtilisateurSettingsSection, ProfileFormState } from '@/components/spaces/utilisateur/UtilisateurSettingsSection';

import { ShareDrawer } from '@/components/spaces/utilisateur/ShareDrawer';

import { DepositDrawer } from '@/components/spaces/utilisateur/DepositDrawer';

import { useOnchainDepositSync } from '@/hooks/useOnchainDepositSync';

import { UtilisateurInvestSection } from '@/components/spaces/utilisateur/UtilisateurInvestSection';

import { TransactionHistoryPage } from '@/components/spaces/utilisateur/TransactionHistorySheet';

import { TransactionDetailDrawer } from '@/components/spaces/utilisateur/TransactionDetailDrawer';

import { SendFundsPage } from '@/components/spaces/utilisateur/SendFundsPage';

import { UtilisateurProfilePage } from '@/components/spaces/utilisateur/UtilisateurProfilePage';

import { TransferPinSetupDialog } from '@/components/spaces/utilisateur/TransferPinSetupDialog';

import { TransferPinPromptDialog } from '@/components/spaces/utilisateur/TransferPinPromptDialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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



const PIN_SESSION_TIMEOUT_MS = 5 * 60 * 1000;
const PIN_SESSION_TOKEN_KEY = 'francpay_pin_session_token';
const PIN_SESSION_TIME_KEY = 'francpay_pin_session_timestamp';



const formatSupabaseError = (error: unknown) => {

  if (!error) return 'Une erreur inattendue est survenue.';

  if (typeof error === 'string') return error;

  if (error instanceof Error) return error.message;

  if (typeof (error as { message?: string }).message === 'string') {

    return (error as { message: string }).message;

  }

  return 'Impossible de valider cette operation.';

};



type PinActionResult = { success: boolean; message?: string };

type TransferResultDialogState = {
  type: 'success' | 'error';
  title: string;
  description: string;
};



const interpretPinErrorMessage = (message?: string | null) => {

  if (!message) return 'Code securite invalide.';

  if (message.includes('invalid_pin')) {

    return 'Code securite incorrect.';

  }

  if (message.includes('pin_not_configured')) {

    return 'Active ton code securite avant denvoyer des fonds.';

  }

  if (message.includes('pin_required')) {

    return 'Entre ton code securite a 4 chiffres.';

  }

  if (message.includes('pin_locked')) {

    return 'Code verrouille apres trop de tentatives. Reessaie dans quelques minutes.';

  }

  if (message.includes('email_not_confirmed')) {

    return 'Valide ton email pour activer les transactions.';

  }

  if (message.includes('transfer_limit_exceeded')) {

    return 'Montant au-dessus de la limite par transaction.';

  }

  if (message.includes('transfer_daily_limit_exceeded')) {

    return 'Limite journaliere atteinte. Reessaie plus tard.';

  }

  return message;

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

  const [transferResultDialog, setTransferResultDialog] = useState<TransferResultDialogState | null>(null);

  const [pinSetupRequired, setPinSetupRequired] = useState(false);

  const [pinSetupPending, setPinSetupPending] = useState(false);

  const [pinSetupError, setPinSetupError] = useState<string | null>(null);

  const [transactions, setTransactions] = useState<TransactionDisplay[]>([]);

  const [, setRawTransactions] = useState<SupabaseTransactionRow[]>([]);

  const [aggregatedTransactionRows, setAggregatedTransactionRows] = useState<SupabaseTransactionRow[]>([]);

  const [transactionsLoading, setTransactionsLoading] = useState(true);

  const [balanceCurrency, setBalanceCurrency] = useState<BalanceDisplayCurrency>('FRE');

  const transactionsLoadedRef = useRef(false);

  const lastActivityRef = useRef<number>(Date.now());

  const [logoutPending, setLogoutPending] = useState(false);

  const [shareDrawerOpen, setShareDrawerOpen] = useState(false);

  const [depositDrawerOpen, setDepositDrawerOpen] = useState(false);

  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);

  const [detailTransaction, setDetailTransaction] = useState<TransactionDetail | null>(null);

  const [detailLoading, setDetailLoading] = useState(false);

  const [detailError, setDetailError] = useState<string | null>(null);

  const [detailTargetId, setDetailTargetId] = useState<string | null>(null);

  const [profilePageOpen, setProfilePageOpen] = useState(false);

  const [hasTransferPin, setHasTransferPin] = useState(false);

  const [pinSessionVerifiedAt, setPinSessionVerifiedAt] = useState<number | null>(null);

  const [pinSessionPromptOpen, setPinSessionPromptOpen] = useState(false);

  const [pinSessionPending, setPinSessionPending] = useState(false);

  const [pinSessionError, setPinSessionError] = useState<string | null>(null);

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

    'username,referralCode,email,firstName,lastName,birthDate,phoneNumber,addressLine1,addressLine2,postalCode,city,country,transferPinSetAt';



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



  const refreshProfile = useCallback(async (options?: { silent?: boolean }) => {

    const silentRefresh = Boolean(options?.silent);

    if (!silentRefresh) {

      setIsProfileLoading(true);

    }

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

      setPinSetupRequired(false);

      setPinSetupPending(false);

      setPinSetupError(null);

      setHasTransferPin(false);

      setPinSessionVerifiedAt(null);

      setPinSessionPromptOpen(false);

      setPinSessionError(null);

      setPinSessionPending(false);

      if (!silentRefresh) {

        setIsProfileLoading(false);

      }

      return;

    }



    setAuthUserId(session.user.id);

    setProfileEmail(session.user.email || '');

    const emailConfirmed = Boolean(session.user.email_confirmed_at || session.user.confirmed_at);

    let nextTransfersLocked = !emailConfirmed;

    let nextTransferLockReason = emailConfirmed

      ? ''

      : 'Valide ton email pour activer les envois vers les utilisateurs FrancPay ou via TON.';



    if (!transactionsLoadedRef.current) {

      setTransactionsLoading(true);

    }



  const [

      { data: profileData, error: profileError },

      { data: balanceData, error: balanceError },

      { data: txData, error: txError },

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

    ]);



    let resolvedProfile = profileData;

    if (profileError) {

      console.error('Erreur profil', profileError);

    }

    if (!resolvedProfile) {

      resolvedProfile = await ensureProfileRecord(session.user);

    }



    const hasTransferPinValue = Boolean(resolvedProfile?.transferPinSetAt);

    setHasTransferPin(hasTransferPinValue);

    setPinSetupRequired(!hasTransferPinValue);

    if (hasTransferPinValue) {

      setPinSetupError(null);

      const sessionToken = (session as { access_token?: string }).access_token || null;
      const storedToken = localStorage.getItem(PIN_SESSION_TOKEN_KEY);
      const storedTs = Number(localStorage.getItem(PIN_SESSION_TIME_KEY) || '0');
      const sameSession = sessionToken && storedToken === sessionToken;
      const withinWindow = storedTs > 0 && Date.now() - storedTs < PIN_SESSION_TIMEOUT_MS;

      if (sameSession && withinWindow) {
        setPinSessionVerifiedAt(storedTs);
        setPinSessionPromptOpen(false);
      } else {
        setPinSessionVerifiedAt(null);
        if (!sameSession && sessionToken) {
          setPinSessionPromptOpen(true); // nouvelle connexion
        } else {
          setPinSessionPromptOpen(false); // simple reload sans session nouvelle
        }
        localStorage.removeItem(PIN_SESSION_TIME_KEY);
        localStorage.removeItem(PIN_SESSION_TOKEN_KEY);
      }

      setPinSessionError(null);

    } else {

      setPinSessionVerifiedAt(null);

      setPinSessionPromptOpen(false);

      setPinSessionError(null);

    }

    if (emailConfirmed) {

      nextTransfersLocked = !hasTransferPinValue;

      nextTransferLockReason = hasTransferPinValue

        ? ''

        : 'Ajoute un code securite a 4 chiffres pour activer les envois et paiements.';

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



    setTransfersLocked(nextTransfersLocked);

    setTransferLockReason(nextTransferLockReason);



    if (!transactionsLoadedRef.current) {

      setTransactionsLoading(false);

      transactionsLoadedRef.current = true;

    }

    if (!silentRefresh) {

      setIsProfileLoading(false);

    }

  }, [defaultProfileDetails, ensureProfileRecord, updateRecentTransactions]);



  useEffect(() => {

    refreshProfile();

  }, [refreshProfile]);

  useEffect(() => {

    if (!authUserId) return;

    let refreshTimeout: number | null = null;

    const triggerSilentRefresh = () => {

      if (refreshTimeout) return;

      refreshTimeout = window.setTimeout(() => {

        refreshTimeout = null;

        refreshProfile({ silent: true });

      }, 300);

    };

    const channel = supabase

      .channel(`user-transfer-refresh-${authUserId}`)

      .on(

        'postgres_changes',

        { event: 'INSERT', schema: 'public', table: 'UserPaymentTransaction', filter: `authUserId=eq.${authUserId}` },

        triggerSilentRefresh

      )

      .subscribe();

    return () => {

      if (refreshTimeout) {

        window.clearTimeout(refreshTimeout);

      }

      supabase.removeChannel(channel);

    };

  }, [authUserId, refreshProfile]);

  useEffect(() => {
    if (!authUserId) return;

    const channel = supabase
      .channel(`onchain-deposit-${authUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'OnchainDeposit',
          filter: `authUserId=eq.${authUserId}`,
        },
        (payload) => {
          const nextStatus =
            (payload.new as { status?: string } | null)?.status ||
            (payload.old as { status?: string } | null)?.status;
          if (nextStatus && nextStatus.toUpperCase() === 'CREDITED') {
            refreshProfile({ silent: true });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authUserId, refreshProfile]);



  useEffect(() => {

    const handleActivity = () => {

      lastActivityRef.current = Date.now();

    };

    window.addEventListener('mousemove', handleActivity);

    window.addEventListener('keydown', handleActivity);

    window.addEventListener('click', handleActivity);

    window.addEventListener('touchstart', handleActivity);

    return () => {

      window.removeEventListener('mousemove', handleActivity);

      window.removeEventListener('keydown', handleActivity);

      window.removeEventListener('click', handleActivity);

      window.removeEventListener('touchstart', handleActivity);

    };

  }, []);



  useEffect(() => {

    if (!pinSessionVerifiedAt) return;

    const watcher = window.setInterval(() => {

      if (!pinSessionVerifiedAt) return;

      if (Date.now() - lastActivityRef.current >= PIN_SESSION_TIMEOUT_MS) {

        setPinSessionVerifiedAt(null);

        setPinSessionPromptOpen(true);

        setPinSessionError('Session verrouillee apres 5 minutes sans activite. Entre ton code pour continuer.');

        localStorage.removeItem(PIN_SESSION_TIME_KEY);

        localStorage.removeItem(PIN_SESSION_TOKEN_KEY);

      }

    }, 15000);

    return () => window.clearInterval(watcher);

  }, [pinSessionVerifiedAt]);



  useEffect(() => {

    if (!hasTransferPin || pinSetupRequired) {

      setPinSessionPromptOpen(false);

    }

  }, [hasTransferPin, pinSetupRequired]);




  const handleMerchantPayment = useCallback(

    async (payload: { reference: string; amount: string; tag?: string; name?: string; pin: string }) => {

      const amountValue = Number(payload.amount) || 0;

      const sanitizedPin = payload.pin.replace(/\D/g, '');

      if (!payload.reference || amountValue <= 0) {

        return { success: false, message: 'Reference commercant ou montant invalide.' };

      }

      if (sanitizedPin.length !== 4) {

        return { success: false, message: 'Entre ton code securite a 4 chiffres.' };

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

          p_pin: sanitizedPin,

        });

        if (error) throw error;

        await refreshProfile();

        return { success: true, message: 'Paiement commercant valide.' };

      } catch (rpcError) {

        console.error('merchant_payment_error', rpcError);

        const formatted = interpretPinErrorMessage(formatSupabaseError(rpcError));

        return { success: false, message: formatted };

      }

    },

    [refreshProfile]

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



  const closeSendExperience = useCallback(() => {

    onSendClose();

    handleContactClose();

    handleWalletClose();

  }, [onSendClose, handleContactClose, handleWalletClose]);



  const handlePinSetupSubmit = useCallback(

    async (pinValue: string) => {

      if (!authUserId) {

        setPinSetupError('Connexion requise pour enregistrer ton code.');

        return;

      }

      const normalizedPin = pinValue.replace(/\D/g, '').slice(0, 4);

      if (normalizedPin.length !== 4) {

        setPinSetupError('Le code doit contenir exactement 4 chiffres.');

        return;

      }

      setPinSetupPending(true);

      setPinSetupError(null);

      try {

        const { error } = await supabase.rpc('rpc_set_transfer_pin', {

          p_pin: normalizedPin,

        });

        if (error) throw error;

        setPinSetupRequired(false);

        toast({

          title: 'Code securite active',

          description: 'Tu peux maintenant confirmer tes envois FrancPay.',

        });

        await refreshProfile();

      } catch (rpcError) {

        console.error('transfer_pin_setup_error', rpcError);

        const errorMessage = formatSupabaseError(rpcError);

        if (errorMessage === 'invalid_pin_format') {

          setPinSetupError('Le code doit contenir exactement 4 chiffres.');

        } else if (errorMessage === 'user_profile_missing') {

          setPinSetupError('Impossible de trouver ton profil FrancPay.');

        } else {

          setPinSetupError(errorMessage);

        }

      } finally {

        setPinSetupPending(false);

      }

    },

    [authUserId, refreshProfile, toast]

  );



  const handleWalletConfirm = useCallback(

    async (pin: string): Promise<PinActionResult> => {

      const amountValue = Number(walletForm.amount) || 0;

      const targetAddress = walletForm.address.trim();

      const sanitizedPin = pin.replace(/\D/g, '');

      if (!walletForm.address || amountValue <= 0) {

        const message = 'Indique une adresse TON valide et un montant positif.';

        setWalletStatus('error');

        setWalletMessage(message);

        return { success: false, message };

      }

      if (sanitizedPin.length !== 4) {

        const message = 'Entre ton code securite a 4 chiffres.';

        setWalletStatus('error');

        setWalletMessage(message);

        return { success: false, message };

      }

      try {

        setWalletStatus('pending');

        setWalletMessage(null);

        const { error } = await supabase.rpc('rpc_user_wallet_payment', {

          p_wallet_address: targetAddress,

          p_amount_fre: amountValue,

          p_note: walletForm.note || null,

          p_metadata: {

            initiatedFrom: 'utilisateur_app',

          },

          p_pin: sanitizedPin,

        });

        if (error) throw error;

        setWalletStatus('success');

        setWalletMessage('Paiement transmis au wallet TON.');

        await refreshProfile();

        const amountLabel = amountValue.toFixed(2);

        setTransferResultDialog({

          type: 'success',

          title: 'Transfert envoye',

          description: `${amountLabel} FRE envoyes vers ${targetAddress}.`,

        });

        closeSendExperience();

        return { success: true };

      } catch (rpcError) {

        console.error('wallet_payment_error', rpcError);

        const formatted = interpretPinErrorMessage(formatSupabaseError(rpcError));

        setWalletStatus('error');

        setWalletMessage(formatted);

        setTransferResultDialog({

          type: 'error',

          title: 'Transfert echoue',

          description: formatted,

        });

        closeSendExperience();

        return { success: false, message: formatted };

      }

    },

    [walletForm.address, walletForm.amount, walletForm.note, refreshProfile, closeSendExperience]

  );



  const handleWalletError = () => {

    setWalletStatus('error');

    setWalletMessage('Paiement annule.');

  };



  const handleContactConfirm = useCallback(

    async (pin: string): Promise<PinActionResult> => {

      const amountValue = Number(contactForm.amount) || 0;

      const recipientHandle = contactForm.handle;

      const sanitizedPin = pin.replace(/\D/g, '');

      if (!contactForm.handle || amountValue <= 0) {

        setContactStatus('error');

        setContactFeedback('Identifiant et montant requis.');

        return { success: false, message: 'Identifiant et montant requis.' };

      }

      if (sanitizedPin.length !== 4) {

        setContactStatus('error');

        setContactFeedback('Entre ton code securite a 4 chiffres.');

        return { success: false, message: 'Entre ton code securite a 4 chiffres.' };

      }

      try {

        setContactStatus('pending');

        setContactFeedback(null);

        const { error } = await supabase.rpc('rpc_transfer_between_users', {

          p_handle: recipientHandle,

          p_amount: amountValue,

          p_note: contactForm.note || null,

          p_pin: sanitizedPin,

        });

        if (error) throw error;

        setContactStatus('success');

        setContactFeedback('Transfert effectue et recu.');

        await refreshProfile();

        const amountLabel = amountValue.toFixed(2);

        setTransferResultDialog({

          type: 'success',

          title: 'Transfert effectue',

          description: `${amountLabel} FRE envoyes a ${recipientHandle}.`,

        });

        closeSendExperience();

        return { success: true };

      } catch (error) {

        console.error('Transfer contact error', error);

        const formatted = interpretPinErrorMessage(formatSupabaseError(error));

        setContactStatus('error');

        setContactFeedback(formatted);

        setTransferResultDialog({

          type: 'error',

          title: 'Transfert echoue',

          description: formatted,

        });

        closeSendExperience();

        return { success: false, message: formatted };

      }

    },

    [contactForm.handle, contactForm.amount, contactForm.note, refreshProfile, closeSendExperience]

  );



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



  const handlePinSessionSubmit = useCallback(

    async (pinValue: string) => {

      const sanitizedPin = pinValue.replace(/\D/g, '').slice(0, 4);

      if (sanitizedPin.length !== 4) {

        setPinSessionError('Entre ton code securite a 4 chiffres.');

        return;

      }

      setPinSessionPending(true);

      setPinSessionError(null);

      try {

        const { error } = await supabase.rpc('rpc_verify_transfer_pin', {

          p_pin: sanitizedPin,

        });

        if (error) throw error;

        const now = Date.now();

        setPinSessionVerifiedAt(now);

        localStorage.setItem(PIN_SESSION_TIME_KEY, String(now));

        const sessionToken = (await supabase.auth.getSession()).data.session?.access_token;

        if (sessionToken) {

          localStorage.setItem(PIN_SESSION_TOKEN_KEY, sessionToken);

        }

        lastActivityRef.current = now;

        setPinSessionPromptOpen(false);

      } catch (rpcError) {

        console.error('pin_session_verify_error', rpcError);

        const formatted = interpretPinErrorMessage(formatSupabaseError(rpcError));

        setPinSessionError(formatted);

      } finally {

        setPinSessionPending(false);

      }

    },

    []

  );



  const handleOpenSendPage = useCallback(() => {

    if (transfersLocked) {

      toast({

        title: 'Envoi verrouille',

        description: transferLockReason || 'Valide ton email pour debloquer cette action.',

        variant: 'destructive',

      });

      return;

    }

    if (hasTransferPin && !pinSessionVerifiedAt) {

      setPinSessionPromptOpen(true);

      setPinSessionError(null);

      toast({

        title: 'Code requis',

        description: 'Entre ton code securite pour continuer.',

      });

      return;

    }

    onSendOpen();

  }, [transfersLocked, transferLockReason, hasTransferPin, pinSessionVerifiedAt, onSendOpen, toast]);



  const handleSendPageClose = useCallback(() => {

    closeSendExperience();

  }, [closeSendExperience]);



  useEffect(() => {

    if (transfersLocked && sendVisible) {

      closeSendExperience();

    }

  }, [transfersLocked, sendVisible, closeSendExperience]);



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

        setDetailError('Impossible de charger les dÃ©tails de la transaction.');

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

        return { success: false, message: 'Impossible de mettre Ã  jour le profil.' };

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

      return { success: true, message: 'Profil mis Ã  jour.' };

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

          profileEmail={profileEmail}

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



      <TransferPinSetupDialog

        open={pinSetupRequired}

        pending={pinSetupPending}

        error={pinSetupError}

        email={profileEmail}

        onSubmit={handlePinSetupSubmit}

      />



      <TransferPinPromptDialog

        open={pinSessionPromptOpen && hasTransferPin && !pinSetupRequired}

        pending={pinSessionPending}

        error={pinSessionError}

        email={profileEmail}

        onSubmit={handlePinSessionSubmit}

        title="Deverrouille ton espace"

        description="Entre ton code securite pour poursuivre."

      />



      <Dialog

        open={Boolean(transferResultDialog)}

        onOpenChange={(open) => {

          if (!open) setTransferResultDialog(null);

        }}

      >

        <DialogContent className="bg-slate-950 border border-slate-800 text-white sm:max-w-md">

          {transferResultDialog && (

            <>

              <DialogHeader className="items-center text-center space-y-3">

                <div

                  className={`rounded-full p-3 ${

                    transferResultDialog.type === 'success'

                      ? 'bg-emerald-500/10 text-emerald-400'

                      : 'bg-red-500/10 text-red-400'

                  }`}

                >

                  {transferResultDialog.type === 'success' ? (

                    <CheckCircle2 className="h-8 w-8" />

                  ) : (

                    <AlertTriangle className="h-8 w-8" />

                  )}

                </div>

                <DialogTitle className="text-2xl font-semibold">{transferResultDialog.title}</DialogTitle>

                <DialogDescription className="text-slate-400">

                  {transferResultDialog.description}

                </DialogDescription>

              </DialogHeader>

              <div className="pt-2">

                <Button

                  className="w-full rounded-2xl bg-emerald-500 text-white hover:bg-emerald-400"

                  onClick={() => setTransferResultDialog(null)}

                >

                  Retour a l'accueil

                </Button>

              </div>

            </>

          )}

        </DialogContent>

      </Dialog>

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

        profileEmail={profileEmail}

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

    </>

  );

};

