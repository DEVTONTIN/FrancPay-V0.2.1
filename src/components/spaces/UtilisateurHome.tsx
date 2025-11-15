import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { UtilisateurHeader } from '@/components/spaces/utilisateur/UtilisateurHeader';
import { UtilisateurHomeSection, TransactionDisplay } from '@/components/spaces/utilisateur/UtilisateurHomeSection';
import { UtilisateurPaySection } from '@/components/spaces/utilisateur/UtilisateurPaySection';
import { UtilisateurSettingsSection } from '@/components/spaces/utilisateur/UtilisateurSettingsSection';
import { WalletDrawer } from '@/components/spaces/utilisateur/WalletDrawer';
import { ContactDrawer } from '@/components/spaces/utilisateur/ContactDrawer';
import { ShareDrawer } from '@/components/spaces/utilisateur/ShareDrawer';
import { DepositDrawer } from '@/components/spaces/utilisateur/DepositDrawer';
import { useOnchainDepositSync } from '@/hooks/useOnchainDepositSync';
import { UtilisateurInvestSection } from '@/components/spaces/utilisateur/UtilisateurInvestSection';
import { TransactionHistoryPage } from '@/components/spaces/utilisateur/TransactionHistorySheet';
import { TransactionDetailDrawer } from '@/components/spaces/utilisateur/TransactionDetailDrawer';
import {
  formatFreAmount,
  formatTransactionTitle,
  mapToTransactionDetail,
  SupabaseTransactionRow,
  TransactionDetail,
} from '@/components/spaces/utilisateur/transaction-utils';

type UtilisateurSection = 'home' | 'invest' | 'settings' | 'pay';

interface UtilisateurHomeProps {
  activeSection: UtilisateurSection;
}

