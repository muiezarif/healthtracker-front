import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { registerUser } from '@/lib/api';
import healthtrackerapi from '../lib/healthtrackerapi';

const SignUp = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [role, setRole] = useState('patient');
  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    healthtrackerapi.post('/auth/register', {
      name: fullName,
      email,
      password,
      role,
    })
    .then(response => {
      toast({
        title: '🎉 Account Created!' ,
        description: "You can now log in with your new credentials.",
      });
      navigate('/login');
    })
    .catch(error => {
      toast({
        variant: "destructive",
        title: "Sign up Failed",
        description: error.response?.data?.message || "Something went wrong",
      });
    })
    .finally(() => setLoading(false));
    
    // try {
    //   await registerUser(fullName, email, password, role);
    //   toast({
    //     title: '🎉 Account Created!',
    //     description: "You can now log in with your new credentials.",
    //   });
    //   navigate('/login');
    // } catch (error) {
    //    toast({
    //     variant: "destructive",
    //     title: "Sign up Failed",
    //     description: error.message || "Something went wrong",
    //   });
    // } finally {
    //     setLoading(false);
    // }
  };

  return (
    <>
      <Helmet>
        <title>Sign Up - HealthTracker</title>
        <meta name="description" content="Create a new HealthTracker account." />
        <body className="auth-bg" />
      </Helmet>
      <div className="min-h-screen flex items-center justify-center p-4 relative">
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute top-6 left-6"
        >
            <Button asChild variant="outline" className="rounded-full bg-white/70">
              <Link to="/">
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Home
              </Link>
            </Button>
        </motion.div>
        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="bg-white/70 backdrop-blur-xl p-8 rounded-2xl shadow-lg border border-white/50"
          >
            <div className="text-center mb-8">
              <div className="inline-block p-4 bg-white rounded-full mb-4 shadow-md">
                <UserPlus className="w-10 h-10 text-emerald-500" />
              </div>
              <h1 className="text-3xl font-bold text-slate-800">Create an Account</h1>
              <p className="text-slate-600 mt-2">
                Join us to start your health journey.
              </p>
            </div>

            <Tabs value={role} onValueChange={setRole} className="w-full mb-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="patient">I'm a Patient</TabsTrigger>
                <TabsTrigger value="provider">I'm a Provider</TabsTrigger>
              </TabsList>
            </Tabs>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="bg-white/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white/50"
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300">
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-emerald-600 hover:text-emerald-700">
                Log in
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default SignUp;