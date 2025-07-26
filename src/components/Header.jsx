import React from 'react';
import { motion } from 'framer-motion';
import { Stethoscope } from 'lucide-react';
import { Link } from 'react-router-dom';

const Header = () => {
  return (
    <div className="text-center mb-8">
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="flex items-center justify-center gap-3 mb-4"
      >
        <div className="p-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl">
          <Stethoscope className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">HealthTracker by Tanya Riley</h1>
      </motion.div>
      <motion.p 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.1 }}
        className="text-xl text-gray-300 max-w-2xl mx-auto"
      >
        Monitor your health journey with voice-enabled symptom tracking and seamless provider sharing
      </motion.p>
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        transition={{ delay: 0.5 }}
        className="absolute bottom-4 right-4"
      >
        <Link to="/login" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
          ADM
        </Link>
      </motion.div>
    </div>
  );
};

export default Header;