export const UtilisateurHome: React.FC<UtilisateurHomeProps> = ({ activeSection }) => {
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string>('');
  const [profileEmail, setProfileEmail] = useState<string>('');
  const [referralCode, setReferralCode] = useState<string>('');
  const [balanceFre, setBalanceFre] = useState<number>(0);
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  const [walletDrawerOpen, setWalletDrawerOpen] = useState(false);
  const [walletStatus, setWalletStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [walletForm, setWalletForm] = useState({ address: '', amount: '0', note: '' });

  const [contactDrawerOpen, setContactDrawerOpen] = useState(false);
  const [contactStatus, setContactStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [contactForm, setContactForm] = useState({ handle: '', amount: '0', note: '' });
  const [transactions, setTransactions] = useState<TransactionDisplay[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [logoutPending, setLogoutPending] = useState(false);
  const [shareDrawerOpen, setShareDrawerOpen] = useState(false);
  const [depositDrawerOpen, setDepositDrawerOpen] = useState(false);
  const [historyPageVisible, setHistoryPageVisible] = useState(false);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [detailTransaction, setDetailTransaction] = useState<TransactionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailTargetId, setDetailTargetId] = useState<string | null>(null);

  const mapTransactionRow = useCallback((tx: SupabaseTransactionRow): TransactionDisplay => {
    const amountValue = Number(tx.amountFre) || 0;
    return {
      id: tx.id,
      title: formatTransactionTitle(tx.context, tx.counterparty, amountValue),
      amount: amountValue,
      createdAt: tx.createdAt,
    };
  }, []);

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
      setTransactions([]);
      setTransactionsLoading(false);
      setIsProfileLoading(false);
      return;
    }

    setAuthUserId(session.user.id);
    setProfileEmail(session.user.email || '');

    setTransactionsLoading(true);

    const [
      { data: profileData, error: profileError },
      { data: balanceData, error: balanceError },
      { data: txData, error: txError },
    ] = await Promise.all([
      supabase.from('UserProfile').select('username, referralCode').eq('authUserId', session.user.id).maybeSingle(),
      supabase.from('UserWalletBalance').select('balanceFre').eq('authUserId', session.user.id).maybeSingle(),
      supabase
        .from('UserPaymentTransaction')
        .select('id,counterparty,amountFre,createdAt,context')
        .eq('authUserId', session.user.id)
        .order('createdAt', { ascending: false })
        .limit(5),
    ]);

    if (profileError) {
      console.error('Erreur profil', profileError);
    } else if (profileData) {
      if (profileData.username) {
        setUsername(profileData.username);
      }
      if (profileData.referralCode) {
        setReferralCode(profileData.referralCode);
      }
    }

    if (balanceError) {
      console.error('Erreur balance', balanceError);
    } else if (balanceData?.balanceFre !== undefined && balanceData?.balanceFre !== null) {
      setBalanceFre(Number(balanceData.balanceFre));
    }

    if (txError) {
      console.error('Erreur transactions', txError);
      setTransactions([]);
    } else if (txData) {
      setTransactions(txData.map(mapTransactionRow));
    }

    setTransactionsLoading(false);
    setIsProfileLoading(false);
  }, [mapTransactionRow]);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const handlePersistTransaction = useCallback(
    async (payload: { type: 'merchant' | 'wallet' | 'contact'; target: string; amount: string; fee?: string }) => {
      if (!authUserId) return;
      const amountValue = Number(payload.amount) || 0;
      const feeValue = payload.fee ? Number(payload.fee) || 0 : 0;

      const { error } = await supabase.from('UserPaymentTransaction').insert({
        authUserId,
        context: payload.type,
        counterparty: payload.target,
        amountFre: amountValue,
        feeFre: feeValue,
      });

      if (error) {
        console.error('Erreur transaction', error);
      } else {
        await refreshProfile();
      }
    },
    [authUserId, refreshProfile]
  );

  const handleWalletClose = () => {
    setWalletDrawerOpen(false);
    setWalletStatus('idle');
    setWalletForm({ address: '', amount: '0', note: '' });
  };

  const handleContactClose = () => {
    setContactDrawerOpen(false);
    setContactStatus('idle');
    setContactForm({ handle: '', amount: '0', note: '' });
  };

  const handleWalletConfirm = async () => {
    await handlePersistTransaction({
      type: 'wallet',
      target: walletForm.address || 'wallet-ton',
      amount: walletForm.amount || '0',
    });
    setWalletStatus('success');
  };

  const handleWalletError = () => {
    setWalletStatus('error');
  };

  const handleContactConfirm = useCallback(async () => {
    if (!contactForm.handle || !contactForm.amount) {
      setContactStatus('error');
      return;
    }
    try {
      setContactStatus('idle');
      const { error } = await supabase.rpc('rpc_transfer_between_users', {
        p_handle: contactForm.handle,
        p_amount: Number(contactForm.amount) || 0,
        p_note: contactForm.note || null,
      });
      if (error) throw error;
      setContactStatus('success');
      await refreshProfile();
    } catch (error) {
      console.error('Transfer contact error', error);
      setContactStatus('error');
    }
  }, [contactForm.handle, contactForm.amount, contactForm.note, refreshProfile]);

  const handleContactError = () => {
    setContactStatus('error');
  };

  const [balanceWhole, balanceCents] = useMemo(() => {
    const formatted = formatFreAmount(balanceFre);
    const parts = formatted.split(',');
    return [parts[0], parts[1] ?? '00'];
  }, [balanceFre]);

  const depositTag = useMemo(() => {
    if (referralCode) return referralCode;
    if (authUserId) return `FRP-${authUserId.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
    return undefined;
  }, [referralCode, authUserId]);

  useOnchainDepositSync({
    enabled: Boolean(authUserId),
    onDeposit: refreshProfile,
  });

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

          setTransactions((prev) => {
            if (payload.eventType === 'DELETE') {
              return prev.filter((tx) => tx.id !== updatedRow.id);
            }

            const nextTx = mapTransactionRow(updatedRow);
            const withoutCurrent = prev.filter((tx) => tx.id !== nextTx.id);
            const merged =
              payload.eventType === 'UPDATE'
                ? [nextTx, ...withoutCurrent]
                : [nextTx, ...prev];
            return merged
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, 5);
          });
          setTransactionsLoading(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authUserId, mapTransactionRow]);

  const handleLogoutConfirm = useCallback(async () => {
    setLogoutPending(true);
    await supabase.auth.signOut();
    setLogoutPending(false);
    setAuthUserId(null);
    setUsername('');
    setProfileEmail('');
    setBalanceFre(0);
    setTransactions([]);
    setTransactionsLoading(false);
  }, []);

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

  const closeTransactionDetail = useCallback(() => {
    setDetailDrawerOpen(false);
    setDetailTransaction(null);
    setDetailError(null);
    setDetailTargetId(null);
  }, []);

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
          />

          {activeSection === 'home' && (
            <UtilisateurHomeSection
              transactions={transactions}
              isLoading={transactionsLoading}
              onShare={() => setShareDrawerOpen(true)}
              onDeposit={() => setDepositDrawerOpen(true)}
              onShowHistory={() => setHistoryPageVisible(true)}
              onSelectTransaction={(id) => openTransactionDetail(id)}
            />
          )}

          {activeSection === 'pay' && (
            <UtilisateurPaySection
              onOpenContactDrawer={() => setContactDrawerOpen(true)}
              onOpenWalletDrawer={() => setWalletDrawerOpen(true)}
              onPersistTransaction={handlePersistTransaction}
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
              onLogoutConfirm={handleLogoutConfirm}
              logoutPending={logoutPending}
            />
          )}
      </div>
    </div>

      <TransactionHistoryPage
        visible={historyPageVisible}
        authUserId={authUserId}
        onClose={() => setHistoryPageVisible(false)}
        onSelectTransaction={handleHistoryTransactionSelect}
      />

      <TransactionDetailDrawer
        open={detailDrawerOpen}
        onClose={closeTransactionDetail}
        transaction={detailTransaction}
        isLoading={detailLoading}
        error={detailError}
        onReload={detailTargetId ? () => openTransactionDetail(detailTargetId) : undefined}
      />

      <WalletDrawer
        open={walletDrawerOpen}
        form={walletForm}
        status={walletStatus}
        onChange={setWalletForm}
        onClose={handleWalletClose}
        onConfirm={handleWalletConfirm}
        onError={handleWalletError}
      />

      <ContactDrawer
        open={contactDrawerOpen}
        form={contactForm}
        status={contactStatus}
        onChange={setContactForm}
        onClose={handleContactClose}
        onConfirm={handleContactConfirm}
        onError={handleContactError}
      />

      <ShareDrawer open={shareDrawerOpen} onClose={() => setShareDrawerOpen(false)} referralCode={referralCode} />

      <DepositDrawer
        open={depositDrawerOpen}
        onClose={() => setDepositDrawerOpen(false)}
        depositTag={depositTag}
        onManualRefresh={handleManualDepositRefresh}
        onDeposited={refreshProfile}
      />
    </>
  );
};
