import React, { useEffect, useState, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Users, Activity, BarChart, ArrowLeft, Shield, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getAllProviders, getAllPatients } from '@/lib/api';

const AdminPortal = () => {
  const { toast } = useToast();
  const { signOut, token } = useAuth();
  const [stats, setStats] = useState({
    patients: 0,
    providers: 0,
    admins: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [providersData, patientsData] = await Promise.all([
        getAllProviders(token),
        getAllPatients(token)
      ]);
      
      const allUsers = [...providersData, ...patientsData];
      
      setStats({
        patients: patientsData.length,
        providers: providersData.length,
        admins: allUsers.filter(u => u.role === 'admin').length,
      });

    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error fetching stats',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const statCards = [
    { title: 'Total Patients', value: stats.patients, icon: Users, color: 'text-blue-500' },
    { title: 'Total Providers', value: stats.providers, icon: Activity, color: 'text-green-500' },
    { title: 'Total Admins', value: stats.admins, icon: Shield, color: 'text-red-500' },
  ];

  return (
    <>
      <Helmet>
        <title>Admin Portal - HealthTracker</title>
        <meta name="description" content="Administrator dashboard for HealthTracker." />
        <body className="bg-slate-100" />
      </Helmet>
      <div className="min-h-screen bg-slate-100 text-slate-800">
        <header className="bg-slate-800 text-white shadow-md">
          <div className="container mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500 rounded-lg">
                <Shield className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-bold tracking-wider">Admin Portal</h1>
            </div>
            <Button onClick={signOut} variant="outline" className="border-red-400 text-red-400 hover:bg-red-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </header>

        <main className="container mx-auto px-6 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {statCards.map((stat, index) => (
                <motion.div
                  key={stat.title}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="hover:shadow-xl transition-shadow duration-300">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-slate-500">{stat.title}</CardTitle>
                      <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    </CardHeader>
                    <CardContent>
                      {loading ? (
                        <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                      ) : (
                        <div className="text-3xl font-bold">{stat.value}</div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Card className="lg:col-span-2 hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>Add, edit, or remove users from the system.</CardDescription>
                </CardHeader>
                <CardContent className="text-center py-12">
                  <p className="text-slate-500 mb-4">View and manage all patient and provider accounts.</p>
                  <Button asChild>
                    <Link to="/admin/users">Manage Users</Link>
                  </Button>
                </CardContent>
              </Card>
              <Card className="hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <CardTitle>System Settings</CardTitle>
                  <CardDescription>Configure global application settings.</CardDescription>
                </CardHeader>
                <CardContent className="text-center py-12">
                  <p className="text-slate-500 mb-4">Adjust system-wide configurations and integrations.</p>
                  <Button asChild>
                    <Link to="/admin/settings">Configure Settings</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </main>
      </div>
    </>
  );
};

export default AdminPortal;