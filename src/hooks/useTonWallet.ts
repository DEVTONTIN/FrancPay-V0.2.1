import { useState, useEffect } from 'react';
import { useTonWallet as useTonWalletConnect, useTonAddress } from '@tonconnect/ui-react';

export interface WalletBalance {
  fre: number;
  ton: number;
}

export const useTonWallet = () => {
  const wallet = useTonWalletConnect();
  const address = useTonAddress();
  const [balance, setBalance] = useState<WalletBalance>({ fre: 0, ton: 0 });
  const [isLoading, setIsLoading] = useState(false);

  // Simulate balance fetching (replace with actual TON blockchain calls)
  useEffect(() => {
    if (wallet && address) {
      setIsLoading(true);
      // Simulate API call delay
      const timer = setTimeout(() => {
        // Mock balance data - replace with actual blockchain queries
        setBalance({
          fre: Math.floor(Math.random() * 10000) / 100, // Random FRE balance
          ton: Math.floor(Math.random() * 1000) / 100,  // Random TON balance
        });
        setIsLoading(false);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [wallet, address]);

  const sendPayment = async (recipient: string, amount: number, memo?: string) => {
    if (!wallet) throw new Error('Wallet not connected');
    
    // Mock payment transaction - replace with actual TON transaction
    console.log('Sending payment:', { recipient, amount, memo });
    
    // Simulate transaction delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Update balance after transaction
    setBalance(prev => ({
      ...prev,
      fre: Math.max(0, prev.fre - amount)
    }));

    return {
      success: true,
      txHash: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
  };

  const generatePaymentLink = (amount: number, memo?: string): string => {
    if (!address) return '';
    
    const params = new URLSearchParams({
      amount: amount.toString(),
      text: memo || 'FrancPay Payment'
    });
    
    return `ton://transfer/${address}?${params.toString()}`;
  };

  return {
    wallet,
    address,
    balance,
    isLoading,
    isConnected: !!wallet,
    sendPayment,
    generatePaymentLink
  };
};