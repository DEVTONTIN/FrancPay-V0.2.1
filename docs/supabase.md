# Supabase schema & migrations

Ce dossier explique comment piloter toute la donnee FrancPay depuis Supabase/PostgreSQL. Rien n'est stocke en dur dans l'app : toutes les ecritures/lectures passent par ce schema.

## 1. Prerequis

1. Cree un projet Supabase et recupere :
   - `DATABASE_URL` (connexion `service_role`, onglet **Project Settings -> Database**).
   - `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (onglet **Project Settings -> API**).
2. Copie `.env.example` vers `.env` et remplis les valeurs ci-dessus + la valeur de `TONCONNECT_APP_DOMAIN` (domaine du manifest).  
3. Installe les dependances : `npm install`.

## 2. Appliquer les migrations dans Supabase

La source de verite du schema vit sous `prisma/schema.prisma`, et chaque evolution dispose de son script SQL dans `prisma/migrations/**`.

Pour provisionner une nouvelle base Supabase, applique les migrations dans l'ordre chronologique :

```bash
# Option 1 : via psql (recommande dans CI/CD)
psql "$DATABASE_URL" -f prisma/migrations/202411140001_init/migration.sql
psql "$DATABASE_URL" -f prisma/migrations/202411140002_wallet_connections/migration.sql

# Option 2 : via supabase CLI
supabase db remote set "$DATABASE_URL"
supabase db push --include prisma/migrations/202411140001_init/migration.sql,prisma/migrations/202411140002_wallet_connections/migration.sql
```

Ensuite, genere le client Prisma (utile si on ajoute un backend Node) :

```bash
npx prisma generate
```

> Important : pour eviter toute donnee fictive, ne seed que des parametres techniques (ex : creation du premier compte entreprise reel) directement depuis Supabase ou un script metier connecte a l'API.

## 3. Vue d'ensemble des tables

| Table | Description |
| --- | --- |
| `Company` | Entreprises clientes FrancPay (KYC, contacts, pays, fuseau). |
| `CompanyUser` | Collaborateurs internes de chaque entreprise avec roles (`SUPER_ADMIN` -> `VIEWER`). |
| `Wallet` | Adresses TON autorisees par l'entreprise, avec statut (`ACTIVE`, `SUSPENDED`, `ARCHIVED`). |
| `Client` | Clients finaux auxquels une entreprise envoie des demandes de paiement. |
| `PaymentRequest` | Intention de paiement (montant, devise, wallet, client, date d'expiration, statut). |
| `PaymentSettlement` | Correspondance avec une transaction on-chain (hash TON, montant recu, frais reseau). |
| `PaymentStatusEvent` | Historique chronologique des changements de statut d'une demande. |
| `WalletConnection` | Lie un utilisateur/entreprise a une adresse TON, stocke la preuve (`ton-proof`) et l'etat de verification (`PENDING`, `VERIFIED`, `REVOKED`). |
| `WalletSession` | Sessions d'auth direct par wallet : token cote serveur, expiration, IP/User-Agent pour audit. |
| `WebhookSecret` | Webhooks entreprise (URL + secret) pour notifier les SI externes. |
| `AuditLog` | Tracabilite de toutes les actions sensibles (qui a fait quoi / quand / IP). |

Toutes les regles de securite Supabase (Row Level Security) devront etre ecrites pour chaque table afin de limiter les acces selon l'entreprise et le role utilisateur. Utilise les colonnes `companyId`, `userId` et `role` pour exprimer ces politiques.

### Flow de connexion directe par wallet TON

1. Le front (TonConnect) demande une `ton-proof` au wallet et envoie le payload + signature vers l'Edge Function `ton-connect-auth`.
2. L'Edge Function:
   - valide cryptographiquement la signature `ton-proof` (Ed25519 + double SHA-256 comme specifie dans TonConnect),
   - verifie que `domain.value` correspond a `TONCONNECT_APP_DOMAIN`,
   - upsert la ligne `WalletConnection` avec statut `VERIFIED` et les metadonnees associees,
   - cree une ligne `WalletSession` en generant un `sessionToken` JWT-like base64-url (expiration controlee via `TON_WALLET_SESSION_TTL_SECONDS`).
3. Le front stocke `sessionToken` pour l'utiliser dans ses appels subsequents (ex: l'envoyer dans l'entete `Authorization: Bearer ...` vers tes API privees).
4. Sur logout, appelle un endpoint qui met a jour `WalletSession.revokedAt` et/ou `WalletConnection.status`.

Les politiques RLS doivent limiter l'acces aux lignes en fonction de `companyId` + `userId`. Typiquement: `companyId = auth.jwt()->>'company_id'`.

## 5. Edge Function `ton-connect-auth`

Fichier: `supabase/functions/ton-connect-auth/index.ts`

- Deno Edge Function (deployable via `supabase functions deploy ton-connect-auth --project-ref <PROJECT_REF>`).
- Requiert les variables d'environnement suivantes (configurer via `supabase secrets set` ou `.env.local`):
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `TONCONNECT_APP_DOMAIN`
  - `TON_WALLET_SESSION_TTL_SECONDS` (optionnel, defaut 86400s)
- Payload attendu (`POST`):

```jsonc
{
  "companyId": "uuid",
  "userId": "uuid | null",
  "address": "0:abcdef...",         // format raw `workchain:hash`
  "publicKey": "hex",
  "walletAppName": "Tonkeeper",
  "deviceInfo": "iOS 18.1 / build ...",
  "proof": {
    "domain": { "lengthBytes": 18, "value": "app.francpay.com" },
    "payload": "base64 nonce",
    "signature": "base64 signature",
    "timestamp": "1731589000"
  }
}
```

Reponse:

```json
{
  "connectionId": "uuid",
  "sessionToken": "base64url",
  "expiresAt": "2025-11-14T01:23:45.000Z"
}
```

En cas d'echec (signature invalide, domaine incorrect, etc.), la fonction renvoie un `400` avec la cle `error`.

## 4. Ajouter de nouvelles entites

1. Modelise la table dans `prisma/schema.prisma`.
2. Genere la migration SQL correspondante :
   ```bash
   npx prisma migrate diff \
     --from-schema-datamodel prisma/schema.prisma \
     --to-empty \
     --script > prisma/migrations/2024XXXXXX_new_feature/migration.sql
   ```
3. Soumets la migration au repo, applique-la via `psql` ou la CLI Supabase, puis regenere le client Prisma.

Tu disposes ainsi d'un historique versionne et reproductible pour toutes les evolutions de la base de donnees FrancPay.
