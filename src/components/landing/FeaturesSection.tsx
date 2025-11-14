import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Zap, QrCode, Users } from 'lucide-react';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const features = [
  {
    icon: Shield,
    title: "Paiements Blockchain Sécurisés",
    description: "Profitez de la sécurité inégalée de la blockchain TON pour tous vos paiements en Franc Numérique.",
    gradient: "from-blue-500 to-blue-600"
  },
  {
    icon: Zap,
    title: "Ultra Rapide",
    description: "Transactions instantanées avec confirmation en moins d'une seconde grâce à la technologie TON.",
    gradient: "from-emerald-500 to-emerald-600"
  },
  {
    icon: QrCode,
    title: "Paiements par QR Code",
    description: "Simplifiez vos transactions avec nos QR codes intelligents. Scannez et payez en un instant.",
    gradient: "from-purple-500 to-purple-600"
  },
  {
    icon: Users,
    title: "Pour Tous",
    description: "Solutions adaptées aux particuliers et aux entreprises. Gérez vos finances personnelles et professionnelles.",
    gradient: "from-orange-500 to-orange-600"
  }
];

export const FeaturesSection: React.FC = () => {
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
            Fonctionnalités
            <span className="bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent"> Avancées</span>
          </h2>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto">
            Découvrez les fonctionnalités qui font de FrancPay la solution de paiement numérique la plus avancée
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <AnimatedCard delay={index * 0.1}>
                <CardHeader className="text-center">
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-r ${feature.gradient} flex items-center justify-center`}>
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-slate-100 text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-400 text-center leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </AnimatedCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};