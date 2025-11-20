import React from 'react';
import { Home, Send, History } from 'lucide-react';

type MobileNavTab = 'home' | 'invest' | 'pay' | 'settings';

interface MobileNavProps {
  active: MobileNavTab;
  onChange: (tab: MobileNavTab) => void;
  onHistory?: () => void;
  historyActive?: boolean;
}

const items: Array<{
  id: MobileNavTab;
  label: string;
  icon: React.ReactNode;
}> = [
  { id: 'home', label: 'Accueil', icon: <Home className="h-4 w-4" /> },
  { id: 'invest', label: 'Investir', icon: <Home className="h-4 w-4" /> },
  { id: 'pay', label: 'Payer', icon: <Send className="h-4 w-4" /> },
  { id: 'settings', label: 'Historique', icon: <History className="h-4 w-4" /> },
];

export const MobileNav: React.FC<MobileNavProps> = ({ active, onChange, onHistory, historyActive }) => {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 bg-slate-950/95 border-t border-slate-800 backdrop-blur"
      style={{
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)',
      }}
    >
      <div className="max-w-xl mx-auto flex justify-around items-center px-4 py-2">
        {items.map((item) => {
          const isHistory = item.id === 'settings';
          const isActive = isHistory ? historyActive : item.id === active;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => (isHistory ? onHistory?.() : onChange(item.id))}
              className={`flex flex-col items-center gap-0.5 text-[11px] font-medium transition-colors ${
                isActive ? 'text-emerald-400' : 'text-slate-400'
              }`}
            >
              <span
                className={`p-1.5 rounded-full ${
                  isActive ? 'bg-emerald-500/10' : 'bg-transparent'
                }`}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
