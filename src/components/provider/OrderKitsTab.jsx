import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ShoppingCart, Droplet, Heart, Brain } from 'lucide-react';

const kits = [
  {
    id: 1,
    title: 'Comprehensive Wellness Kit',
    description: 'A full-panel blood test covering key health markers.',
    price: '$199',
    icon: Droplet,
    color: 'text-red-500',
    bgColor: 'bg-red-50',
  },
  {
    id: 2,
    title: 'Cardiovascular Health Kit',
    description: 'Focused analysis of heart health indicators and lipids.',
    price: '$149',
    icon: Heart,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
  },
  {
    id: 3,
    title: 'Mental Wellness Kit',
    description: 'Measures key hormones related to stress and mood.',
    price: '$179',
    icon: Brain,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50',
  },
];

const OrderKitsTab = () => {
  const { toast } = useToast();

  const handleOrder = (kitTitle) => {
    toast({
      title: '🚀 Order Placed!',
      description: `${kitTitle} has been added to your cart.`,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="bg-gradient-to-b from-purple-500 to-indigo-600 text-white p-6 -mx-6 -mt-8 mb-8 shadow-md">
        <h2 className="text-3xl font-bold">Order Diagnostic Kits</h2>
        <p className="text-purple-100">Easily order test kits for your patients.</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {kits.map((kit, index) => (
          <motion.div
            key={kit.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="flex flex-col h-full hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="flex-row items-start gap-4">
                <div className={`p-3 rounded-lg ${kit.bgColor}`}>
                  <kit.icon className={`w-8 h-8 ${kit.color}`} />
                </div>
                <div>
                  <CardTitle>{kit.title}</CardTitle>
                  <CardDescription>{kit.description}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex-grow" />
              <CardFooter className="flex justify-between items-center">
                <p className="text-2xl font-bold text-slate-800">{kit.price}</p>
                <Button onClick={() => handleOrder(kit.title)} className="bg-purple-600 hover:bg-purple-700">
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Order Now
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default OrderKitsTab;