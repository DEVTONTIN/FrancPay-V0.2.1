import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  CreditCard, 
  QrCode, 
  Check, 
  X, 
  Clock, 
  Euro,
  Smartphone,
  Loader2,
  RefreshCw,
  Plus
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { formatBalance } from '@/lib/ton';
import { AnimatedCard } from '@/components/ui/AnimatedCard';

interface Transaction {
  id: string;
  amount: number;
  description: string;
  timestamp: Date;
  status: 'pending' | 'success' | 'failed';
  customerId?: string;
  customerWalletId?: string;
}

interface Customer {
  id: string;
  walletId: string;
  totalSpent: number;
  transactionCount: number;
  firstSeen: Date;
  lastSeen: Date;
}

export const POSInterface: React.FC = () => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [currentTransaction, setCurrentTransaction] = useState<Transaction | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPOSModal, setShowPOSModal] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'waiting' | 'success' | 'failed'>('waiting');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Simuler la vérification du paiement
  useEffect(() => {
    if (currentTransaction && paymentStatus === 'waiting') {
      const timer = setTimeout(() => {
        // Simuler 80% de succès, 20% d'échec
        const success = Math.random() > 0.2;
        
        // Simuler l'ID client ToWallet (format réaliste)
        const mockWalletId = `tw_${Math.random().toString(36).substr(2, 12)}`;
        const customerId = `cust_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        
        setPaymentStatus(success ? 'success' : 'failed');
        
        if (success) {
          // Créer ou mettre à jour le client
          setCustomers(prev => {
            const existingCustomer = prev.find(c => c.walletId === mockWalletId);
            
            if (existingCustomer) {
              // Client existant - mettre à jour
              return prev.map(c => 
                c.walletId === mockWalletId 
                  ? {
                      ...c,
                      totalSpent: c.totalSpent + currentTransaction.amount,
                      transactionCount: c.transactionCount + 1,
                      lastSeen: new Date()
                    }
                  : c
              );
            } else {
              // Nouveau client
              const newCustomer: Customer = {
                id: customerId,
                walletId: mockWalletId,
                totalSpent: currentTransaction.amount,
                transactionCount: 1,
                firstSeen: new Date(),
                lastSeen: new Date()
              };
              return [newCustomer, ...prev];
            }
          });
          
          // Mettre à jour la transaction avec les infos client
          const updatedTransaction = {
            ...currentTransaction,
            status: 'success' as const,
            customerId: customerId,
            customerWalletId: mockWalletId
          };
          
          setTransactions(prev => [updatedTransaction, ...prev.slice(0, 9)]);
        } else {
          // Échec du paiement
          const updatedTransaction = {
            ...currentTransaction,
            status: 'failed' as const
          };
          
          setTransactions(prev => [updatedTransaction, ...prev.slice(0, 9)]);
        }
        
        // Fermer le modal après 3 secondes
        setTimeout(() => {
          setShowPaymentModal(false);
          setShowPOSModal(false);
          setCurrentTransaction(null);
          setPaymentStatus('waiting');
          if (success) {
            setAmount('');
            setDescription('');
          }
        }, 3000);
      }, Math.random() * 3000 + 2000); // 2-5 secondes

      return () => clearTimeout(timer);
    }
  }, [currentTransaction, paymentStatus]);

  const generatePaymentQR = () => {
    if (!amount || parseFloat(amount) <= 0) return '';
    
    // Générer le lien ToWallet.site
    const params = new URLSearchParams({
      amount: amount,
      currency: 'FRE',
      description: description || 'Paiement FrancPay',
      merchant: 'FrancPay POS',
      return_url: window.location.origin
    });
    
    return `https://towallet.site/pay?${params.toString()}`;
  };

  const handleCreatePayment = () => {
    if (!amount || parseFloat(amount) <= 0) return;
    
    const transaction: Transaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount: parseFloat(amount),
      description: description || 'Paiement',
      timestamp: new Date(),
      status: 'pending'
    };
    
    setCurrentTransaction(transaction);
    setShowPaymentModal(true);
    setPaymentStatus('waiting');
  };

  const handleCancelPayment = () => {
    setShowPaymentModal(false);
    setShowPOSModal(false);
    setCurrentTransaction(null);
    setPaymentStatus('waiting');
  };

  const handleOpenPOS = () => {
    setShowPOSModal(true);
    setAmount('');
    setDescription('');
  };

  const paymentQR = generatePaymentQR();

  return (
    <>
      {/* Bouton pour ouvrir le terminal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnimatedCard>
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center">
              <CreditCard className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-slate-100 mb-4">
              Terminal de Paiement
            </h3>
            <p className="text-slate-400 mb-6 leading-relaxed">
              Encaissez vos paiements en $FRE avec un QR code. Simple et rapide comme un TPE traditionnel.
            </p>
            <Button 
              onClick={handleOpenPOS}
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nouveau Paiement
            </Button>
          </CardContent>
        </AnimatedCard>

        {/* Historique des transactions */}
        <AnimatedCard delay={0.1}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-100">
              <Clock className="w-5 h-5" />
              Transactions Récentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {transactions.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                  <p className="text-slate-400">Aucune transaction</p>
                </div>
              ) : (
                transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-slate-700/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        tx.status === 'success' 
                          ? 'bg-emerald-500/20 text-emerald-400' 
                          : tx.status === 'failed'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {tx.status === 'success' ? (
                          <Check className="w-4 h-4" />
                        ) : tx.status === 'failed' ? (
                          <X className="w-4 h-4" />
                        ) : (
                          <Clock className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <p className="text-slate-200 font-medium text-sm">
                          {tx.description}
                        </p>
                        <div className="flex items-center gap-2 text-slate-500 text-xs">
                          <span>{tx.timestamp.toLocaleTimeString('fr-FR')}</span>
                          {tx.customerWalletId && (
                            <>
                              <span>•</span>
                              <span className="font-mono">ID: {tx.customerWalletId.slice(-6)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${
                        tx.status === 'success' ? 'text-emerald-400' : 'text-slate-400'
                      }`}>
                        {formatBalance(tx.amount)} $FRE
                      </p>
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${
                          tx.status === 'success' 
                            ? 'bg-emerald-500/10 text-emerald-400' 
                            : tx.status === 'failed'
                            ? 'bg-red-500/10 text-red-400'
                            : 'bg-yellow-500/10 text-yellow-400'
                        }`}
                      >
                        {tx.status === 'success' ? 'Payé' : tx.status === 'failed' ? 'Échec' : 'En cours'}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
              
              {/* Statistiques clients */}
              {customers.length > 0 && (
                <div className="mt-4 p-3 bg-slate-800/20 rounded-lg border-t border-slate-700">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Clients uniques:</span>
                    <span className="text-slate-300 font-medium">{customers.length}</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </AnimatedCard>
      </div>

      {/* Modal Terminal de Paiement */}
      <Dialog open={showPOSModal} onOpenChange={setShowPOSModal}>
        <DialogContent className="sm:max-w-4xl bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-100 text-xl">
              <CreditCard className="w-6 h-6" />
              Terminal de Paiement FrancPay
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Interface de saisie - Style TPE */}
            <div className="space-y-6">
              {/* Affichage du montant - Style calculatrice */}
              <div className="bg-slate-800 p-6 rounded-lg border-2 border-slate-700">
                <div className="text-right">
                  <div className="text-sm text-slate-400 mb-1">Montant à encaisser</div>
                  <div className="text-4xl font-bold text-emerald-400 font-mono">
                    {amount || '0.00'} <span className="text-2xl">$FRE</span>
                  </div>
                </div>
              </div>

              {/* Saisie rapide du montant */}
              <div className="grid grid-cols-3 gap-3">
                {[10, 25, 50, 100, 200, 500].map((preset) => (
                  <Button
                    key={preset}
                    variant="outline"
                    onClick={() => setAmount(preset.toString())}
                    className="h-12 text-lg font-semibold border-slate-600 hover:bg-slate-700"
                  >
                    {preset} $FRE
                  </Button>
                ))}
              </div>

              {/* Saisie manuelle */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="custom-amount" className="text-slate-300 font-medium">
                    Montant personnalisé
                  </Label>
                  <Input
                    id="custom-amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="bg-slate-800/50 border-slate-700 text-slate-100 text-lg h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-slate-300 font-medium">
                    Description (optionnel)
                  </Label>
                  <Input
                    id="description"
                    placeholder="Produit ou service..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-slate-800/50 border-slate-700 text-slate-100"
                  />
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="flex gap-3">
                <Button
                  onClick={handleCreatePayment}
                  disabled={!amount || parseFloat(amount) <= 0}
                  className="flex-1 h-14 text-lg font-semibold bg-emerald-600 hover:bg-emerald-500"
                >
                  <QrCode className="w-5 h-5 mr-2" />
                  Générer QR Code
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setAmount('');
                    setDescription('');
                  }}
                  className="h-14 px-6 border-slate-600 hover:bg-slate-700"
                >
                  <RefreshCw className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Aperçu QR Code */}
            <div className="flex items-center justify-center">
              {paymentQR ? (
                <div className="text-center space-y-4">
                  <div className="p-4 bg-white rounded-lg">
                    <QRCodeSVG
                      value={paymentQR}
                      size={200}
                      bgColor="#ffffff"
                      fgColor="#000000"
                      level="M"
                    />
                  </div>
                  <p className="text-slate-400 text-sm">
                    QR Code prêt à scanner
                  </p>
                </div>
              ) : (
                <div className="text-center py-12">
                  <QrCode className="w-16 h-16 mx-auto text-slate-400 mb-4" />
                  <p className="text-slate-400">
                    Entrez un montant pour générer le QR Code
                  </p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de paiement */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-center text-slate-100">
              {paymentStatus === 'waiting' && 'Paiement en attente'}
              {paymentStatus === 'success' && 'Paiement réussi !'}
              {paymentStatus === 'failed' && 'Paiement échoué'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <AnimatePresence mode="wait">
              {paymentStatus === 'waiting' && (
                <motion.div
                  key="waiting"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="text-center space-y-4"
                >
                  {paymentQR && (
                    <div className="flex justify-center p-4 bg-white rounded-lg">
                      <QRCodeSVG
                        value={paymentQR}
                        size={200}
                        bgColor="#ffffff"
                        fgColor="#000000"
                        level="M"
                      />
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <Smartphone className="w-5 h-5 text-blue-400" />
                      <span className="text-slate-300">Scannez avec ToWallet</span>
                    </div>
                    <p className="text-2xl font-bold text-emerald-400">
                      {currentTransaction && formatBalance(currentTransaction.amount)} $FRE
                    </p>
                    <p className="text-slate-400">
                      {currentTransaction?.description}
                    </p>
                    <p className="text-xs text-slate-500">
                      Transaction ID: {currentTransaction?.id.slice(-8)}
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-yellow-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">En attente du paiement...</span>
                  </div>
                </motion.div>
              )}

              {paymentStatus === 'success' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center space-y-4"
                >
                  <div className="w-16 h-16 mx-auto bg-emerald-500/20 rounded-full flex items-center justify-center">
                    <Check className="w-8 h-8 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-emerald-400 mb-2">
                      Paiement confirmé !
                    </h3>
                    <p className="text-3xl font-bold text-white mb-1">
                      {currentTransaction && formatBalance(currentTransaction.amount)} $FRE
                    </p>
                    <p className="text-slate-400">
                      {currentTransaction?.description}
                    </p>
                    {currentTransaction?.customerWalletId && (
                      <p className="text-xs text-slate-500 font-mono">
                        Client ToWallet: {currentTransaction.customerWalletId}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}

              {paymentStatus === 'failed' && (
                <motion.div
                  key="failed"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center space-y-4"
                >
                  <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center">
                    <X className="w-8 h-8 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-red-400 mb-2">
                      Paiement échoué
                    </h3>
                    <p className="text-slate-400 mb-4">
                      Le paiement n'a pas pu être traité
                    </p>
                    <Button
                      onClick={handleCancelPayment}
                      variant="outline"
                      className="border-slate-600 hover:bg-slate-700"
                    >
                      Réessayer
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {paymentStatus === 'waiting' && (
              <Button
                onClick={handleCancelPayment}
                variant="outline"
                className="w-full border-slate-600 hover:bg-slate-700"
              >
                Annuler
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};