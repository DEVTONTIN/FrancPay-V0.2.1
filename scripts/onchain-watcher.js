// Simple Node watcher to credit on-chain deposits using the service role key
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { Address } from '@ton/core';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const WATCH_ADDRESS =
  process.env.TON_WATCH_ADDRESS ||
  process.env.VITE_TON_WATCH_ADDRESS ||
  'UQCP0lUbs-Z5Q5saNmRH0WLqL8c0StIw0sGYlKcPdxuFMosC';
const TON_API_KEY = process.env.TONCENTER_API_KEY || process.env.VITE_TONCENTER_API_KEY || '';
const TON_API_BASE =
  process.env.TON_TRANSACTIONS_API ||
  process.env.VITE_TON_TRANSACTIONS_API ||
  'https://tonapi.io/v2/accounts';
const TON_PROVIDER = (process.env.TON_PROVIDER || process.env.VITE_TON_PROVIDER || 'tonapi').toLowerCase();
const POLL_INTERVAL_MS = Number(process.env.TON_WATCH_INTERVAL_MS || 5000);
const TX_LIMIT = Number(process.env.TON_WATCH_LIMIT || 20);

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const processed = new Set();

function resolveAddress(address) {
  try {
    const parsed = Address.parseFriendly(address);
    return {
      friendly: parsed.address.toString({ bounceable: true, urlSafe: true }),
      rawHex: Buffer.from(parsed.address.hash).toString('hex'),
    };
  } catch {
    return { friendly: address, rawHex: address.replace(/:/g, '') };
  }
}

function normalizeComment(value) {
  return (value || '').replace(/\s+/g, '').toUpperCase();
}

function normalizeTonApiBase(base) {
  if (!base || !base.includes('/accounts')) {
    return 'https://tonapi.io/v2/accounts';
  }
  return base;
}

function matchAddress(value, target) {
  if (!value) return false;
  try {
    const parsed = Address.parseFriendly(value);
    const friendly = parsed.address.toString({ bounceable: true, urlSafe: true });
    if (friendly === target.friendly) return true;
    const rawHex = Buffer.from(parsed.address.hash).toString('hex');
    return rawHex === target.rawHex;
  } catch {
    const stripped = value.replace(/[^0-9a-fA-F]/g, '').toLowerCase();
    const normalized =
      stripped.length > target.rawHex.length
        ? stripped.slice(stripped.length - target.rawHex.length)
        : stripped;
    return normalized === target.rawHex.toLowerCase() || value === target.friendly;
  }
}

async function fetchFromTonApi(limit) {
  const target = resolveAddress(WATCH_ADDRESS);
  const base = normalizeTonApiBase(TON_API_BASE);
  const url = `${base.replace(/\/$/, '')}/${target.friendly}/events?limit=${limit}`;
  const headers = { Accept: 'application/json' };
  if (TON_API_KEY) headers.Authorization = `Bearer ${TON_API_KEY}`;

  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`TonAPI ${res.status}: ${await res.text()}`);
  const payload = await res.json();
  const events = payload?.events ?? payload?.result ?? [];
  const parsed = [];

  for (const event of events) {
    for (const action of event.actions || []) {
      if (action.type === 'JettonTransfer' && action.JettonTransfer) {
        if (!matchAddress(action.JettonTransfer.recipient?.address, target)) continue;
        const amountRaw = Number(action.JettonTransfer.amount ?? '0');
        const decimals =
          action.JettonTransfer.jetton?.decimals ??
          (action).JettonTransfer?.decimals ??
          9;
        const amount = amountRaw / 10 ** decimals;
        const memo = action.JettonTransfer.comment || '';
        parsed.push({
          hash: event.event_id || '',
          lt: event.lt,
          amountTon: amount,
          memo,
          commentNormalized: normalizeComment(memo),
          utime: event.timestamp,
          metadata: {
            jettonAddress: action.JettonTransfer.jetton?.address,
            jettonSymbol: action.JettonTransfer.jetton?.symbol,
            sender: action.JettonTransfer.sender?.address,
          },
        });
        continue;
      }
      if (action.type === 'TonTransfer' && action.TonTransfer) {
        if (!matchAddress(action.TonTransfer.recipient?.address, target)) continue;
        const amountNano = Number(action.TonTransfer.amount ?? '0');
        const memo = action.TonTransfer.comment || '';
        parsed.push({
          hash: event.event_id || '',
          lt: event.lt,
          amountTon: amountNano / 1e9,
          memo,
          commentNormalized: normalizeComment(memo),
          utime: event.timestamp,
        });
      }
    }
  }
  return parsed;
}

