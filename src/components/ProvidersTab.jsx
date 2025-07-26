import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Users, Plus, Share2 } from 'lucide-react';

const ProvidersTab = () => {
    const { toast } = useToast();

    const showToast = () => {
        toast({
            title: "This feature is coming soon"
        });
    };

    return (
        <motion.div
            key="providers"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-4xl mx-auto space-y-6"
        >
            <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-2">Healthcare Providers</h2>
                <p className="text-gray-300">Manage providers who can access your health data</p>
            </div>

            <div className="flex justify-center gap-4">
                <Button onClick={showToast} className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Provider
                </Button>
                <Button onClick={showToast} variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                    <Share2 className="w-4 h-4 mr-2" />
                    Share Data
                </Button>
            </div>

            <Card className="bg-white/5 backdrop-blur-lg border-white/20 p-8 text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-300 text-lg mb-2">No providers added yet</p>
                <p className="text-gray-400">
                    Add healthcare providers to share your symptom data.
                </p>
            </Card>
        </motion.div>
    );
};

export default ProvidersTab;