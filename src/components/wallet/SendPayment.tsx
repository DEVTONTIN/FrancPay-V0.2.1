import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2 } from 'lucide-react';
import { useTonWallet } from '@/hooks/useTonWallet';
import { validateTonAddress } from '@/lib/ton';
import { toast } from '@/hooks/use-toast';
import { AnimatedCard } from '@/components/ui/AnimatedCard';

export const SendPayment: React.FC = () => {
  const { sendPayment, isConnected, balance } = useTonWallet();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected) {
      toast({
        title: "Erreur",
        description: "Veuillez connecter votre wallet",
        variant: "destructive"
      });
      return;
    }

    if (!validateTonAddress(recipient)) {
      toast({
        title: "Erreur",
        description: "Adresse TON invalide",
        variant: "destructive"
      });
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({
        title: "Erreur",
        description: "Montant invalide",
        variant: "destructive"
      });
      return;
    }

    if (amountNum > balance.fre) {
      toast({
        title: "Erreur",
        description: "Solde insuffisant",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      await sendPayment(recipient, amountNum, memo);
      toast({
        title: "Succès",
        description: `${amountNum} $FRE envoyés avec succès`,
      });
      setRecipient('');
      setAmount('');
      setMemo('');
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Échec de l'envoi du paiement",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatedCard delay={0.1}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-100">
          <Send className="w-5 h-5" />
          Envoyer un Paiement
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recipient" className="text-slate-300">
              Adresse du destinataire
            </Label>
            <Input
              id="recipient"
              placeholder="EQD..."
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="bg-slate-800/50 border-slate-700 text-slate-100"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount" className="text-slate-300">
              Montant (FRE)
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-slate-800/50 border-slate-700 text-slate-100"
              required
            />
            {isConnected && (
              <p className="text-xs text-slate-400">
                Solde disponible: {balance.fre.toFixed(2)} $FRE
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="memo" className="text-slate-300">
              Mémo (optionnel)
            </Label>
            <Textarea
              id="memo"
              placeholder="Note pour le destinataire..."
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="bg-slate-800/50 border-slate-700 text-slate-100 resize-none"
              rows={3}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={!isConnected || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Envoyer le Paiement
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </AnimatedCard>
  );
};