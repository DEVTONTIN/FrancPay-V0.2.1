import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, UserRound, Wallet, X, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TRANSFER_FEE_FRE, TRANSFER_FEE_LABEL } from '@/config/fees';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface SendFundsPageProps {
  visible: boolean;
  onClose: () => void;
  contactForm: { handle: string; amount: string; note: string };
  contactStatus: 'idle' | 'pending' | 'success' | 'error';
  contactStatusMessage?: string | null;
  onContactChange: (form: { handle: string; amount: string; note: string }) => void;
  onContactConfirm: () => void;
  onContactError: () => void;
  onValidateRecipient?: (handle: string) => Promise<boolean>;
  onResetContact: () => void;
  walletForm: { address: string; amount: string; note: string };
  walletStatus: 'idle' | 'pending' | 'success' | 'error';
  walletStatusMessage?: string | null;
  onWalletChange: (form: { address: string; amount: string; note: string }) => void;
  onWalletConfirm: () => void;
  onWalletError: () => void;
  onResetWallet: () => void;
}

const sendOptions = [
  {
    id: 'user',
    title: 'Envoyer a un utilisateur',
    description: 'Transfert instantane vers @identifiant FrancPay.',
    icon: UserRound,
  },
  {
    id: 'ton',
    title: 'Envoyer via TON',
    description: 'Adresse publique TON ou TonConnect.',
    icon: Wallet,
  },
];

