import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet, Coins } from 'lucide-react';
import { useTonWallet } from '@/hooks/useTonWallet';
import { formatBalance, formatTonAddress } from '@/lib/ton';
import { AnimatedCard } from '@/components/ui/AnimatedCard';

export const WalletBalance: React.FC = () => {
  const { address, balance, isLoading, isConnected } = useTonWallet();

  if (!isConnected) {
    return (
      <AnimatedCard>
        <CardHeader className="text-center">
          <Wallet className="w-12 h-12 mx-auto text-slate-400 mb-4" />
          <CardTitle className="text-slate-300">Portefeuille Non Connecté</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400 text-center">
            Connectez votre wallet TON pour voir votre solde
          </p>
        </CardContent>
      </AnimatedCard>
    );
  }

  return (
    <AnimatedCard>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-100">
          <Wallet className="w-5 h-5" />
          Portefeuille Personnel
        </CardTitle>
        {address && (
          <Badge variant="secondary" className="w-fit text-xs font-mono">
            {formatTonAddress(address)}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-8 bg-slate-700 rounded animate-pulse"></div>
            <div className="h-8 bg-slate-700 rounded animate-pulse"></div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                  <Coins className="w-4 h-4 text-white" />
                </div>
                <span className="text-slate-300 font-medium">Franc Numérique</span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-emerald-400">
                  {formatBalance(balance.fre)} $FRE
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <Coins className="w-4 h-4 text-white" />
                </div>
                <span className="text-slate-300 font-medium">TON</span>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-blue-400">
                  {formatBalance(balance.ton)} TON
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </AnimatedCard>
  );
};