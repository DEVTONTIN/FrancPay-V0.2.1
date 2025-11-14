import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building2, 
  QrCode, 
  BarChart3, 
  Settings, 
  Users, 
  CreditCard,
  TrendingUp,
  Calendar,
  Download,
  Eye,
  Copy,
  Check,
  Smartphone,
  RefreshCw,
  X
} from 'lucide-react';
import { QRCodeGenerator } from '@/components/wallet/QRCodeGenerator';
import { POSInterface } from '@/components/pos/POSInterface';
import { useTonWallet } from '@/hooks/useTonWallet';
import { formatBalance } from '@/lib/ton';
import { AnimatedCard } from '@/components/ui/AnimatedCard';

// Mock business data
const mockBusinessStats = {
  todayRevenue: 2847.50,
  weekRevenue: 12450.75,
  monthlyRevenue: 45230.80,
  totalTransactions: 342,
  todayTransactions: 18,
  averageTransaction: 132.15,
  conversionRate: 87.5,
  peakHour: '14:00-15:00',
  topProducts: [
    { name: 'Service Premium', sales: 45, revenue: 4500.00 },
    { name: 'Consultation Standard', sales: 78, revenue: 3900.00 },
    { name: 'Pack Découverte', sales: 32, revenue: 1600.00 },
    { name: 'Formation Express', sales: 28, revenue: 2800.00 }
  ],
  recentActivity: [
    { type: 'payment', amount: 150.00, time: '15:42', customer: 'tw_abc123', status: 'success' },
    { type: 'payment', amount: 89.50, time: '15:38', customer: 'tw_def456', status: 'success' },
    { type: 'refund', amount: 45.00, time: '15:20', customer: 'tw_ghi789', status: 'processed' },
    { type: 'payment', amount: 220.00, time: '15:15', customer: 'tw_jkl012', status: 'success' },
    { type: 'payment', amount: 75.25, time: '15:08', customer: 'tw_mno345', status: 'failed' }
  ],
  hourlyData: [
    { hour: '09:00', transactions: 3, revenue: 285.50 },
    { hour: '10:00', transactions: 5, revenue: 420.75 },
    { hour: '11:00', transactions: 8, revenue: 680.00 },
    { hour: '12:00', transactions: 12, revenue: 1240.50 },
    { hour: '13:00', transactions: 15, revenue: 1580.25 },
    { hour: '14:00', transactions: 18, revenue: 1890.75 },
    { hour: '15:00', transactions: 22, revenue: 2350.00 },
    { hour: '16:00', transactions: 16, revenue: 1680.50 }
  ]
};

