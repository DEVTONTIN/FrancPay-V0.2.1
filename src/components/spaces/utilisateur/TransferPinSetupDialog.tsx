import React, { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, ScanFace, Delete, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface TransferPinSetupDialogProps {
  open: boolean;
  pending: boolean;
  error?: string | null;
  email?: string | null;
  onSubmit: (pin: string) => void;
  onLogout?: () => void;
}

const maskEmail = (email?: string | null) => {
  if (!email) return 'ton compte';
  const [local, domain] = email.split('@');
  if (!domain) return email;
  if (local.length <= 3) return `${local}...@${domain}`;
  return `${local.slice(0, 3)}...@${domain}`;
};

const keypadLayout: Array<Array<string | 'scan' | 'backspace'>> = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['scan', '0', 'backspace'],
];

export const TransferPinSetupDialog: React.FC<TransferPinSetupDialogProps> = ({
  open,
  pending,
  error,
  email,
  onSubmit,
  onLogout,
}) => {
  const [pinDigits, setPinDigits] = useState<string[]>([]);
  const [firstEntry, setFirstEntry] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [step, setStep] = useState<'create' | 'confirm'>('create');

  useEffect(() => {
    if (!open) {
      setPinDigits([]);
      setFirstEntry(null);
      setLocalError(null);
      setStep('create');
    }
  }, [open]);

  const handleDigit = (digit: string) => {
    if (pending) return;
    setLocalError(null);
    setPinDigits((prev) => {
      if (prev.length >= 4) return prev;
      return [...prev, digit];
    });
  };

  const handleBackspace = () => {
    if (pending) return;
    setPinDigits((prev) => prev.slice(0, -1));
  };

  useEffect(() => {
    if (pinDigits.length !== 4 || pending) return;
    const candidate = pinDigits.join('');
    if (!firstEntry) {
      setFirstEntry(candidate);
      setPinDigits([]);
      setStep('confirm');
      setLocalError(null);
      return;
    }
    if (candidate !== firstEntry) {
      setLocalError('Les deux codes doivent correspondre.');
      setPinDigits([]);
      return;
    }
    setLocalError(null);
    onSubmit(candidate);
    setPinDigits([]);
  }, [pinDigits, pending, firstEntry, onSubmit]);

  const resolvedError = localError || error;
  const maskedEmail = useMemo(() => maskEmail(email), [email]);

  const headline = step === 'confirm' ? 'Confirme le code' : 'Entrez le code d acces';
  const subline =
    step === 'confirm'
      ? 'Saisis le meme code pour le confirmer.'
      : `Saisis le code d acces pour ${maskedEmail}.`;

  return (
    <Dialog open={open}>
      <DialogContent
        className="bg-slate-950 text-white border-slate-800 sm:max-w-md"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader className="text-center space-y-2">
          <DialogTitle className="flex flex-col items-center gap-2 text-xl font-semibold">
            <ShieldCheck className="h-8 w-8 text-emerald-400" />
            {headline}
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-sm">{subline}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 pt-4">
          <div className="flex gap-3">
            {[0, 1, 2, 3].map((index) => (
              <span
                key={`pin-dot-${index}`}
                className={`h-5 w-5 rounded-full border border-slate-700 bg-slate-900 ${
                  pinDigits[index] ? 'bg-emerald-500/70 border-emerald-400' : ''
                }`}
              />
            ))}
          </div>

          {resolvedError && (
            <p className="text-sm text-red-400 rounded-2xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-center">
              {resolvedError}
            </p>
          )}

          {pending && (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Enregistrement du code...
            </div>
          )}

          <div className="w-full space-y-3">
            {keypadLayout.map((row, rowIndex) => (
              <div key={`row-${rowIndex}`} className="flex justify-center gap-3">
                {row.map((value, columnIndex) => {
                  if (value === 'scan') {
                    return (
                      <button
                        key={`scan-${columnIndex}`}
                        type="button"
                        className="h-16 w-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500"
                        disabled
                      >
                        <ScanFace className="h-6 w-6" />
                      </button>
                    );
                  }
                  if (value === 'backspace') {
                    return (
                      <button
                        key={`backspace-${columnIndex}`}
                        type="button"
                        className="h-16 w-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-100 disabled:opacity-40"
                        onClick={handleBackspace}
                        disabled={pending || pinDigits.length === 0}
                      >
                        <Delete className="h-6 w-6" />
                      </button>
                    );
                  }
                  return (
                    <button
                      key={`digit-${value}`}
                      type="button"
                      className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/40 text-xl font-semibold text-emerald-100 hover:bg-emerald-500/20 transition disabled:opacity-40"
                      onClick={() => handleDigit(String(value))}
                      disabled={pending}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4">
          <Button variant="link" className="text-slate-400 hover:text-slate-100" onClick={onLogout}>
            Deconnecter
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
