import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Stethoscope, User } from 'lucide-react';

const Home = () => {
  return (
    <>
      <Helmet>
        <title>Welcome to HealthTracker</title>
        <meta name="description" content="Login as a patient or provider to track and manage health data." />
        <body className="auth-bg" />
      </Helmet>
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-center"
        >
          <h1 className="text-5xl md:text-6xl font-extrabold text-slate-800" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            Welcome to <span className="text-emerald-600">HealthTracker</span>
          </h1>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            Your comprehensive solution for tracking, analyzing, and managing health symptoms and data.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.5, ease: "easeOut" }}
          className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl"
        >
          <Card
            icon={<User className="w-12 h-12 text-blue-500" />}
            title="Patient Portal"
            description="Track your symptoms, view your health history, and connect with your provider."
            linkTo="/login?role=patient"
            buttonText="Patient Login"
          />
          <Card
            icon={<Stethoscope className="w-12 h-12 text-emerald-500" />}
            title="Provider Portal"
            description="Manage your patients, analyze their data, and provide better care."
            linkTo="/login?role=provider"
            buttonText="Provider Login"
          />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1 }}
          className="mt-8 text-center"
        >
          <p className="text-slate-600">
            Don't have an account?{' '}
            <Link to="/signup" className="font-semibold text-emerald-600 hover:text-emerald-700">
              Sign up now
            </Link>
          </p>
        </motion.div>
      </div>
    </>
  );
};

const Card = ({ icon, title, description, linkTo, buttonText }) => (
  <div className="bg-white/70 backdrop-blur-xl p-8 rounded-2xl shadow-lg text-center flex flex-col items-center border border-white/50">
    <div className="mb-4">{icon}</div>
    <h2 className="text-2xl font-bold text-slate-800 mb-2">{title}</h2>
    <p className="text-slate-600 mb-6 flex-grow">{description}</p>
    <Button asChild className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300">
      <Link to={linkTo}>{buttonText}</Link>
    </Button>
  </div>
);

export default Home;