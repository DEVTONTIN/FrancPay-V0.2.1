import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QrCode, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { AnimatedCard } from '@/components/ui/AnimatedCard';

interface QRCodeGeneratorProps {
  paymentLink: string;
  amount?: number;
  memo?: string;
}

export const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({
  paymentLink,
  amount,
  memo
}) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(paymentLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <AnimatedCard delay={0.2}>
      <CardHeader className="text-center">
        <CardTitle className="flex items-center gap-2 justify-center text-slate-100">
          <QrCode className="w-5 h-5" />
          QR Code de Paiement
        </CardTitle>
        {amount && (
          <p className="text-emerald-400 font-bold text-xl">
            {amount} $FRE
          </p>
        )}
        {memo && (
          <p className="text-slate-400 text-sm">
            {memo}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {paymentLink ? (
          <>
            <div className="flex justify-center p-4 bg-white rounded-lg">
              <QRCodeSVG
                value={paymentLink}
                size={200}
                bgColor="#ffffff"
                fgColor="#000000"
                level="M"
              />
            </div>
            
            <div className="space-y-2">
              <p className="text-xs text-slate-400 text-center">
                Lien de paiement TON
              </p>
              <div className="flex items-center gap-2 p-2 bg-slate-800/50 rounded text-xs font-mono text-slate-300">
                <span className="flex-1 truncate">{paymentLink}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={copyToClipboard}
                  className="h-6 w-6 p-0"
                >
                  {copied ? (
                    <Check className="w-3 h-3 text-green-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <QrCode className="w-16 h-16 mx-auto text-slate-400 mb-4" />
            <p className="text-slate-400">
              Entrez un montant pour générer le QR Code
            </p>
          </div>
        )}
      </CardContent>
    </AnimatedCard>
  );
};