export const SendFundsPage: React.FC<SendFundsPageProps> = ({
  visible,
  onClose,
  contactForm,
  contactStatus,
  contactStatusMessage,
  onContactChange,
  onContactConfirm,
  onContactError,
  onValidateRecipient,
  onResetContact,
  walletForm,
  walletStatus,
  walletStatusMessage,
  onWalletChange,
  onWalletConfirm,
  onWalletError,
  onResetWallet,
}) => {
  const [view, setView] = useState<'options' | 'user' | 'ton'>('options');

  useEffect(() => {
    if (!visible) {
      setView('options');
    }
  }, [visible]);

  if (!visible) return null;

  const handleClose = () => {
    setView('options');
    onResetContact();
    onResetWallet();
    onClose();
  };

  const handleSelectOption = (target: 'user' | 'ton') => {
    setView(target);
  };

  const handleBackToOptions = () => {
    setView('options');
  };

  return (
    <div className="fixed inset-0 z-40 bg-slate-950 text-white">
      <AnimatePresence mode="wait">
        {view === 'options' && (
          <motion.div
            key="send-options"
            initial={{ y: '-25%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '-10%', opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="flex h-full items-start justify-center px-4 py-8"
          >
            <div className="relative flex h-[70vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/95 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-900/80 px-5 py-4">
                <span className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Envoyer</span>
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white" onClick={handleClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-6">
                <SendOptionGrid onSelect={handleSelectOption} />
              </div>
            </div>
          </motion.div>
        )}

        {view === 'user' && (
          <motion.div
            key="send-user"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="h-full overflow-y-auto px-4 py-6"
          >
            <SendUserPage
              form={contactForm}
              status={contactStatus}
              statusMessage={contactStatusMessage}
              onChange={onContactChange}
              onConfirm={onContactConfirm}
              onError={onContactError}
              onValidateRecipient={onValidateRecipient}
              onBack={handleBackToOptions}
              onClose={handleClose}
            />
          </motion.div>
        )}

        {view === 'ton' && (
          <motion.div
            key="send-ton"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="h-full overflow-y-auto px-4 py-6"
          >
            <SendTonPage
              form={walletForm}
              status={walletStatus}
              statusMessage={walletStatusMessage}
              onChange={onWalletChange}
              onConfirm={onWalletConfirm}
              onError={onWalletError}
              onBack={handleBackToOptions}
              onClose={handleClose}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SendOptionGrid: React.FC<{ onSelect: (target: 'user' | 'ton') => void }> = ({ onSelect }) => {
  return (
    <div className="flex h-full flex-col space-y-5">
      <div>
        <h2 className="text-2xl font-semibold">Envoyer des FRE</h2>
        <p className="text-sm text-slate-400">
          Choisis entre un transfert vers un utilisateur FrancPay ou un envoi vers la blockchain TON.
        </p>
      </div>
      <div className="space-y-3">
        {sendOptions.map((option) => (
          <Card
            key={option.id}
            className="cursor-pointer border border-slate-800 bg-slate-900/70 text-left transition hover:border-emerald-500/50"
            onClick={() => onSelect(option.id === 'user' ? 'user' : 'ton')}
          >
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-2xl bg-slate-950/80 p-3">
                <option.icon className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-base font-semibold">{option.title}</p>
                <p className="text-xs text-slate-400">{option.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-auto rounded-3xl border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-400">
        Chaque envoi applique un frais fixe de {TRANSFER_FEE_LABEL}, que ce soit vers un utilisateur, un commercant ou
        une adresse TON. Verifie toujours ton montant et l'adresse avant validation.
      </div>
    </div>
  );
};

interface SendUserPanelProps {
  form: { handle: string; amount: string; note: string };
  status: 'idle' | 'pending' | 'success' | 'error';
  statusMessage?: string | null;
  onChange: (form: { handle: string; amount: string; note: string }) => void;
  onConfirm: () => void;
  onError: () => void;
  onValidateRecipient?: (handle: string) => Promise<boolean>;
  onBack: () => void;
  onClose: () => void;
}

const SendUserPage: React.FC<SendUserPanelProps> = ({
  form,
  status,
  statusMessage,
  onChange,
  onConfirm,
  onError,
  onValidateRecipient,
  onBack,
  onClose,
}) => {
  const [confirming, setConfirming] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifyPending, setVerifyPending] = useState(false);
  const amountValue = useMemo(() => Number(form.amount) || 0, [form.amount]);
  const totalDebit = useMemo(() => (amountValue + TRANSFER_FEE_FRE).toFixed(2), [amountValue]);
  const isSubmitting = status === 'pending' || verifyPending;
  const resolvedStatusMessage =
    statusMessage ||
    (status === 'success'
      ? 'Transfert effectue et recu par le contact.'
      : status === 'error'
      ? 'Verifiez l identifiant et reessayez.'
      : '');

  const handleRequestConfirm = async () => {
    if (!form.handle || !form.amount) {
      onError();
      return;
    }
    if (onValidateRecipient) {
      try {
        setVerifyPending(true);
        setVerifyError(null);
        const exists = await onValidateRecipient(form.handle);
        if (!exists) {
          setVerifyError('Utilisateur introuvable. Verifie l identifiant.');
          return;
        }
      } catch (error) {
        console.error('verify_contact_handle_error', error);
        setVerifyError('Impossible de verifier cet utilisateur.');
        return;
      } finally {
        setVerifyPending(false);
      }
    }
    setConfirming(true);
  };

  const handleConfirmSubmit = () => {
    setConfirming(false);
    onConfirm();
  };

  return (
    <>
      <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col space-y-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Choix
          </Button>
          <p className="text-sm font-semibold text-slate-200">Transfert utilisateur</p>
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
          <div>
            <h2 className="text-2xl font-semibold">Envoyer vers un utilisateur</h2>
            <p className="text-sm text-slate-400">Selectionne le contact et confirme le montant du transfert.</p>
          </div>
          <div className="space-y-2">
            <Label className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Identifiant FrancPay</Label>
            <Input
              value={form.handle}
              onChange={(e) => onChange({ ...form, handle: e.target.value })}
              placeholder="@prenom.nom"
              className="bg-slate-900 border-slate-800 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Montant (FRE)</Label>
            <Input
              value={form.amount}
              onChange={(e) => onChange({ ...form, amount: e.target.value })}
              placeholder="0.00"
              className="bg-slate-900 border-slate-800 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Message</Label>
            <Input
              value={form.note}
              onChange={(e) => onChange({ ...form, note: e.target.value })}
              placeholder="Merci pour votre confiance"
              className="bg-slate-900 border-slate-800 text-white"
            />
          </div>
        {status === 'pending' && (
          <div className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-200">
            <Loader2 className="h-5 w-5 animate-spin" />
            Validation de l envoi en cours...
          </div>
        )}
          {status === 'success' && (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-100">
              <CheckCircle2 className="h-5 w-5" />
              {resolvedStatusMessage}
            </div>
          )}
          {status === 'error' && (
            <div className="flex items-center gap-3 rounded-2xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-100">
              <AlertTriangle className="h-5 w-5" />
              {resolvedStatusMessage}
            </div>
          )}
          {verifyError && (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
              {verifyError}
            </div>
          )}
          <p className="text-xs text-slate-500">
            Frais fixe de {TRANSFER_FEE_LABEL} applique aux transferts entre utilisateurs.
          </p>
          <Button
            className="w-full rounded-xl bg-emerald-500 text-slate-950 font-semibold disabled:opacity-50"
            onClick={handleRequestConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Envoi...' : "Confirmer l'envoi"}
          </Button>
        </div>
      </div>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent className="bg-slate-950 border-slate-800 text-white max-w-md w-[90vw] sm:w-[70vw]">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer le transfert</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Verifie les informations avant d'envoyer tes FRE.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 text-sm text-slate-300">
            <p>
              Tu t appretes a envoyer{' '}
              <span className="text-emerald-400 font-semibold">{amountValue.toFixed(2)} FRE</span> a{' '}
              <span className="text-white font-semibold">{form.handle || '-'}</span>.
            </p>
            <p>
              Frais fixes: <span className="font-semibold text-slate-200">{TRANSFER_FEE_LABEL}</span>
            </p>
            <p>
              <span className="text-slate-400">Total debite :</span>{' '}
              <span className="text-white font-semibold">{totalDebit} FRE</span>
            </p>
            {form.note && (
              <p className="text-xs text-slate-400">
                Message: <span className="text-slate-200">{form.note}</span>
              </p>
            )}
          </div>
          <AlertDialogFooter className="mt-4 flex gap-2">
            <AlertDialogCancel className="flex-1 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              className="flex-1 rounded-xl bg-emerald-500 text-slate-950 font-semibold hover:bg-emerald-400"
              onClick={handleConfirmSubmit}
            >
              Confirmer l'envoi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

interface SendTonPanelProps {
  form: { address: string; amount: string; note: string };
  status: 'idle' | 'pending' | 'success' | 'error';
  statusMessage?: string | null;
  onChange: (form: { address: string; amount: string; note: string }) => void;
  onConfirm: () => void;
  onError: () => void;
  onBack: () => void;
  onClose: () => void;
}

const SendTonPage: React.FC<SendTonPanelProps> = ({ form, status, statusMessage, onChange, onConfirm, onError, onBack, onClose }) => {
  const isPending = status === 'pending';
  const resolvedMessage =
    statusMessage ||
    (status === 'success'
      ? 'Paiement transmis au wallet TON.'
      : status === 'error'
      ? 'Impossible de signer la transaction. Merci de verifier ton solde.'
      : '');

  return (
    <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col space-y-6">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Choix
        </Button>
        <p className="text-sm_font-semibold text-slate-200">Envoi via TON</p>
        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
        <div>
          <h2 className="text-2xl font-semibold">Envoyer vers un wallet TON</h2>
          <p className="text-sm text-slate-400">Confirme l adresse avant de lancer la signature sur TonConnect.</p>
        </div>
        <div className="space-y-2">
          <Label className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Adresse TON</Label>
          <Input
            value={form.address}
            onChange={(e) => onChange({ ...form, address: e.target.value })}
            placeholder="ton://wallet"
            className="bg-slate-900 border-slate-800 text-white"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Montant (FRE)</Label>
          <Input
            value={form.amount}
            onChange={(e) => onChange({ ...form, amount: e.target.value })}
            placeholder="0.00"
            className="bg-slate-900 border-slate-800 text-white"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Note (optionnel)</Label>
          <Input
            value={form.note}
            onChange={(e) => onChange({ ...form, note: e.target.value })}
            placeholder="Reference interne"
            className="bg-slate-900 border-slate-800 text-white"
          />
        </div>
        {status === 'pending' && (
          <div className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-200">
            <Loader2 className="h-5 w-5 animate-spin" />
            Validation de la transaction en cours...
          </div>
        )}
        {status === 'success' && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-100">
            <CheckCircle2 className="h-5 w-5" />
            {resolvedMessage}
          </div>
        )}
        {status === 'error' && (
          <div className="flex items-center gap-3 rounded-2xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-100">
            <AlertTriangle className="h-5 w-5" />
            {resolvedMessage}
          </div>
        )}
        <p className="text-xs text-slate-500">
          Frais fixe de {TRANSFER_FEE_LABEL} applique pour chaque envoi via TON.
        </p>
        <div className="flex gap-3">
          <Button
            className="flex-1 rounded-xl bg-emerald-500 text-slate-950 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? 'Validation...' : "Confirmer l'envoi"}
          </Button>
          <Button
            variant="outline"
            className="flex-1 rounded-xl border-red-500/60 text-red-200 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onError}
            disabled={isPending}
          >
            Marquer en echec
          </Button>
        </div>
      </div>
    </div>
  );
};
