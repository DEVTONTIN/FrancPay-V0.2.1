# FrancPay

FrancPay est la surface web principale de la plateforme de paiement FRE : une landing page marketing, un portail public supportant l authentification Supabase (email + Google) et deux espaces applicatifs cibles (Utilisateur et Professionnel). Le depot inclut aussi les scripts d oracles (prix FRE, watcher TON) et les migrations Prisma/Supabase.

## Fonctionnalites principales
- **Experience marketing** : sections Hero, Features, CTA et demo (`src/components/landing`) pour presenter FrePay et rediriger vers les formulaires d inscription / connexion.
- **Auth et routage** : `AuthPortal`, `SignupDrawer`, `LoginDrawer` et `AuthCallback` gerent l onboarding Supabase, la redirection `/auth/callback` et le rappel de l espace prefere via `localStorage`.
- **Espace Utilisateur** (`src/components/spaces/UtilisateurHome.tsx`) : tableau de bord wallet, conversion FRE/EUR/USDT/TON via `useFreExchangeRates`, historique et detail des transactions, depots on-chain detectes automatiquement, envoi de fonds avec PIN, partage de compte, dossier pro, staking/invest et parametres de profil.
- **Espace Professionnel** (`src/components/spaces/ProfessionalSpace.tsx`) : dashboard indicateurs, liste clients, module d encaissement (liens, QR codes, POS integre) et settings (deconnexion Supabase). `useTonWallet` expose une API stable en attendant le retour de TonConnect.
- **Surveillance on-chain & referentiel de prix** : `useOnchainDepositSync` s appuie sur `src/lib/ton/onchainWatcher.ts` pour suivre les transactions TON via TonAPI/Toncenter et invoquer l RPC `rpc_register_onchain_deposit`. `useFreExchangeRates` lit la table `FrePriceSnapshot` alimentee par les scripts/Edge Functions.
- **Base de donnees securisee** : schema Prisma complet (`prisma/schema.prisma`), migrations versionnees, scripts RLS (`supabase/rls-policies.sql`) et documentation detaillee dans `docs/supabase.md`.

## Architecture en bref
- **Frontend web** : Vite + React 18 + TypeScript, TailwindCSS, Radix UI (shadcn) et modules utility (React Hook Form, Zod, Embla, Recharts, Sonner...). Les alias `@/*` (cf. `tsconfig.json`) simplifient les imports dans `src/`.
- **Data & Supabase** : PostgreSQL/Supabase comme source de verite. Prisma gere le schema, et toutes les operations passent par la couche Supabase (REST/RPC) avec RLS forcee. Les tables couvrent profils, wallets, transactions, staking, depots on-chain et snapshots de prix.
- **Automatisations** : scripts Node/Deno (`scripts/fetchFreMarketPrices.js`, `supabase/functions/fre-price-snapshot`) pour l oracle FRE, watcher TON cote navigateur, et Edge Function `ton-connect-auth` (PoC) pour verifier les preuves TonConnect.

## Pile technique
- React 18, TypeScript 5, Vite 5 et TailwindCSS 3.
- Radix UI + shadcn/ui pour les composants, Lucide pour les icones.
- Supabase (Auth, base Postgres, Edge Functions) + Prisma 6.
- Hooks maison `useFreExchangeRates`, `useOnchainDepositSync`, `useTonWallet`.
- Scripts Node/Deno pour les oracles FRE et la surveillance TON.

## Prerequis
- Node.js 18+ et npm 10+ (ou pnpm/yarn si tu preferes, le lockfile npm est fourni).
- Supabase CLI pour deployer les fonctions/migrations, `psql` pour appliquer les scripts SQL.
- Un projet Supabase operationnel (base + Auth) et un compte TonAPI/Toncenter si tu actives le watcher.

## Installation rapide
```bash
git clone <repo>
cd project
npm install
cp .env.example .env   # puis renseigne les secrets Supabase et Ton
npm run dev            # lance Vite sur http://localhost:5173
```

Build et preview prod :
```bash
npm run build
npm run preview
```

Lint :
```bash
npm run lint
```

## Variables d environnement

### Web / Vite (.env)
| Variable | Description |
| --- | --- |
| `DATABASE_URL` | Connexion Postgres (role service) utilisee par Prisma/migrations locales. |
| `SUPABASE_SERVICE_ROLE_KEY` | Token service role reutilise par Prisma ou scripts server-side. |
| `VITE_SUPABASE_URL` | URL publique Supabase consommee par le client front. |
| `VITE_SUPABASE_ANON_KEY` | Cle anon publique. |
| `VITE_TON_WATCH_ADDRESS` | Adresse TON surveillee par l interface Utilisateur. |
| `VITE_TON_TRANSACTIONS_API` | Endpoint TonAPI (par defaut `https://tonapi.io/v2/accounts`). |
| `VITE_TON_PROVIDER` | `tonapi` ou `toncenter` pour choisir la source dans `onchainWatcher`. |
| `VITE_TONAPI_KEY` / `VITE_TONCENTER_API_KEY` | Clés API optionnelles selon le provider. |

