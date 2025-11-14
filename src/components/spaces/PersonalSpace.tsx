import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Wallet,
  RefreshCw,
  MessageSquare,
  Shield,
  CreditCard,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Filter,
  Search,
  ArrowUpRight, 
  ArrowDownLeft,
  Clock,
  Banknote,
  TrendingUp,
  Users,
  Settings,
  History
} from 'lucide-react';
import { useTonWallet } from '@/hooks/useTonWallet';
import { formatBalance } from '@/lib/ton';
import { AnimatedCard } from '@/components/ui/AnimatedCard';

// Mock data pour l'espace professionnel
const mockBusinessBalance = {
  available: 15750.25,
  pending: 1250.75,
  withdrawn: 45000.00,
  totalEarned: 62001.00
};

const mockWithdrawals = [
  {
    id: '1',
    amount: 5000.00,
    bankAccount: '****1234',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    status: 'completed',
    fees: 25.00
  },
  {
    id: '2',
    amount: 2500.00,
    bankAccount: '****1234',
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    status: 'pending',
    fees: 12.50
  },
  {
    id: '3',
    amount: 10000.00,
    bankAccount: '****5678',
    timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    status: 'completed',
    fees: 50.00
  }
];

const mockRefunds = [
  {
    id: 'ref_1',
    originalTransactionId: 'tx_abc123',
    amount: 89.99,
    reason: 'Produit défectueux',
    customerWallet: 'tw_customer123',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    status: 'completed'
  },
  {
    id: 'ref_2',
    originalTransactionId: 'tx_def456',
    amount: 45.50,
    reason: 'Annulation commande',
    customerWallet: 'tw_customer456',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
    status: 'pending'
  }
];

const mockSupportTickets = [
  {
    id: 'ticket_1',
    subject: 'Problème de paiement',
    customerWallet: 'tw_customer789',
    status: 'open',
    priority: 'high',
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    lastMessage: 'Le client n\'arrive pas à finaliser son paiement'
  },
  {
    id: 'ticket_2',
    subject: 'Demande de remboursement',
    customerWallet: 'tw_customer101',
    status: 'resolved',
    priority: 'medium',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    lastMessage: 'Remboursement effectué avec succès'
  }
];

const mockTransactions = [
  {
    id: 'tx_1',
    type: 'received',
    amount: 150.00,
    from: 'tw_customer123',
    to: null,
    memo: 'Achat produit #123',
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    status: 'completed'
  },
  {
    id: 'tx_2',
    type: 'sent',
    amount: 75.50,
    from: null,
    to: 'tw_customer456',
    memo: 'Remboursement commande #456',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    status: 'completed'
  }
];

interface Customer {
  id: string;
  walletId: string;
  totalSpent: number;
  transactionCount: number;
  firstSeen: Date;
  lastSeen: Date;
}

