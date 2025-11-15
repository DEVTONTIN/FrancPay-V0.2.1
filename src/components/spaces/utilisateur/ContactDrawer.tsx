import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
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
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { TRANSFER_FEE_FRE, TRANSFER_FEE_LABEL } from '@/config/fees';

interface ContactDrawerProps {
  open: boolean;
  form: { handle: string; amount: string; note: string };
  status: 'idle' | 'success' | 'error';
  onChange: (form: { handle: string; amount: string; note: string }) => void;
  onClose: () => void;
  onConfirm: () => void;
  onError: () => void;
  onValidateRecipient?: (handle: string) => Promise<boolean>;
}

export const ContactDrawer: React.FC<ContactDrawerProps> = ({
  open,
  form,
  status,
  onChange,
  onClose,
  onConfirm,
  onError,
  onValidateRecipient,
}) => {
  const [confirming, setConfirming] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifyPending, setVerifyPending] = useState(false);
  const amountValue = useMemo(() => Number(form.amount) || 0, [form.amount]);
  const totalDebit = useMemo(() => (amountValue + TRANSFER_FEE_FRE).toFixed(2), [amountValue]);

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
          setVerifyError('Utilisateur introuvable. Vérifiez l’identifiant.');
          return;
        }
      } catch (error) {
        console.error('verify_contact_handle_error', error);
        setVerifyError('Impossible de vérifier cet utilisateur.');
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
      <Drawer open={open} onOpenChange={(value) => {
      if (!value) onClose();
    }}>
      <DrawerContent className="h-[88vh] md:h-[80vh] bg-slate-950 text-white border-slate-800">
        <DrawerHeader className="text-left">
          <DrawerTitle>Transfert vers un utilisateur FrancPay</DrawerTitle>
          <DrawerDescription className="text-slate-400">
            Selectionnez le contact et confirmez le montant.
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 py-4 space-y-4">
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
          {status === 'success' && (
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-100 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5" />
              Transfert effectue et recu par le contact.
            </div>
          )}
          {status === 'error' && (
            <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-100 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5" />
              Verifiez l'identifiant et reessayez.
            </div>
          )}
          {verifyError && (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
              {verifyError}
            </div>
          )}
          <p className="text-xs text-slate-500">
            Frais fixe de {TRANSFER_FEE_LABEL} appliqué aux transferts entre utilisateurs.
          </p>
          <div className="flex gap-3">
            <Button
              className="flex-1 rounded-xl bg-emerald-500 text-slate-950 font-semibold disabled:opacity-50"
              onClick={handleRequestConfirm}
              disabled={verifyPending}
            >
              {verifyPending ? 'Vérification...' : "Confirmer l'envoi"}
            </Button>
          </div>
        </div>
        <DrawerClose className="absolute top-4 right-4 text-slate-500 hover:text-white">X</DrawerClose>
      </DrawerContent>
    </Drawer>

    <AlertDialog open={confirming} onOpenChange={setConfirming}>
      <AlertDialogContent className="bg-slate-950 border-slate-800 text-white max-w-md w-[90vw] sm:w-[70vw]">
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmer le transfert</AlertDialogTitle>
          <AlertDialogDescription className="text-slate-400">
            Vérifiez les informations avant d'envoyer vos FRE.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-3 text-sm text-slate-300">
          <p>
            Vous vous apprêtez à envoyer{' '}
            <span className="text-emerald-400 font-semibold">{amountValue.toFixed(2)} FRE</span> à{' '}
            <span className="text-white font-semibold">{form.handle || '—'}</span>.
          </p>
          <p>
            Frais fixes: <span className="font-semibold text-slate-200">{TRANSFER_FEE_LABEL}</span>
          </p>
          <p>
            <span className="text-slate-400">Total débité:</span>{' '}
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