### Scripts / Cron / Oracles
| Variable | Description |
| --- | --- |
| `SUPABASE_URL` | URL projet (utilisee par `scripts/fetchFreMarketPrices.js` et l Edge Function). |
| `SUPABASE_SERVICE_ROLE_KEY` | Necessaire pour inserer dans `FrePriceSnapshot`. |
| `FRE_PRICE_WATCH` | `true` pour activer la boucle infinie (sinon une seule capture). |
| `FRE_PRICE_POLL_INTERVAL_MS` | Intervalle de rafraichissement (default 60000 ms). |

### Edge Function `ton-connect-auth`
| Variable | Description |
| --- | --- |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Connexion a Supabase sans session persistante. |
| `TONCONNECT_APP_DOMAIN` | Domaine attendu dans les preuves TonConnect. |
| `TON_WALLET_SESSION_TTL_SECONDS` | Duree de vie des sessions wallet creees (86400 par defaut). |

Pense a ajouter les URLs de redirection `http://localhost:5173/auth/callback` et `https://towallet.site/auth/callback` dans Supabase Auth.

## Scripts npm
- `npm run dev` : Vite + HMR.
- `npm run build` : `tsc -b` puis `vite build`.
- `npm run preview` : serveur statique pour verifier le build.
- `npm run lint` : ESLint 9 (React hooks + React refresh plugins).
- `npm run db:generate` : `prisma generate`.
- `npm run db:migrate` : `prisma migrate deploy` (pour les cibles deploiement).
- `npm run db:studio` : ouvre Prisma Studio sur la base pointee par `DATABASE_URL`.

## Base de donnees & migrations
1. Modele la base via `prisma/schema.prisma`. Consulte `docs/supabase.md` pour le detail des tables (`UserProfile`, `UserWalletBalance`, `UserPaymentTransaction`, `ProfessionalApplication`, `StakeProduct`, `UserStakePosition`, `UserStakeLedger`, `OnchainDeposit`, `FrePriceSnapshot`, etc.).
2. Applique les migrations (`psql prisma/migrations/.../migration.sql` ou `supabase db push`). Les scripts `202411140001_init`, `202411140002_wallet_connections`, `202411140003_user_profiles`, puis le cleanup `202411180700_db_cleanup` sont fournis.
3. Genere le client Prisma (`npm run db:generate`) si tu ajoutes un backend Node.
4. Active les politiques via `psql "$DATABASE_URL" -f supabase/rls-policies.sql` pour creer les helpers `auth_role`, `auth_user_id`, `is_service_role` et limiter la lecture/ecriture aux utilisateurs authentifies ou au `service_role`.
5. Les triggers/RPC (ex: `rpc_register_onchain_deposit`) doivent etre deployes dans Supabase avant d activer le watcher front.

## Surveillance on-chain et referentiel de prix
- **Watcher TON** : `src/lib/ton/onchainWatcher.ts` interroge TonAPI ou Toncenter, normalise les transactions (memo, montant, metadata) et renvoie des `ParsedTonTransaction`. `useOnchainDepositSync` (cf. `src/hooks/useOnchainDepositSync.ts`) boucle toutes les 5 secondes, dedup les hash et appelle `supabase.rpc('rpc_register_onchain_deposit', ...)`. Active-le uniquement quand `VITE_TON_WATCH_ADDRESS` et les cles API sont valides.
- **Oracle FRE** : `scripts/fetchFreMarketPrices.js` et son equivalent Deno `supabase/functions/fre-price-snapshot` recuperent les prix DexScreener (pair FRE/TON) + CoinGecko (TON/USD, USD/EUR), calculent FRE en USD/EUR/TON puis inserent un snapshot dans `FrePriceSnapshot`. Lance le script en local (`node scripts/fetchFreMarketPrices.js --watch`) ou planifie la fonction via Supabase Edge Functions (`supabase functions deploy fre-price-snapshot --project-ref ...`).
- **Consommation UI** : `useFreExchangeRates` interroge `FrePriceSnapshot` (order by `fetchedAt` desc) pour afficher les conversions en temps reel dans l espace Utilisateur (`BalanceDisplayCurrency` FRE/EUR/USDT/TON).

## Edge Functions
- `supabase/functions/fre-price-snapshot` : fonction Deno prete pour tourner en continu (mode watch) ou a la demande.
- `supabase/functions/fetch-price` : squelette minimal pour tester le runtime Supabase.
- `supabase/functions/ton-connect-auth` : POC TonConnect qui valide une preuve Ed25519, enregistre `WalletConnection`/`WalletSession` et renvoie un token de session. Les tables correspondantes ont ete archivees (voir `docs/supabase.md`). Si tu re-actives ce flux, recree une migration dediee avant de redeloyer la fonction.

## Ressources utiles
- `docs/supabase.md` : guide complet schema+migrations+RLS.
- `supabase/rls-policies.sql` : script a rejouer sur chaque nouvelle base.
- `scripts/fetchFreMarketPrices.js` : exemple Node pour l oracle FRE.

Tu peux maintenant enrichir FrancPay (backend Node, veritable integration TonConnect, real data pour les sections Pro, tests end-to-end, etc.). Ouvre une issue ou un ticket avant d ajouter de nouvelles entites Prisma pour garder l historique synchronise avec Supabase.
