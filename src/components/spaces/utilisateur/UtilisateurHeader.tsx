import React from 'react';
import { ChevronsUpDown, Menu } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type BalanceDisplayCurrency = 'FRE' | 'EUR' | 'USDT' | 'TON';

interface CurrencyOption {
  id: BalanceDisplayCurrency;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface UtilisateurHeaderProps {
  username: string;
  showBalance: boolean;
  balanceWhole: string;
  balanceCents: string;
  balanceCurrency: BalanceDisplayCurrency;
  onChangeCurrency?: (currency: BalanceDisplayCurrency) => void;
  currencyOptions?: CurrencyOption[];
  conversionHint?: string | null;
}

export const UtilisateurHeader: React.FC<UtilisateurHeaderProps> = ({
  username,
  showBalance,
  balanceWhole,
  balanceCents,
  balanceCurrency,
  onChangeCurrency,
  currencyOptions = [],
  conversionHint,
}) => {
  const renderCurrencyTrigger = () => {
    const triggerButton = (
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-full border border-emerald-500/60 bg-emerald-500/10 px-3 py-1 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
      >
        <span>{balanceCurrency}</span>
        <ChevronsUpDown className="h-3.5 w-3.5" />
      </button>
    );

    if (!currencyOptions.length || !onChangeCurrency) {
      return triggerButton;
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{triggerButton}</DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={10} className="bg-slate-900 text-white border-slate-800">
          <DropdownMenuRadioGroup
            value={balanceCurrency}
            onValueChange={(value) => onChangeCurrency(value as BalanceDisplayCurrency)}
          >
            {currencyOptions.map((option) => (
              <DropdownMenuRadioItem
                key={option.id}
                value={option.id}
                disabled={option.disabled}
                className="focus:bg-slate-800 data-[disabled]:opacity-40 data-[disabled]:line-through"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{option.label}</span>
                  {option.description && <span className="text-[11px] text-slate-400">{option.description}</span>}
                </div>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          {conversionHint && (
            <p className="mt-2 border-t border-slate-800 pt-2 text-[10px] text-slate-400">{conversionHint}</p>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <header className="space-y-4">
      <div className="flex items-center gap-3 text-sm text-slate-200">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="p-2 rounded-full bg-slate-900/80 border border-slate-800 hover:bg-slate-900 transition-colors"
              aria-label="Menu"
            >
              <Menu className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            sideOffset={8}
            className="bg-slate-950 text-white border-slate-800 min-w-[200px]"
          >
            <DropdownMenuItem
              className="focus:bg-slate-900 cursor-pointer"
              onSelect={(event) => {
                event.preventDefault();
                const target = `${window.location.origin}/#faq`;
                window.open(target, '_blank', 'noopener,noreferrer');
              }}
            >
              FAQ
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="flex items-baseline gap-2 text-white">
          <span className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Compte</span>
          <span className="text-sm font-semibold">{username}</span>
        </div>
      </div>
      {showBalance && (
        <div className="text-center space-y-2">
          <div className="inline-flex items-baseline gap-2">
            <span className="text-5xl font-semibold tracking-tight tabular-nums">{balanceWhole}</span>
            <span className="text-xl font-semibold tabular-nums">,{balanceCents}</span>
            {renderCurrencyTrigger()}
          </div>
          {conversionHint && (
            <p className="text-[11px] text-slate-400">{conversionHint}</p>
          )}
        </div>
      )}
    </header>
  );
};
