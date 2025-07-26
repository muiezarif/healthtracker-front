import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, LogIn } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '@/contexts/AuthContext';
import healthtrackerapi from '../lib/healthtrackerapi';

const Login = () => {
  const navigate = useNavigate();
  const {setUser,setToken,setLoading,loading} = useAuth();
  const { toast } = useToast();
  const { signIn } = useAuth();
  const [role, setRole] = useState('patient');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    healthtrackerapi.post('/auth/login', {
      email,
      password,
      role,
    })
    .then(response => {
      const { token, user } = response.data.result;
      console.log("Login response:", response.data);
      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      setToken(token);
      setLoading(false);
      toast({
        title: '🎉 Logged in successfully!',
        description: `Redirecting you to your ${user.role} dashboard.`,
      });
      switch (user.role) {
        case 'admin':
          navigate('/admin');
          break;
        case 'provider':
          navigate('/provider');
          break;
        case 'patient':
        default:
          navigate('/patient');
          break;
      }
    })
    .catch(error => {
      console.log("Sign in error:", error);
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.response?.data?.message || "Invalid credentials. Please try again.",
      });
    })
    .finally(() => setLoading(false));
    // const { data, error } = await signIn(email, password, role);

    // if (error) {
    //   toast({
    //     variant: "destructive",
    //     title: "Login Failed",
    //     description: error.message || "Invalid credentials. Please try again.",
    //   });
    //   setLoading(false);
    //   return;
    // }

    // if (data) {
    //   toast({
    //     title: '🎉 Logged in successfully!',
    //     description: `Redirecting you to your ${data.user.role} dashboard.`,
    //   });
      
    //   switch (data.user.role) {
    //     case 'admin':
    //       navigate('/admin');
    //       break;
    //     case 'provider':
    //       navigate('/provider');
    //       break;
    //     case 'patient':
    //     default:
    //       navigate('/patient');
    //       break;
    //   }
    // }
    // setLoading(false);
  };

  return (
    <>
      <Helmet>
        <title>Login - HealthTracker</title>
        <meta name="description" content="Log in to your HealthTracker account." />
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
                <LogIn className="w-10 h-10 text-emerald-500" />
              </div>
              <h1 className="text-3xl font-bold text-slate-800">Welcome Back!</h1>
              <p className="text-slate-600 mt-2">
                Log in to continue your health journey.
              </p>
            </div>

            <Tabs value={role} onValueChange={setRole} className="w-full mb-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="patient">Patient</TabsTrigger>
                <TabsTrigger value="provider">Provider</TabsTrigger>
                <TabsTrigger value="admin">Admin</TabsTrigger>
              </TabsList>
            </Tabs>

            <form onSubmit={handleSubmit} className="space-y-6">
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white/50"
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300">
                {loading ? 'Logging In...' : 'Log In'}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">
              Don't have an account?{' '}
              <Link to="/signup" className="font-semibold text-emerald-600 hover:text-emerald-700">
                Sign up
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default Login;