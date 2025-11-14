import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet, Building2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { AnimatedCard } from '@/components/ui/AnimatedCard';

interface SpaceSelectorProps {
  onSelectSpace: (space: 'personal' | 'professional') => void;
}

export const SpaceSelector: React.FC<SpaceSelectorProps> = ({ onSelectSpace }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black flex items-center justify-center p-4">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Accédez à votre
            <span className="bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent"> Compte Professionnel</span>
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Gérez votre activité commerciale et vos finances professionnelles
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Personal Space */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <AnimatedCard delay={0.2}>
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center">
                  <Wallet className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-100 mb-4">
                  Gestion des Fonds
                </h3>
                <p className="text-slate-400 mb-6 leading-relaxed">
                  Retirez vos gains, gérez les remboursements et le service client de votre activité.
                </p>
                <div className="space-y-2 mb-6 text-sm text-slate-400">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                    Retrait des fonds
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                    Gestion des remboursements
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                    Service client
                  </div>
                </div>
                <Button 
                  onClick={() => onSelectSpace('personal')}
                  className="w-full bg-emerald-600 hover:bg-emerald-500"
                >
                  Gestion des Fonds
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </AnimatedCard>
          </motion.div>

          {/* Professional Space */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <AnimatedCard delay={0.4}>
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-100 mb-4">
                  Terminal de Vente
                </h3>
                <p className="text-slate-400 mb-6 leading-relaxed">
                  Interface de vente avec terminal TPE, QR codes et suivi commercial en temps réel.
                </p>
                <div className="space-y-2 mb-6 text-sm text-slate-400">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    Terminal TPE intégré
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    Encaissements QR code
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    Suivi des ventes
                  </div>
                </div>
                <Button 
                  onClick={() => onSelectSpace('professional')}
                  className="w-full bg-blue-600 hover:bg-blue-500"
                >
                  Terminal de Vente
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </AnimatedCard>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-12"
        >
          <p className="text-slate-500 text-sm">
            Accédez aux deux interfaces selon vos besoins du moment
          </p>
        </motion.div>
      </div>
    </div>
  );
};