async function fetchFromToncenter(limit) {
  const { friendly } = resolveAddress(WATCH_ADDRESS);
  const params = new URLSearchParams({ address: friendly, limit: String(limit) });
  if (TON_API_KEY) params.set('api_key', TON_API_KEY);
  const base = TON_API_BASE.includes('toncenter.com')
    ? TON_API_BASE
    : 'https://toncenter.com/api/v2/getTransactions';
  const url = `${base}?${params.toString()}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Toncenter ${res.status}: ${await res.text()}`);
  const payload = await res.json();
  const txs = payload?.result?.transactions ?? payload?.result ?? payload?.transactions ?? [];
  return txs
    .map((tx) => {
      const memo = (() => {
        const msgData = tx.in_msg?.msg_data || {};
        if (msgData.text) return msgData.text;
        if (msgData.comment) return msgData.comment;
        if (msgData.body) return msgData.body;
        if (msgData.base64) {
          try {
            return Buffer.from(msgData.base64, 'base64').toString('utf8');
          } catch {
            return '';
          }
        }
        return tx.in_msg?.message || tx.in_msg?.body || '';
      })();
      const amountNano = Number(tx.in_msg?.value ?? '0');
      return {
        hash: tx.transaction_id?.hash || '',
        lt: tx.transaction_id?.lt,
        amountTon: amountNano / 1e9,
        memo,
        commentNormalized: normalizeComment(memo),
        utime: tx.utime,
      };
    })
    .filter((tx) => tx.hash && tx.amountTon > 0);
}

async function fetchTonTransactions(limit = 20) {
  if (!WATCH_ADDRESS) return [];
  try {
    if (TON_PROVIDER === 'toncenter') {
      return await fetchFromToncenter(limit);
    }
    const tonApiTxs = await fetchFromTonApi(limit);
    if (!tonApiTxs.length) {
      console.warn('TonAPI returned no events; consider switching to toncenter provider');
    }
    return tonApiTxs;
  } catch (tonApiError) {
    console.warn('TonAPI watcher error', tonApiError);
    if (TON_PROVIDER !== 'toncenter') {
      try {
        return await fetchFromToncenter(limit);
      } catch (toncenterError) {
        console.error('Toncenter fallback failed', toncenterError);
      }
    }
    return [];
  }
}

async function syncOnce() {
  const txs = await fetchTonTransactions(TX_LIMIT);
  for (const tx of txs) {
    if (processed.has(tx.hash)) continue;
    const resolvedMemo = tx.memo?.trim() || null;
    const payload = {
      p_tx_hash: tx.hash,
      p_wallet_address: WATCH_ADDRESS,
      p_amount_ton: tx.amountTon,
      p_amount_fre: tx.amountTon,
      p_memo_tag: resolvedMemo,
      p_metadata: {
        lt: tx.lt,
        utime: tx.utime,
        ...(tx.metadata || {}),
      },
    };
    const { error } = await supabase.rpc('rpc_register_onchain_deposit', payload);
    if (error) {
      console.error('register_onchain_deposit_error', error);
      continue;
    }
    processed.add(tx.hash);
    console.log(`Credited on-chain deposit ${tx.hash} for memo ${resolvedMemo || 'N/A'}`);
  }
}

async function run() {
  console.log(`Watching TON address ${WATCH_ADDRESS} via ${TON_PROVIDER}...`);
  await syncOnce();
  setInterval(syncOnce, POLL_INTERVAL_MS);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
