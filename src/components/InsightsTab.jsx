import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { TrendingUp } from 'lucide-react';

const InsightsTab = () => {
    const { toast } = useToast();

    return (
        <motion.div
            key="insights"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-4xl mx-auto space-y-6"
        >
            <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-2">Health Insights</h2>
                <p className="text-gray-300">Analyze patterns in your symptom data</p>
            </div>

            <Card className="bg-white/5 backdrop-blur-lg border-white/20 p-8 text-center">
                <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-300 text-lg mb-2">Advanced Analytics Coming Soon</p>
                <p className="text-gray-400">
                    We're working on powerful insights including symptom patterns, triggers, and trends.
                </p>
                <Button
                    onClick={() => toast({
                        title: "This feature is coming soon"
                    })}
                    className="mt-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                >
                    Request Early Access
                </Button>
            </Card>
        </motion.div>
    );
};

export default InsightsTab;