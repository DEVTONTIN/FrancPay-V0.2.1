-- Enable uuid generation for Supabase/PostgreSQL
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE "UserRole" AS ENUM (
  'SUPER_ADMIN',
  'COMPANY_ADMIN',
  'MANAGER',
  'OPERATOR',
  'VIEWER'
);

CREATE TYPE "WalletStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');

CREATE TYPE "PaymentRequestStatus" AS ENUM (
  'DRAFT',
  'PENDING',
  'PROCESSING',
  'CONFIRMED',
  'FAILED',
  'CANCELLED'
);

CREATE TYPE "SettlementStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED');

-- Core tables
CREATE TABLE "Company" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "legalName" TEXT,
  "registrationNumber" TEXT UNIQUE,
  "contactEmail" TEXT NOT NULL,
  "contactPhone" TEXT,
  "countryCode" TEXT,
  "timezone" TEXT,
  "kycStatus" TEXT DEFAULT 'pending',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX "Company_name_idx" ON "Company" ("name");

CREATE TABLE "CompanyUser" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL,
  "email" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'OPERATOR',
  "phone" TEXT,
  "invitationAccepted" BOOLEAN NOT NULL DEFAULT FALSE,
  "lastLoginAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "CompanyUser_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "CompanyUser_companyId_email_key" ON "CompanyUser" ("companyId", "email");
CREATE INDEX "CompanyUser_companyId_idx" ON "CompanyUser" ("companyId");

CREATE TABLE "Wallet" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL,
  "label" TEXT NOT NULL,
  "tonAddress" TEXT NOT NULL UNIQUE,
  "publicKey" TEXT,
  "status" "WalletStatus" NOT NULL DEFAULT 'ACTIVE',
  "isPrimary" BOOLEAN NOT NULL DEFAULT FALSE,
  "metadata" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "Wallet_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE
);

CREATE INDEX "Wallet_companyId_idx" ON "Wallet" ("companyId");

CREATE TABLE "Client" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "externalRef" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "Client_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE
);

CREATE INDEX "Client_companyId_idx" ON "Client" ("companyId");
CREATE INDEX "Client_externalRef_idx" ON "Client" ("externalRef");

CREATE TABLE "PaymentRequest" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL,
  "walletId" UUID NOT NULL,
  "clientId" UUID,
  "reference" TEXT NOT NULL UNIQUE,
  "amount" DECIMAL(18, 2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'XOF',
  "description" TEXT,
  "status" "PaymentRequestStatus" NOT NULL DEFAULT 'PENDING',
  "expiresAt" TIMESTAMPTZ,
  "metadata" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "PaymentRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE,
  CONSTRAINT "PaymentRequest_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet" ("id") ON DELETE RESTRICT,
  CONSTRAINT "PaymentRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL
);

CREATE INDEX "PaymentRequest_companyId_idx" ON "PaymentRequest" ("companyId");
CREATE INDEX "PaymentRequest_walletId_idx" ON "PaymentRequest" ("walletId");
CREATE INDEX "PaymentRequest_clientId_idx" ON "PaymentRequest" ("clientId");

CREATE TABLE "PaymentSettlement" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "paymentRequestId" UUID NOT NULL,
  "tonTxHash" TEXT UNIQUE,
  "amountRequested" DECIMAL(18, 2) NOT NULL,
  "amountReceived" DECIMAL(18, 2),
  "networkFee" DECIMAL(18, 2),
  "status" "SettlementStatus" NOT NULL DEFAULT 'PENDING',
  "failureReason" TEXT,
  "settledAt" TIMESTAMPTZ,
  "rawPayload" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "PaymentSettlement_request_fkey" FOREIGN KEY ("paymentRequestId") REFERENCES "PaymentRequest" ("id") ON DELETE CASCADE
);

CREATE INDEX "PaymentSettlement_paymentRequestId_idx" ON "PaymentSettlement" ("paymentRequestId");

CREATE TABLE "PaymentStatusEvent" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "paymentRequestId" UUID NOT NULL,
  "status" "PaymentRequestStatus" NOT NULL,
  "notes" TEXT,
  "context" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "PaymentStatusEvent_request_fkey" FOREIGN KEY ("paymentRequestId") REFERENCES "PaymentRequest" ("id") ON DELETE CASCADE
);

CREATE INDEX "PaymentStatusEvent_paymentRequestId_idx" ON "PaymentStatusEvent" ("paymentRequestId");

CREATE TABLE "WebhookSecret" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "secret" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "lastUsedAt" TIMESTAMPTZ,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT "WebhookSecret_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE
);

CREATE INDEX "WebhookSecret_companyId_idx" ON "WebhookSecret" ("companyId");

CREATE TABLE "AuditLog" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL,
  "userId" UUID,
  "action" TEXT NOT NULL,
  "entity" TEXT NOT NULL,
  "entityId" TEXT,
  "ipAddress" TEXT,
  "payload" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "AuditLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE,
  CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "CompanyUser" ("id") ON DELETE SET NULL
);

CREATE INDEX "AuditLog_companyId_idx" ON "AuditLog" ("companyId");
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog" ("userId");
