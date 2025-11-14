import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Send, QrCode } from 'lucide-react';
import { WalletBalance } from '@/components/wallet/WalletBalance';
import { QRCodeGenerator } from '@/components/wallet/QRCodeGenerator';
import { SendPayment } from '@/components/wallet/SendPayment';
import { useTonWallet } from '@/hooks/useTonWallet';

export const AppDemoSection: React.FC = () => {
  const [demoAmount, setDemoAmount] = useState('');
  const [demoMemo, setDemoMemo] = useState('');
  const { generatePaymentLink, address } = useTonWallet();

  const demoPaymentLink = demoAmount ? generatePaymentLink(parseFloat(demoAmount) || 0, demoMemo) : '';

  return (
    <section className="py-20 px-4 relative">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Démo
            <span className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent"> Interactive</span>
          </h2>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto">
            Explorez les fonctionnalités de FrancPay avec notre démo interactive
          </p>
        </motion.div>

        {/* Wallet Status Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          <div className="lg:col-span-3">
            <WalletBalance />
          </div>
        </div>

        {/* Main Demo Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <SendPayment />
          
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                Générateur de QR Code Demo
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="demo-amount" className="text-slate-300">
                    Montant (FRE)
                  </Label>
                  <Input
                    id="demo-amount"
                    type="number"
                    step="0.01"
                    placeholder="100.00"
                    value={demoAmount}
                    onChange={(e) => setDemoAmount(e.target.value)}
                    className="bg-slate-800/50 border-slate-700 text-slate-100"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="demo-memo" className="text-slate-300">
                    Mémo
                  </Label>
                  <Textarea
                    id="demo-memo"
                    placeholder="Paiement FrancPay"
                    value={demoMemo}
                    onChange={(e) => setDemoMemo(e.target.value)}
                    className="bg-slate-800/50 border-slate-700 text-slate-100 resize-none"
                    rows={2}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* QR Code Display */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-start-2">
            <QRCodeGenerator
              paymentLink={demoPaymentLink}
              amount={parseFloat(demoAmount) || undefined}
              memo={demoMemo || undefined}
            />
          </div>
        </div>
      </div>
    </section>
  );
};