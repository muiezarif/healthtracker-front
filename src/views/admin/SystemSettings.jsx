import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Settings, Bell, Key, Save } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

const SystemSettings = () => {
  const { toast } = useToast();

  const showToast = () => {
    toast({
      title: "🚧 This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀",
    });
  };

  return (
    <>
      <Helmet>
        <title>System Settings - HealthTracker</title>
        <meta name="description" content="Configure system-wide settings for HealthTracker." />
        <body className="bg-slate-100" />
      </Helmet>
      <div className="min-h-screen bg-slate-100 text-slate-800">
        <header className="bg-slate-800 text-white shadow-md">
          <div className="container mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500 rounded-lg">
                <Settings className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-bold tracking-wider">System Settings</h1>
            </div>
            <Button asChild variant="outline" className="border-indigo-400 text-indigo-400 hover:bg-indigo-400 hover:text-white">
              <Link to="/admin">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Admin Portal
              </Link>
            </Button>
          </div>
        </header>

        <main className="container mx-auto px-6 py-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Configuration</CardTitle>
                <CardDescription>Manage global settings for the application. Changes here will affect all users.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center"><Bell className="w-5 h-5 mr-2 text-indigo-500"/> Notification Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="smtp-host">SMTP Host</Label>
                            <Input id="smtp-host" placeholder="smtp.example.com" disabled />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="smtp-port">SMTP Port</Label>
                            <Input id="smtp-port" placeholder="587" disabled />
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center"><Key className="w-5 h-5 mr-2 text-indigo-500"/> API Keys</h3>
                     <div className="space-y-2">
                        <Label htmlFor="stripe-key">Stripe API Key</Label>
                        <Input id="stripe-key" type="password" value="••••••••••••••••••••••••" disabled />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="map-key">Mapping Provider API Key</Label>
                        <Input id="map-key" type="password" value="••••••••••••••••••••••••" disabled />
                    </div>
                </div>
              </CardContent>
              <CardFooter className="border-t px-6 py-4">
                <Button onClick={showToast}>
                    <Save className="w-4 h-4 mr-2"/>
                    Save Changes
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        </main>
      </div>
    </>
  );
};

export default SystemSettings;