export const ProfessionalSpace: React.FC = () => {
  const { generatePaymentLink, balance } = useTonWallet();
  const [businessInfo, setBusinessInfo] = useState({
    name: 'Mon Entreprise',
    description: 'Services professionnels',
    amount: '',
    memo: ''
  });
  const [copied, setCopied] = useState(false);

  const businessPaymentLink = businessInfo.amount ? 
    generatePaymentLink(parseFloat(businessInfo.amount) || 0, businessInfo.memo) : '';

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
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
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Espace Professionnel</h1>
              <p className="text-slate-400">Gérez vos encaissements et votre activité commerciale</p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
            Compte Entreprise
          </Badge>
        </motion.div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-slate-800/50 border border-slate-700">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-slate-700">
              <BarChart3 className="w-4 h-4 mr-2" />
              Tableau de Bord
            </TabsTrigger>
            <TabsTrigger value="payments" className="data-[state=active]:bg-slate-700">
              <Smartphone className="w-4 h-4 mr-2" />
              Encaissements
            </TabsTrigger>
            <TabsTrigger value="customers" className="data-[state=active]:bg-slate-700">
              <Users className="w-4 h-4 mr-2" />
              Clients
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-slate-700">
              <Settings className="w-4 h-4 mr-2" />
              Paramètres
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <>
            {/* Métriques principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <AnimatedCard>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-sm">Aujourd'hui</p>
                      <p className="text-xl font-bold text-emerald-400">
                        {formatBalance(mockBusinessStats.todayRevenue)} $FRE
                      </p>
                      <p className="text-xs text-slate-500">
                        {mockBusinessStats.todayTransactions} transactions
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-emerald-400" />
                    </div>
                  </div>
                </CardContent>
              </AnimatedCard>

              <AnimatedCard delay={0.1}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-sm">Cette semaine</p>
                      <p className="text-xl font-bold text-blue-400">
                        {formatBalance(mockBusinessStats.weekRevenue)} $FRE
                      </p>
                      <p className="text-xs text-slate-500">
                        +15.2% vs semaine dernière
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </AnimatedCard>

              <AnimatedCard delay={0.2}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-sm">Ce mois</p>
                      <p className="text-xl font-bold text-purple-400">
                        {formatBalance(mockBusinessStats.monthlyRevenue)} $FRE
                      </p>
                      <p className="text-xs text-slate-500">
                        Objectif: 50,000 $FRE
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-purple-400" />
                    </div>
                  </div>
                </CardContent>
              </AnimatedCard>

              <AnimatedCard delay={0.3}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-sm">Panier moyen</p>
                      <p className="text-xl font-bold text-orange-400">
                        {formatBalance(mockBusinessStats.averageTransaction)} $FRE
                      </p>
                      <p className="text-xs text-slate-500">
                        +8.5% ce mois
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-orange-400" />
                    </div>
                  </div>
                </CardContent>
              </AnimatedCard>

              <AnimatedCard delay={0.4}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-sm">Taux de conversion</p>
                      <p className="text-xl font-bold text-pink-400">
                        {mockBusinessStats.conversionRate}%
                      </p>
                      <p className="text-xs text-slate-500">
                        {mockBusinessStats.totalTransactions}
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-pink-500/20 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-pink-400" />
                    </div>
                  </div>
                </CardContent>
              </AnimatedCard>
            </div>

            {/* Graphiques et activité */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Activité en temps réel */}
              <AnimatedCard delay={0.5}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-100">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                    Activité en Temps Réel
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {mockBusinessStats.recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          activity.type === 'payment' 
                            ? activity.status === 'success'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-red-500/20 text-red-400'
                            : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {activity.type === 'payment' ? (
                            activity.status === 'success' ? (
                              <TrendingUp className="w-4 h-4" />
                            ) : (
                              <X className="w-4 h-4" />
                            )
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-200 text-sm font-medium">
                              {activity.type === 'payment' ? 'Paiement' : 'Remboursement'}
                            </span>
                            <span className="text-xs text-slate-400">{activity.time}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-500 font-mono">
                              {activity.customer}
                            </span>
                            <span className={`text-sm font-semibold ${
                              activity.type === 'payment' && activity.status === 'success'
                                ? 'text-emerald-400'
                                : activity.type === 'refund'
                                ? 'text-blue-400'
                                : 'text-red-400'
                            }`}>
                              {activity.type === 'refund' ? '-' : '+'}
                              {formatBalance(activity.amount)} $FRE
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </AnimatedCard>

              {/* Graphique des ventes par heure */}
              <AnimatedCard delay={0.6}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-100">
                    <BarChart3 className="w-5 h-5" />
                    Ventes par Heure
                  </CardTitle>
                  <p className="text-sm text-slate-400">
                    Pic d'activité: {mockBusinessStats.peakHour}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {mockBusinessStats.hourlyData.map((data, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <span className="text-xs text-slate-400 w-12">{data.hour}</span>
                        <div className="flex-1 bg-slate-800 rounded-full h-2 relative">
                          <div 
                            className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${(data.transactions / 25) * 100}%` }}
                          ></div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-emerald-400 font-semibold">
                            {formatBalance(data.revenue)} $FRE
                          </div>
                          <div className="text-xs text-slate-500">
                            {data.transactions} tx
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </AnimatedCard>

              {/* Top produits/services */}
              <AnimatedCard delay={0.7}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-100">
                    <CreditCard className="w-5 h-5" />
                    Top Produits/Services
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockBusinessStats.topProducts.map((product, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                            index === 0 ? 'bg-yellow-500' : 
                            index === 1 ? 'bg-gray-400' : 
                            index === 2 ? 'bg-orange-600' : 'bg-slate-600'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-slate-200 font-medium text-sm">{product.name}</p>
                            <p className="text-slate-400 text-xs">{product.sales} ventes</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-emerald-400 font-semibold text-sm">
                            {formatBalance(product.revenue)} $FRE
                          </p>
                          <p className="text-slate-500 text-xs">
                            {formatBalance(product.revenue / product.sales)} moy.
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </AnimatedCard>
            </div>

            {/* Alertes et notifications */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AnimatedCard delay={0.8}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-100">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                    Alertes & Notifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <div className="w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-yellow-400" />
                      </div>
                      <div>
                        <p className="text-yellow-400 font-medium text-sm">Objectif mensuel</p>
                        <p className="text-slate-300 text-xs">90.5% atteint - Plus que 4,769 $FRE</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                      <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center">
                        <Users className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-emerald-400 font-medium text-sm">Nouveau client fidèle</p>
                        <p className="text-slate-300 text-xs">tw_abc123 - 10ème transaction</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                        <BarChart3 className="w-4 h-4 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-blue-400 font-medium text-sm">Performance hebdomadaire</p>
                        <p className="text-slate-300 text-xs">+15.2% vs semaine dernière</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </AnimatedCard>
              
              <AnimatedCard delay={0.9}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-100">
                    <Settings className="w-5 h-5" />
                    Actions Rapides
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <Button className="h-16 flex flex-col items-center justify-center bg-emerald-600 hover:bg-emerald-500">
                      <Smartphone className="w-5 h-5 mb-1" />
                      <span className="text-xs">Nouveau Paiement</span>
                    </Button>
                    
                    <Button variant="outline" className="h-16 flex flex-col items-center justify-center border-slate-600 hover:bg-slate-700">
                      <Download className="w-5 h-5 mb-1" />
                      <span className="text-xs">Exporter Données</span>
                    </Button>
                    
                    <Button variant="outline" className="h-16 flex flex-col items-center justify-center border-slate-600 hover:bg-slate-700">
                      <Users className="w-5 h-5 mb-1" />
                      <span className="text-xs">Voir Clients</span>
                    </Button>
                    
                    <Button variant="outline" className="h-16 flex flex-col items-center justify-center border-slate-600 hover:bg-slate-700">
                      <BarChart3 className="w-5 h-5 mb-1" />
                      <span className="text-xs">Rapports</span>
                    </Button>
                  </div>
                </CardContent>
              </AnimatedCard>
            </div>

            {/* Résumé de performance */}
            <AnimatedCard delay={1.0}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-100">
                  <TrendingUp className="w-5 h-5" />
                  Résumé de Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-emerald-400 mb-2">
                      {mockBusinessStats.todayTransactions}
                    </div>
                    <div className="text-slate-400 text-sm">Transactions aujourd'hui</div>
                    <div className="text-xs text-emerald-400 mt-1">+12% vs hier</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-400 mb-2">
                      {mockBusinessStats.conversionRate}%
                    </div>
                    <div className="text-slate-400 text-sm">Taux de conversion</div>
                    <div className="text-xs text-blue-400 mt-1">+3.2% ce mois</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-400 mb-2">
                      {mockBusinessStats.peakHour}
                    </div>
                    <div className="text-slate-400 text-sm">Heure de pointe</div>
                    <div className="text-xs text-purple-400 mt-1">22 transactions</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-400 mb-2">
                      90.5%
                    </div>
                    <div className="text-slate-400 text-sm">Objectif mensuel</div>
                    <div className="text-xs text-orange-400 mt-1">4,769 $FRE restants</div>
                  </div>
                </div>
              </CardContent>
            </AnimatedCard>
            </>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-6">
            <POSInterface />
          </TabsContent>

          {/* Customers Tab */}
          <TabsContent value="customers" className="space-y-6">
            <AnimatedCard>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-100">
                  <Users className="w-5 h-5" />
                  Gestion des Clients
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Users className="w-16 h-16 mx-auto text-slate-400 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-300 mb-2">
                    Fonctionnalité en développement
                  </h3>
                  <p className="text-slate-400">
                    La gestion des clients sera bientôt disponible
                  </p>
                </div>
              </CardContent>
            </AnimatedCard>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <AnimatedCard>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-100">
                  <Settings className="w-5 h-5" />
                  Paramètres du Compte
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Settings className="w-16 h-16 mx-auto text-slate-400 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-300 mb-2">
                    Paramètres en développement
                  </h3>
                  <p className="text-slate-400">
                    Les paramètres avancés seront bientôt disponibles
                  </p>
                </div>
              </CardContent>
            </AnimatedCard>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};