import { useCallback, useEffect, useRef } from 'react';
import { fetchTonTransactions, TON_WATCH_ADDRESS } from '@/lib/ton/onchainWatcher';
import { supabase } from '@/lib/supabaseClient';

const CLIENT_ONCHAIN_SYNC_ENABLED =
  import.meta.env.VITE_ENABLE_CLIENT_ONCHAIN_SYNC === 'true';

interface UseOnchainDepositSyncOptions {
  enabled?: boolean;
  onDeposit?: () => void;
}

export const useOnchainDepositSync = ({
  enabled = false,
  onDeposit,
}: UseOnchainDepositSyncOptions) => {
  const processedRef = useRef<Set<string>>(new Set());

  const checkTransactions = useCallback(async () => {
    if (!enabled || !CLIENT_ONCHAIN_SYNC_ENABLED) return;
    try {
      const txs = await fetchTonTransactions();
      for (const tx of txs) {
        if (processedRef.current.has(tx.hash)) continue;

        const resolvedMemo = tx.memo?.trim() || null;

        try {
          const { error } = await supabase.rpc('rpc_register_onchain_deposit', {
            p_tx_hash: tx.hash,
            p_wallet_address: TON_WATCH_ADDRESS,
            p_amount_ton: tx.amountTon,
            p_amount_fre: tx.amountTon,
            p_memo_tag: resolvedMemo,
            p_metadata: {
              lt: tx.lt,
              utime: tx.utime,
              ...(tx.metadata || {}),
            },
          });
          if (error) {
            console.error('register_onchain_deposit_error', error);
            continue;
          }
          processedRef.current.add(tx.hash);
          onDeposit?.();
        } catch (rpcError) {
          console.error('Ton deposit sync RPC error', rpcError);
        }
      }
    } catch (error) {
      console.error('Ton on-chain sync error', error);
    }
  }, [enabled, onDeposit]);

  useEffect(() => {
    if (!enabled) return;
    if (!CLIENT_ONCHAIN_SYNC_ENABLED) {
      console.warn('Client on-chain deposit sync is disabled; run the watcher server-side with a service role key.');
      return;
    }
    processedRef.current = new Set();
    checkTransactions();
    const interval = window.setInterval(() => {
      checkTransactions();
    }, 5000);
    return () => {
      window.clearInterval(interval);
    };
  }, [enabled, checkTransactions]);
};
