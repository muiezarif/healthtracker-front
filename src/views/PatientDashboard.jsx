import React from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, User, Activity, FileText, Stethoscope } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const PatientDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    await signOut();
    toast({
      title: "Logged out successfully!",
    });
    navigate('/');
  };
  
  const showToast = (e) => {
    e.preventDefault();
    toast({
      title: "This feature is coming soon",
    });
  };

  const dashboardItems = [
    { 
      title: "Symptom Tracker", 
      description: "Log and view your symptoms.", 
      icon: Activity, 
      link: "/patient/tracker", 
      color: "text-red-500",
      action: null
    },
    { 
      title: "Health Records", 
      description: "Access your medical history.", 
      icon: FileText, 
      link: "/patient/health-records", 
      color: "text-blue-500",
      action: null
    },
    { 
      title: "My Providers", 
      description: "Manage your connected providers.", 
      icon: Stethoscope, 
      link: "/patient/providers", 
      color: "text-green-500",
      action: null
    },
    { 
      title: "Profile Settings", 
      description: "Update your personal information.", 
      icon: User, 
      link: "/patient/profile", 
      color: "text-purple-500",
      action: null
    },
  ];

  return (
    <>
      <Helmet>
        <title>Patient Dashboard - HealthTracker</title>
        <meta name="description" content="Your personal health dashboard." />
        <body className="bg-slate-100" />
      </Helmet>
      <div className="min-h-screen bg-slate-100 text-slate-800">
        <header className="bg-white shadow-sm">
          <div className="container mx-auto px-6 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-800">
              Welcome, <span className="text-emerald-600">{user?.name || 'User'}</span>!
            </h1>
            <Button variant="ghost" onClick={handleLogout}>
              <LogOut className="w-5 h-5 mr-2" />
              Log Out
            </Button>
          </div>
        </header>

        <main className="container mx-auto px-6 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-lg text-slate-600 mb-8">What would you like to do today?</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {dashboardItems.map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 + 0.2 }}
                >
                  <Link to={item.link} onClick={item.action}>
                    <Card className="h-full hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                      <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                        <div className="p-3 bg-slate-200 rounded-lg">
                            <item.icon className={`h-6 w-6 ${item.color}`} />
                        </div>
                        <CardTitle className="text-lg font-semibold">{item.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <CardDescription>{item.description}</CardDescription>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </main>
      </div>
    </>
  );
};

export default PatientDashboard;