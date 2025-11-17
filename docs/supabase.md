# Supabase schema & migrations

Ce dossier explique comment piloter toute la donnee FrancPay depuis Supabase/PostgreSQL. Rien n'est stocke en dur dans l'app : toutes les ecritures/lectures passent par ce schema.

## 1. Prerequis

1. Cree un projet Supabase et recupere :
   - `DATABASE_URL` (connexion `service_role`, onglet **Project Settings -> Database**).
   - `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (onglet **Project Settings -> API**).
2. Copie `.env.example` vers `.env` et remplis les valeurs ci-dessus (les variables TonConnect sont devenues optionnelles; ne les ajoute que si tu redeploies l’ancienne Edge Function).  
3. Installe les dependances : `npm install`.

## 2. Appliquer les migrations dans Supabase

La source de verite du schema vit sous `prisma/schema.prisma`, et chaque evolution dispose de son script SQL dans `prisma/migrations/**`.

Pour provisionner une nouvelle base Supabase, applique les migrations dans l'ordre chronologique :

```bash
# Option 1 : via psql (recommande dans CI/CD)
psql "$DATABASE_URL" -f prisma/migrations/202411140001_init/migration.sql
psql "$DATABASE_URL" -f prisma/migrations/202411140002_wallet_connections/migration.sql
psql "$DATABASE_URL" -f prisma/migrations/202411140003_user_profiles/migration.sql

# Option 2 : via supabase CLI
supabase db remote set "$DATABASE_URL"
supabase db push --include prisma/migrations/202411140001_init/migration.sql,prisma/migrations/202411140002_wallet_connections/migration.sql,prisma/migrations/202411140003_user_profiles/migration.sql
```

Ensuite, genere le client Prisma (utile si on ajoute un backend Node) :

```bash
npx prisma generate
```

> Important : pour eviter toute donnee fictive, ne seed que des parametres techniques (ex : creation du premier compte entreprise reel) directement depuis Supabase ou un script metier connecte a l'API.

## 3. Vue d'ensemble des tables

| Table | Description |
| --- | --- |
| `UserProfile` | Profils auth (username, email, type UTILISATEUR/PROFESSIONAL, parrainage). |
| `UserWalletBalance` | Solde global FRE par utilisateur (maj auto via RPC/trigger). |
| `UserPaymentTransaction` | Journal des transactions utilisateur (paiements wallet, transferts, staking). |
| `ProfessionalApplication` | Dossiers d’homologation pro envoyes depuis l’espace utilisateur. |
| `StakeProduct` | Produits de staking publies (APY, lock period, metadata). |
| `UserStakePosition` | Positions de staking ouvertes par les utilisateurs. |
| `UserStakeLedger` | Journal d’audit staking (STAKE/UNSTAKE/REWARD). |
| `OnchainDeposit` | Traque les depots TON detectes par le watcher + memos FRP. |
| `FrePriceSnapshot` | Historique des prix FRE/TON/USD/EUR pour la conversion. |
| `ApplicationFeeLedger` | Ledger consolidant les frais preleves (transferts, staking, wallet). |
| `ApplicationFeeBalance` | Agregat global des frais (1 seule ligne `id=1`). |

Toutes les regles de securite Supabase (Row Level Security) doivent etre actives sur ces tables pour limiter les acces au `auth.uid()` courant (ou au `service_role` cote backend).

### Flow de connexion directe par wallet TON

Le PoC TonConnect reste documente dans `supabase/functions/ton-connect-auth`, mais les tables `WalletConnection`/`WalletSession` ont ete archivees. Si tu redeploies l’auth par proof, prevois une nouvelle schema dedie (ou recree ces tables via une migration separee).

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

## 6. Row Level Security (RLS)

Le script `supabase/rls-policies.sql` recrée trois helpers (`auth_role`, `auth_user_id`, `is_service_role`), active RLS + `force row level security` et applique les politiques suivantes :

- `UserProfile`, `UserWalletBalance`, `UserPaymentTransaction`, `ProfessionalApplication`, `UserStakePosition`, `UserStakeLedger`, `OnchainDeposit`
  - lecture limitée à `auth.uid()` (ou `service_role`)
  - écriture autorisée à l'utilisateur lorsqu'il agit sur sa propre ligne (ou au `service_role`/functions security definer)
- `StakeProduct`, `FrePriceSnapshot`
  - lecture publique (`anon`/`authenticated`)
  - modifications réservées au `service_role`
- `ApplicationFeeLedger` & `ApplicationFeeBalance`
  - lecture/écriture uniquement via la clé `service_role`

Pense à exécuter `psql "$DATABASE_URL" -f supabase/rls-policies.sql` après toute création de base pour forcer ces règles.

Application :

```bash
psql "$DATABASE_URL" -f supabase/rls-policies.sql
```

⚠️ Assure-toi qu'au moment de l'authentification tu ajoutes au moins les claims par defaut (`sub` = `auth.uid()` et `role` = `anon`/`authenticated`/`service_role`). Pas de `company_id` requis desormais, mais pense a creer la ligne `UserProfile` correspondant a `auth.uid()` juste apres l'inscription.

## 7. Authentification email / Google

Le portail `AuthPortal` utilise Supabase Auth (email+mot de passe + Google OAuth) et une page de callback `/auth/callback` pour finaliser la session. Pour que tout fonctionne :

1. **Activer les providers** : dans Supabase → Auth → Providers → Active `Email` et `Google` (crée un OAuth Client ID/secret et colle les valeurs).
2. **Redirect URLs** :
   - Ajoute `https://towallet.site/auth/callback` (production) et `http://localhost:5173/auth/callback` (local) dans la liste des URLs de redirection autorisées.
3. **Env vars front** : `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` doivent etre présents côté Netlify/Vercel.
4. **Claims personnalisés** : si tu ajoutes des métadonnées custom au JWT, assure-toi juste qu'elles n'écrasent pas `sub` (utilisé par les policies) et que les comptes service utilisent bien la clé `service_role`.
5. **Espace ciblé** : la page `/auth/callback` lit le paramètre `space` (`professional` ou `utilisateur`) puis redirige vers `/?space=...` et stocke la préférence `francpay_last_space`.

Sans ces réglages, les formulaires de connexion resteront bloqués (erreurs 400/redirect refusé).
