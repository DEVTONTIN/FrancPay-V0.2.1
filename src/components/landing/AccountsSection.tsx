import React from 'react';
import { motion } from 'framer-motion';
import { Wallet, Building2, QrCode, Send } from 'lucide-react';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface AccountsSectionProps {
  onGetStarted: () => void;
}

const accounts = [
  {
    type: "personnel",
    icon: Wallet,
    title: "Portefeuille Personnel",
    description: "Gérez vos finances personnelles avec votre wallet FrancPay. Suivez votre solde, envoyez et recevez des paiements en toute simplicité.",
    features: ["Solde en temps réel", "Historique des transactions", "Envois instantanés", "Réception sécurisée"],
    gradient: "from-emerald-500 to-emerald-600",
    badge: "Particuliers"
  },
  {
    type: "professionnel",
    icon: Building2,
    title: "Compte Professionnel",
    description: "Solution complète pour les entreprises et commerçants. Générez des QR codes personnalisés et gérez vos encaissements professionnels.",
    features: ["QR codes personnalisés", "Suivi des ventes", "Rapports détaillés", "API d'intégration"],
    gradient: "from-blue-500 to-blue-600",
    badge: "Entreprises"
  }
];

export const AccountsSection: React.FC<AccountsSectionProps> = ({ onGetStarted }) => {
  return (
    <section className="py-20 px-4 relative">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Types de
            <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent"> Comptes</span>
          </h2>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto">
            Choisissez la solution qui correspond à vos besoins, que vous soyez particulier ou professionnel
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {accounts.map((account, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: index === 0 ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: index * 0.2 }}
              viewport={{ once: true }}
            >
              <AnimatedCard delay={index * 0.2}>
                <CardHeader>
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-r ${account.gradient} flex items-center justify-center`}>
                      <account.icon className="w-7 h-7 text-white" />
                    </div>
                    <Badge variant="secondary" className="bg-slate-800 text-slate-300">
                      {account.badge}
                    </Badge>
                  </div>
                  <CardTitle className="text-slate-100 text-xl mb-3">
                    {account.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-slate-300 leading-relaxed">
                    {account.description}
                  </p>
                  
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">
                      Fonctionnalités incluses
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {account.features.map((feature, featureIndex) => (
                        <div key={featureIndex} className="flex items-center gap-2 text-sm text-slate-400">
                          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button size="sm" className="flex-1" onClick={onGetStarted}>
                      <Send className="w-4 h-4 mr-2" />
                      Commencer
                    </Button>
                    <Button size="sm" variant="outline" className="border-slate-700 text-slate-300">
                      <QrCode className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </AnimatedCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};