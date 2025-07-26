import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

const ProviderDialog = ({ open, onOpenChange, onAddProvider }) => {
  const { toast } = useToast();
  const [providerInfo, setProviderInfo] = useState({
    name: '',
    specialty: '',
    email: ''
  });

  const handleChange = (e) => {
    const { id, value } = e.target;
    setProviderInfo(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = () => {
    if (!providerInfo.name || !providerInfo.specialty || !providerInfo.email) {
      toast({
        title: "⚠️ Missing Information",
        description: "Please fill out all fields for the provider.",
        variant: "destructive"
      });
      return;
    }
    
    onAddProvider({
      id: Date.now(),
      ...providerInfo,
      hasAccess: false
    });

    setProviderInfo({ name: '', specialty: '', email: '' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 w-full max-w-md"
            >
              <h3 className="text-xl font-bold text-white mb-4">Add Healthcare Provider</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-white">Provider Name</Label>
                  <Input
                    id="name"
                    value={providerInfo.name}
                    onChange={handleChange}
                    placeholder="Dr. Smith"
                    className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                  />
                </div>
                <div>
                  <Label htmlFor="specialty" className="text-white">Specialty</Label>
                  <Input
                    id="specialty"
                    value={providerInfo.specialty}
                    onChange={handleChange}
                    placeholder="Cardiologist"
                    className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-white">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={providerInfo.email}
                    onChange={handleChange}
                    placeholder="doctor@clinic.com"
                    className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleSubmit}
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500"
                  >
                    Add Provider
                  </Button>
                  <Button
                    onClick={() => onOpenChange(false)}
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
      )}
    </Dialog>
  );
};

export default ProviderDialog;