export const PersonalSpace: React.FC = () => {
  const { balance, isConnected } = useTonWallet();
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [withdrawAmount, setWithdrawAmount] = React.useState('');
  const [selectedBankAccount, setSelectedBankAccount] = React.useState('');
  const [showWithdrawModal, setShowWithdrawModal] = React.useState(false);
  const [refundAmount, setRefundAmount] = React.useState('');
  const [refundReason, setRefundReason] = React.useState('');
  const [customerWallet, setCustomerWallet] = React.useState('');
  const [showRefundModal, setShowRefundModal] = React.useState(false);

  // Simuler des données clients (en réalité, elles viendraient de l'API)
  React.useEffect(() => {
    const mockCustomers: Customer[] = [
      {
        id: 'cust_001',
        walletId: 'tw_abc123def456',
        totalSpent: 2450.75,
        transactionCount: 18,
        firstSeen: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        lastSeen: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'cust_002',
        walletId: 'tw_xyz789ghi012',
        totalSpent: 1890.50,
        transactionCount: 12,
        firstSeen: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
        lastSeen: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'cust_003',
        walletId: 'tw_mno345pqr678',
        totalSpent: 3200.25,
        transactionCount: 25,
        firstSeen: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        lastSeen: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'cust_004',
        walletId: 'tw_stu901vwx234',
        totalSpent: 750.00,
        transactionCount: 5,
        firstSeen: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        lastSeen: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'cust_005',
        walletId: 'tw_def567ghi890',
        totalSpent: 1125.80,
        transactionCount: 8,
        firstSeen: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        lastSeen: new Date(Date.now() - 3 * 60 * 60 * 1000)
      }
    ];
    setCustomers(mockCustomers);
  }, []);

  const handleWithdraw = () => {
    // Logique de retrait
    console.log('Retrait:', { amount: withdrawAmount, account: selectedBankAccount });
    setShowWithdrawModal(false);
    setWithdrawAmount('');
  };

  const handleRefund = () => {
    // Logique de remboursement
    console.log('Remboursement:', { amount: refundAmount, reason: refundReason, customer: customerWallet });
    setShowRefundModal(false);
    setRefundAmount('');
    setRefundReason('');
    setCustomerWallet('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Gestion des Fonds</h1>
              <p className="text-slate-400">Retraits, remboursements et service client</p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-purple-500/10 text-purple-400 border-purple-500/20">
            Gestion Professionnelle
          </Badge>
        </motion.div>

        <Tabs defaultValue="funds" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-slate-800/50 border border-slate-700">
            <TabsTrigger value="funds" className="data-[state=active]:bg-slate-700">
              <Banknote className="w-4 h-4 mr-2" />
              Fonds
            </TabsTrigger>
            <TabsTrigger value="withdrawals" className="data-[state=active]:bg-slate-700">
              <ArrowUpRight className="w-4 h-4 mr-2" />
              Retraits
            </TabsTrigger>
            <TabsTrigger value="customers" className="data-[state=active]:bg-slate-700">
              <Users className="w-4 h-4 mr-2" />
              Clients
            </TabsTrigger>
            <TabsTrigger value="refunds" className="data-[state=active]:bg-slate-700">
              <RefreshCw className="w-4 h-4 mr-2" />
              Remboursements
            </TabsTrigger>
            <TabsTrigger value="support" className="data-[state=active]:bg-slate-700">
              <MessageSquare className="w-4 h-4 mr-2" />
              Support
            </TabsTrigger>
          </TabsList>

          {/* Onglet Fonds */}
          <TabsContent value="funds" className="space-y-6">
            {/* Balance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <AnimatedCard>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-sm">Disponible</p>
                      <p className="text-2xl font-bold text-emerald-400">
                        {formatBalance(mockBusinessBalance.available)} $FRE
                      </p>
                    </div>
                    <DollarSign className="w-8 h-8 text-emerald-400" />
                  </div>
                </CardContent>
              </AnimatedCard>

              <AnimatedCard delay={0.1}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-sm">En attente</p>
                      <p className="text-2xl font-bold text-yellow-400">
                        {formatBalance(mockBusinessBalance.pending)} $FRE
                      </p>
                    </div>
                    <Clock className="w-8 h-8 text-yellow-400" />
                  </div>
                </CardContent>
              </AnimatedCard>

              <AnimatedCard delay={0.2}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-sm">Retiré</p>
                      <p className="text-2xl font-bold text-blue-400">
                        {formatBalance(mockBusinessBalance.withdrawn)} $FRE
                      </p>
                    </div>
                    <ArrowUpRight className="w-8 h-8 text-blue-400" />
                  </div>
                </CardContent>
              </AnimatedCard>

              <AnimatedCard delay={0.3}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-sm">Total gagné</p>
                      <p className="text-2xl font-bold text-purple-400">
                        {formatBalance(mockBusinessBalance.totalEarned)} $FRE
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-purple-400" />
                  </div>
                </CardContent>
              </AnimatedCard>
            </div>

            {/* Actions rapides */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <AnimatedCard delay={0.4}>
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center">
                    <ArrowUpRight className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-100 mb-2">Retirer des Fonds</h3>
                  <p className="text-slate-400 mb-4">Transférez vos gains vers votre compte bancaire</p>
                  <Button 
                    onClick={() => setShowWithdrawModal(true)}
                    className="bg-emerald-600 hover:bg-emerald-500"
                  >
                    Nouveau Retrait
                  </Button>
                </CardContent>
              </AnimatedCard>

              <AnimatedCard delay={0.5}>
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
                    <RefreshCw className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-100 mb-2">Rembourser un Client</h3>
                  <p className="text-slate-400 mb-4">Effectuez un remboursement rapide</p>
                  <Button 
                    onClick={() => setShowRefundModal(true)}
                    className="bg-blue-600 hover:bg-blue-500"
                  >
                    Nouveau Remboursement
                  </Button>
                </CardContent>
              </AnimatedCard>
            </div>
          </TabsContent>

          {/* Onglet Retraits */}
          <TabsContent value="withdrawals" className="space-y-6">
            <AnimatedCard>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-100">
                  <ArrowUpRight className="w-5 h-5" />
                  Historique des Retraits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockWithdrawals.map((withdrawal) => (
                    <div key={withdrawal.id} className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          withdrawal.status === 'completed' 
                            ? 'bg-emerald-500/20 text-emerald-400' 
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {withdrawal.status === 'completed' ? (
                            <CheckCircle className="w-5 h-5" />
                          ) : (
                            <Clock className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <p className="text-slate-200 font-medium">
                            Retrait vers {withdrawal.bankAccount}
                          </p>
                          <p className="text-slate-400 text-sm">
                            {withdrawal.timestamp.toLocaleString('fr-FR')} • Frais: {formatBalance(withdrawal.fees)} $FRE
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-blue-400 font-semibold text-lg">
                          -{formatBalance(withdrawal.amount)} $FRE
                        </p>
                        <Badge variant="secondary" className={`text-xs ${
                          withdrawal.status === 'completed' 
                            ? 'bg-emerald-500/10 text-emerald-400' 
                            : 'bg-yellow-500/10 text-yellow-400'
                        }`}>
                          {withdrawal.status === 'completed' ? 'Terminé' : 'En cours'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </AnimatedCard>
          </TabsContent>

          {/* Onglet Remboursements */}
          <TabsContent value="refunds" className="space-y-6">
            <AnimatedCard>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-100">
                  <RefreshCw className="w-5 h-5" />
                  Historique des Remboursements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockRefunds.map((refund) => (
                    <div key={refund.id} className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          refund.status === 'completed' 
                            ? 'bg-emerald-500/20 text-emerald-400' 
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          <RefreshCw className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-slate-200 font-medium">{refund.reason}</p>
                          <p className="text-slate-400 text-sm">
                            Client: {refund.customerWallet} • {refund.timestamp.toLocaleString('fr-FR')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-orange-400 font-semibold text-lg">
                          -{formatBalance(refund.amount)} $FRE
                        </p>
                        <Badge variant="secondary" className={`text-xs ${
                          refund.status === 'completed' 
                            ? 'bg-emerald-500/10 text-emerald-400' 
                            : 'bg-yellow-500/10 text-yellow-400'
                        }`}>
                          {refund.status === 'completed' ? 'Remboursé' : 'En cours'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </AnimatedCard>
          </TabsContent>

          {/* Onglet Support */}
          <TabsContent value="support" className="space-y-6">
            <AnimatedCard>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-100">
                  <MessageSquare className="w-5 h-5" />
                  Tickets de Support
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockSupportTickets.map((ticket) => (
                    <div key={ticket.id} className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          ticket.status === 'open' 
                            ? 'bg-red-500/20 text-red-400' 
                            : 'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          {ticket.status === 'open' ? (
                            <AlertCircle className="w-5 h-5" />
                          ) : (
                            <CheckCircle className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <p className="text-slate-200 font-medium">{ticket.subject}</p>
                          <p className="text-slate-400 text-sm">
                            {ticket.customerWallet} • {ticket.timestamp.toLocaleString('fr-FR')}
                          </p>
                          <p className="text-slate-500 text-xs">{ticket.lastMessage}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary" className={`text-xs mb-2 ${
                          ticket.priority === 'high' 
                            ? 'bg-red-500/10 text-red-400' 
                            : 'bg-yellow-500/10 text-yellow-400'
                        }`}>
                          {ticket.priority === 'high' ? 'Urgent' : 'Normal'}
                        </Badge>
                        <br />
                        <Badge variant="secondary" className={`text-xs ${
                          ticket.status === 'open' 
                            ? 'bg-red-500/10 text-red-400' 
                            : 'bg-emerald-500/10 text-emerald-400'
                        }`}>
                          {ticket.status === 'open' ? 'Ouvert' : 'Résolu'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </AnimatedCard>
          </TabsContent>

          {/* Onglet Clients */}
          <TabsContent value="customers" className="space-y-6">
            {/* Statistiques clients */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <AnimatedCard>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-sm">Total Clients</p>
                      <p className="text-2xl font-bold text-blue-400">
                        {customers.length}
                      </p>
                    </div>
                    <Users className="w-8 h-8 text-blue-400" />
                  </div>
                </CardContent>
              </AnimatedCard>

              <AnimatedCard delay={0.1}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-sm">Clients Actifs (7j)</p>
                      <p className="text-2xl font-bold text-emerald-400">
                        {customers.filter(c => 
                          (new Date().getTime() - c.lastSeen.getTime()) < 7 * 24 * 60 * 60 * 1000
                        ).length}
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-emerald-400" />
                  </div>
                </CardContent>
              </AnimatedCard>

              <AnimatedCard delay={0.2}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-sm">Panier Moyen</p>
                      <p className="text-2xl font-bold text-purple-400">
                        {customers.length > 0 
                          ? formatBalance(customers.reduce((acc, c) => acc + c.totalSpent, 0) / customers.reduce((acc, c) => acc + c.transactionCount, 0) || 0)
                          : '0.00'
                        } $FRE
                      </p>
                    </div>
                    <CreditCard className="w-8 h-8 text-purple-400" />
                  </div>
                </CardContent>
              </AnimatedCard>
            </div>

            {/* Liste des clients */}
            <AnimatedCard delay={0.3}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-slate-100">
                    <Users className="w-5 h-5" />
                    Base de Données Clients
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="border-slate-600 hover:bg-slate-700">
                      <Filter className="w-4 h-4 mr-2" />
                      Filtrer
                    </Button>
                    <Button variant="outline" size="sm" className="border-slate-600 hover:bg-slate-700">
                      <Download className="w-4 h-4 mr-2" />
                      Exporter
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {customers.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 mx-auto text-slate-400 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-300 mb-2">
                      Aucun client enregistré
                    </h3>
                    <p className="text-slate-400">
                      Les clients apparaîtront automatiquement après leurs premiers paiements
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {customers
                      .sort((a, b) => b.totalSpent - a.totalSpent)
                      .map((customer, index) => (
                      <div key={customer.id} className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-700/50 hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-lg">
                              #{index + 1}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-slate-200 font-medium font-mono">
                                {customer.walletId}
                              </p>
                              <Badge variant="secondary" className="text-xs bg-slate-700 text-slate-300">
                                ID: {customer.id.slice(-6)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-slate-400">
                              <span className="flex items-center gap-1">
                                <CreditCard className="w-3 h-3" />
                                {customer.transactionCount} transaction{customer.transactionCount > 1 ? 's' : ''}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Dernière visite: {customer.lastSeen.toLocaleDateString('fr-FR')}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              Client depuis: {customer.firstSeen.toLocaleDateString('fr-FR')}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-emerald-400 mb-1">
                            {formatBalance(customer.totalSpent)} $FRE
                          </div>
                          <div className="text-sm text-slate-400">
                            Moy: {formatBalance(customer.totalSpent / customer.transactionCount)} $FRE
                          </div>
                          <Badge 
                            variant="secondary" 
                            className={`text-xs mt-1 ${
                              (new Date().getTime() - customer.lastSeen.getTime()) < 7 * 24 * 60 * 60 * 1000
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : (new Date().getTime() - customer.lastSeen.getTime()) < 30 * 24 * 60 * 60 * 1000
                                ? 'bg-yellow-500/10 text-yellow-400'
                                : 'bg-slate-500/10 text-slate-400'
                            }`}
                          >
                            {(new Date().getTime() - customer.lastSeen.getTime()) < 7 * 24 * 60 * 60 * 1000
                              ? 'Actif'
                              : (new Date().getTime() - customer.lastSeen.getTime()) < 30 * 24 * 60 * 60 * 1000
                              ? 'Récent'
                              : 'Inactif'
                            }
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </AnimatedCard>

            {/* Top clients */}
            {customers.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AnimatedCard delay={0.4}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-slate-100">
                      <TrendingUp className="w-5 h-5" />
                      Top Clients (Montant)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {customers
                        .sort((a, b) => b.totalSpent - a.totalSpent)
                        .slice(0, 5)
                        .map((customer, index) => (
                        <div key={customer.id} className="flex items-center justify-between p-3 bg-slate-800/20 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                              index === 0 ? 'bg-yellow-500' : 
                              index === 1 ? 'bg-gray-400' : 
                              index === 2 ? 'bg-orange-600' : 'bg-slate-600'
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <p className="text-slate-200 font-medium font-mono text-sm">
                                {customer.walletId}
                              </p>
                              <p className="text-slate-400 text-xs">
                                {customer.transactionCount} transactions
                              </p>
                            </div>
                          </div>
                          <div className="text-emerald-400 font-semibold">
                            {formatBalance(customer.totalSpent)} $FRE
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </AnimatedCard>

                <AnimatedCard delay={0.5}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-slate-100">
                      <CreditCard className="w-5 h-5" />
                      Clients Fidèles (Fréquence)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {customers
                        .sort((a, b) => b.transactionCount - a.transactionCount)
                        .slice(0, 5)
                        .map((customer, index) => (
                        <div key={customer.id} className="flex items-center justify-between p-3 bg-slate-800/20 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                              index === 0 ? 'bg-blue-500' : 
                              index === 1 ? 'bg-purple-500' : 
                              index === 2 ? 'bg-pink-500' : 'bg-slate-600'
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <p className="text-slate-200 font-medium font-mono text-sm">
                                {customer.walletId}
                              </p>
                              <p className="text-slate-400 text-xs">
                                {formatBalance(customer.totalSpent)} $FRE total
                              </p>
                            </div>
                          </div>
                          <div className="text-blue-400 font-semibold">
                            {customer.transactionCount} achats
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </AnimatedCard>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Modal Retrait */}
        <Dialog open={showWithdrawModal} onOpenChange={setShowWithdrawModal}>
          <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-slate-100">Nouveau Retrait</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="withdraw-amount" className="text-slate-300">
                  Montant à retirer (FRE)
                </Label>
                <Input
                  id="withdraw-amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="bg-slate-800/50 border-slate-700 text-slate-100"
                />
                <p className="text-xs text-slate-400">
                  Disponible: {formatBalance(mockBusinessBalance.available)} $FRE
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bank-account" className="text-slate-300">
                  Compte bancaire
                </Label>
                <select
                  id="bank-account"
                  value={selectedBankAccount}
                  onChange={(e) => setSelectedBankAccount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-100"
                >
                  <option value="">Sélectionner un compte</option>
                  <option value="****1234">Compte Principal (****1234)</option>
                  <option value="****5678">Compte Épargne (****5678)</option>
                </select>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleWithdraw}
                  disabled={!withdrawAmount || !selectedBankAccount}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500"
                >
                  Confirmer le Retrait
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowWithdrawModal(false)}
                  className="border-slate-600 hover:bg-slate-700"
                >
                  Annuler
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal Remboursement */}
        <Dialog open={showRefundModal} onOpenChange={setShowRefundModal}>
          <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-slate-100">Nouveau Remboursement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customer-wallet" className="text-slate-300">
                  ID Client ToWallet
                </Label>
                <Input
                  id="customer-wallet"
                  placeholder="tw_customer123..."
                  value={customerWallet}
                  onChange={(e) => setCustomerWallet(e.target.value)}
                  className="bg-slate-800/50 border-slate-700 text-slate-100"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="refund-amount" className="text-slate-300">
                  Montant à rembourser (FRE)
                </Label>
                <Input
                  id="refund-amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="bg-slate-800/50 border-slate-700 text-slate-100"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="refund-reason" className="text-slate-300">
                  Raison du remboursement
                </Label>
                <Textarea
                  id="refund-reason"
                  placeholder="Expliquez la raison du remboursement..."
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="bg-slate-800/50 border-slate-700 text-slate-100 resize-none"
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleRefund}
                  disabled={!refundAmount || !customerWallet || !refundReason}
                  className="flex-1 bg-blue-600 hover:bg-blue-500"
                >
                  Confirmer le Remboursement
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowRefundModal(false)}
                  className="border-slate-600 hover:bg-slate-700"
                >
                  Annuler
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <AnimatedCard delay={0.4}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-100">
                <History className="w-5 h-5" />
                Historique des Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockTransactions.map((transaction, index) => (
                  <div key={transaction.id} className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        transaction.type === 'received' 
                          ? 'bg-emerald-500/20 text-emerald-400' 
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {transaction.type === 'received' ? (
                          <ArrowDownLeft className="w-5 h-5" />
                        ) : (
                          <ArrowUpRight className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-200 font-medium">
                            {transaction.type === 'received' ? 'Reçu' : 'Envoyé'}
                          </span>
                          <Badge variant="secondary" className="text-xs bg-slate-700 text-slate-300">
                            {transaction.status}
                          </Badge>
                        </div>
                        <p className="text-slate-400 text-sm">{transaction.memo}</p>
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <Clock className="w-3 h-3" />
                          {transaction.timestamp.toLocaleString('fr-FR')}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-semibold ${
                        transaction.type === 'received' ? 'text-emerald-400' : 'text-blue-400'
                      }`}>
                        {transaction.type === 'received' ? '+' : '-'}{formatBalance(transaction.amount)} $FRE
                      </div>
                      <p className="text-slate-500 text-xs font-mono">
                        {transaction.type === 'received' 
                          ? `De: ${transaction.from?.slice(0, 8)}...`
                          : `Vers: ${transaction.to?.slice(0, 8)}...`
                        }
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </AnimatedCard>
        </motion.div>
      </div>
    </div>
  );
};