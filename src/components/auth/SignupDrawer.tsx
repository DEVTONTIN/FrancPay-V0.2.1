import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { ArrowRight, X } from 'lucide-react';

type ProfileChoice = 'utilisateur';

interface SignupDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectProfile: (type: ProfileChoice) => void;
}

export const SignupDrawer: React.FC<SignupDrawerProps> = ({
  open,
  onOpenChange,
  onSelectProfile,
}) => {
  const handleSelect = (type: ProfileChoice) => {
    onSelectProfile(type);
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[75vh] bg-slate-950 text-white border-slate-800">
        <DrawerHeader className="space-y-2">
          <div className="text-sm text-emerald-400 uppercase tracking-[0.3em]">
            Espace utilisateur
          </div>
          <DrawerTitle className="text-2xl">
            Inscrivez-vous sur FrancPay
          </DrawerTitle>
          <DrawerDescription className="text-slate-400">
            Une expérience mobile-first pour gérer et utiliser vos FRE.
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 py-4 grid gap-3">
          {([
            {
              type: 'utilisateur' as ProfileChoice,
              title: 'Compte Utilisateur',
              tag: 'Particulier',
              highlights: [
                'Paiements mobiles en FRE',
                'Suivi de solde & dépôts',
                'Support prioritaire FrancPay',
              ],
              accent: 'from-emerald-500/80 to-cyan-500/80',
            },
          ] as const).map((option) => (
            <button
              key={option.type}
              onClick={() => handleSelect(option.type)}
              className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 text-left transition hover:border-emerald-500/50 focus:outline-none"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                    {option.tag}
                  </p>
                  <p className="text-lg font-semibold text-white">
                    {option.title}
                  </p>
                </div>
                <span
                  className={`h-10 w-10 rounded-full bg-gradient-to-br ${option.accent} flex items-center justify-center text-sm`}
                >
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
              <ul className="mt-3 space-y-1 text-xs text-slate-300">
                {option.highlights.map((line) => (
                  <li key={line} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    {line}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>

        <DrawerClose className="absolute top-4 right-4 text-slate-500 hover:text-white">
          <X className="h-4 w-4" />
        </DrawerClose>
      </DrawerContent>
    </Drawer>
  );
};
