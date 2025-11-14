-- Direct TON wallet connection entities
CREATE TYPE "WalletConnectionStatus" AS ENUM ('PENDING', 'VERIFIED', 'REVOKED');

CREATE TABLE "WalletConnection" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL,
  "userId" UUID,
  "tonAddress" TEXT NOT NULL,
  "publicKey" TEXT,
  "walletAppName" TEXT,
  "deviceInfo" TEXT,
  "status" "WalletConnectionStatus" NOT NULL DEFAULT 'PENDING',
  "lastProofPayload" TEXT,
  "lastProofSignature" TEXT,
  "proofIssuedAt" TIMESTAMPTZ,
  "proofVerifiedAt" TIMESTAMPTZ,
  "revokedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "WalletConnection_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE,
  CONSTRAINT "WalletConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "CompanyUser" ("id") ON DELETE SET NULL
);

CREATE UNIQUE INDEX "WalletConnection_companyId_tonAddress_key" ON "WalletConnection" ("companyId", "tonAddress");
CREATE INDEX "WalletConnection_companyId_idx" ON "WalletConnection" ("companyId");
CREATE INDEX "WalletConnection_userId_idx" ON "WalletConnection" ("userId");

CREATE TABLE "WalletSession" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "walletConnectionId" UUID NOT NULL,
  "sessionToken" TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "revokedAt" TIMESTAMPTZ,
  "lastActivityAt" TIMESTAMPTZ,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "WalletSession_connection_fkey" FOREIGN KEY ("walletConnectionId") REFERENCES "WalletConnection" ("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "WalletSession_sessionToken_key" ON "WalletSession" ("sessionToken");
CREATE INDEX "WalletSession_walletConnectionId_idx" ON "WalletSession" ("walletConnectionId");
