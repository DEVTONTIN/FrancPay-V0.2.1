import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type TonProofPayload = {
  domain: {
    lengthBytes: number;
    value: string;
  };
  payload: string;
  signature: string;
  timestamp: string | number;
};

type RequestBody = {
  companyId: string;
  userId?: string;
  address: string;
  publicKey: string;
  walletAppName?: string;
  deviceInfo?: string;
  proof: TonProofPayload;
};

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const configuredDomain = Deno.env.get('TONCONNECT_APP_DOMAIN');
const sessionTtlSeconds = Number(Deno.env.get('TON_WALLET_SESSION_TTL_SECONDS') ?? '86400');

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for the ton-connect-auth function.');
}

if (!configuredDomain) {
  throw new Error('TONCONNECT_APP_DOMAIN must be set (host part of your manifest URL).');
}

const expectedDomain = configuredDomain.toLowerCase();

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const body = (await req.json()) as RequestBody;
    const validationError = validateRequest(body);
    if (validationError) {
      return jsonResponse({ error: validationError }, 400);
    }

    const proof = body.proof;
    const domainValue = proof.domain.value.toLowerCase();
    if (domainValue !== expectedDomain) {
      return jsonResponse({ error: `Invalid proof domain. Expected ${expectedDomain}, got ${domainValue}` }, 400);
    }

    const verificationResult = await verifyTonProof({
      address: body.address,
      publicKey: body.publicKey,
      domain: proof.domain,
      payload: proof.payload,
      timestamp: proof.timestamp,
      signature: proof.signature
    });

    if (!verificationResult.valid) {
      return jsonResponse({ error: verificationResult.error ?? 'TON proof verification failed' }, 400);
    }

    const now = new Date();
    const proofIssuedAt = parseTimestamp(proof.timestamp);
    const proofIssuedAtIso = new Date(Number(proofIssuedAt) * 1000).toISOString();

    const connectionPayload = {
      companyId: body.companyId,
      userId: body.userId ?? null,
      tonAddress: body.address,
      publicKey: body.publicKey,
      walletAppName: body.walletAppName ?? null,
      deviceInfo: body.deviceInfo ?? null,
      status: 'VERIFIED',
      lastProofPayload: proof.payload,
      lastProofSignature: proof.signature,
      proofIssuedAt: proofIssuedAtIso,
      proofVerifiedAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    const { data: connectionRow, error: connectionError } = await supabase
      .from('WalletConnection')
      .upsert(connectionPayload, {
        onConflict: 'companyId,tonAddress',
        ignoreDuplicates: false
      })
      .select('id')
      .single();

    if (connectionError || !connectionRow) {
      console.error('WalletConnection upsert failed', connectionError);
      return jsonResponse({ error: 'Unable to persist wallet connection' }, 500);
    }

    const sessionToken = createSessionToken();
    const expiresAt = new Date(now.getTime() + sessionTtlSeconds * 1000);

    const { data: sessionRow, error: sessionError } = await supabase
      .from('WalletSession')
      .insert({
        walletConnectionId: connectionRow.id,
        sessionToken,
        expiresAt: expiresAt.toISOString(),
        lastActivityAt: now.toISOString(),
        ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('cf-connecting-ip') ?? null,
        userAgent: req.headers.get('user-agent') ?? null
      })
      .select('id, expiresAt')
      .single();

    if (sessionError || !sessionRow) {
      console.error('WalletSession insert failed', sessionError);
      return jsonResponse({ error: 'Unable to create wallet session' }, 500);
    }

    return jsonResponse({
      connectionId: connectionRow.id,
      sessionToken,
      expiresAt: sessionRow.expiresAt
    });
  } catch (error) {
    console.error('ton-connect-auth error', error);
    return jsonResponse({ error: 'Unexpected server error' }, 500);
  }
});

function validateRequest(body: RequestBody): string | null {
  if (!body.companyId) return 'companyId is required';
  if (!body.address) return 'address is required';
  if (!body.publicKey) return 'publicKey is required';
  if (!body.proof) return 'proof payload is required';
  if (!body.proof.payload) return 'proof.payload is required';
  if (!body.proof.signature) return 'proof.signature is required';
  if (!body.proof.timestamp) return 'proof.timestamp is required';
  if (!body.proof.domain?.value) return 'proof.domain.value is required';
  return null;
}

async function verifyTonProof(params: {
  address: string;
  publicKey: string;
  domain: { lengthBytes: number; value: string };
  payload: string;
  timestamp: string | number;
  signature: string;
}): Promise<{ valid: boolean; error?: string }> {
  try {
    const encoder = new TextEncoder();
    const prefix = encoder.encode('ton-proof-item-v2/');
    const addressBytes = encodeAddress(params.address);
    const domainBytes = encodeDomain(params.domain);
    const timestampBytes = encodeTimestamp(params.timestamp);
    const payloadBytes = base64ToBytes(params.payload);

    const message = concatBytes(prefix, addressBytes, domainBytes, timestampBytes, payloadBytes);
    const messageHash = await sha256(message);
    const fullMessage = concatBytes(new Uint8Array([0xff, 0xff]), encoder.encode('ton-connect'), messageHash);
    const hashToSign = await sha256(fullMessage);

    const signatureBytes = base64ToBytes(params.signature);
    const publicKeyBytes = hexToBytes(params.publicKey);
    const key = await crypto.subtle.importKey('raw', publicKeyBytes, { name: 'Ed25519' }, false, ['verify']);
    const verified = await crypto.subtle.verify({ name: 'Ed25519' }, key, signatureBytes, hashToSign);
    return { valid: verified };
  } catch (error) {
    console.error('TON proof verification failed', error);
    return { valid: false, error: 'ton-proof verification failed' };
  }
}

function encodeAddress(rawAddress: string): Uint8Array {
  const [wcString, hashHex] = rawAddress.split(':');
  if (wcString === undefined || hashHex === undefined) {
    throw new Error('Invalid raw address format. Expected "workchain:hash".');
  }
  if (hashHex.length !== 64) {
    throw new Error('Address hash must be 64 hex chars.');
  }
  const workchain = Number(wcString);
  if (!Number.isInteger(workchain)) {
    throw new Error('Workchain must be an integer.');
  }
  const buffer = new ArrayBuffer(4 + 32);
  const view = new DataView(buffer);
  view.setInt32(0, workchain, false);
  const hashBytes = hexToBytes(hashHex);
  new Uint8Array(buffer, 4).set(hashBytes);
  return new Uint8Array(buffer);
}

function encodeDomain(domain: { lengthBytes: number; value: string }): Uint8Array {
  const encoder = new TextEncoder();
  const domainBytes = encoder.encode(domain.value);
  if (domainBytes.length !== domain.lengthBytes) {
    throw new Error('Domain length mismatch.');
  }
  const buffer = new ArrayBuffer(4 + domainBytes.length);
  const view = new DataView(buffer);
  view.setUint32(0, domainBytes.length, true);
  new Uint8Array(buffer, 4).set(domainBytes);
  return new Uint8Array(buffer);
}

function encodeTimestamp(timestamp: string | number): Uint8Array {
  const ts = BigInt(timestamp);
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setBigUint64(0, ts, true);
  return new Uint8Array(buffer);
}

function parseTimestamp(timestamp: string | number): bigint {
  return BigInt(timestamp);
}

function base64ToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('Invalid hex string.');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const hash = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hash);
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

function createSessionToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
