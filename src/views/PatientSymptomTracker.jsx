import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { patientGetSymptomsHistory, patientAddSymptom } from '@/lib/api';
import { Stethoscope, ArrowLeft, History, Users, BarChart3, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

import Navigation from '@/components/Navigation';
import RecordTab from '@/components/RecordTab';
import HistoryTab from '@/components/HistoryTab';
import ProvidersTab from '@/components/ProvidersTab';
import InsightsTab from '@/components/InsightsTab';

const PatientSymptomTracker = () => {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('record');
  const [symptoms, setSymptoms] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSymptoms = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const symptomsData = await patientGetSymptomsHistory(token);
      const formattedSymptoms = symptomsData.result.map(s => {
        const date = new Date(s.createdAt);
        return {
          id: s._id,
          type: s.symptom_type,
          description: s.description,
          severity: s.severity_level || 5,
          notes: s.additional_notes || '',
          timestamp: s.createdAt,
          date: date.toLocaleDateString(),
          time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      });
      setSymptoms(formattedSymptoms);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error fetching history', description: error.message });
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => {
    fetchSymptoms();
  }, [fetchSymptoms]);

  const addSymptom = useCallback(async (newSymptom) => {
    if (!token) {
      toast({ variant: 'destructive', title: 'You must be logged in.' });
      return;
    }

    const payload = {
      symptom_type: newSymptom.type,
      symptom:newSymptom.symptom,
      description: newSymptom.description,
      severity_level: newSymptom.severity,
      additional_notes: newSymptom.notes,
    }

    try {
      await patientAddSymptom(token, payload);
      toast({ title: 'Symptom submitted successfully!' });
      fetchSymptoms(); // Refresh the list
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error submitting symptom', description: error.message });
    }
  }, [token, toast, fetchSymptoms]);

  const renderContent = () => {
    switch (activeTab) {
      case 'record':
        return <RecordTab addSymptom={addSymptom} />;
      case 'history':
        return <HistoryTab symptoms={symptoms} />;
      case 'providers':
        return <ProvidersTab />;
      case 'insights':
        return <InsightsTab />;
      default:
        return null;
    }
  };

  return (
    <>
      <Helmet>
        <title>Symptom Tracker - HealthTracker</title>
        <meta name="description" content="Monitor your health journey with voice-enabled symptom tracking." />
        {/* Make sure we render responsively on phones */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <body className="bg-gradient-to-br from-gray-900 to-slate-800" />
      </Helmet>

      {/* Sticky top app bar on mobile */}
      <header className="sm:hidden sticky top-0 z-50 bg-black/30 backdrop-blur border-b border-white/10">
        <div className="px-4 h-14 flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="text-gray-200 hover:text-white">
            <Link to="/patient" aria-label="Back to dashboard">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold">Symptom Tracker</span>
          </div>
        </div>
      </header>

      <div className="min-h-screen text-white px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 lg:pt-8 pb-28 sm:pb-10 relative">
        {/* Desktop back button (kept out of flow on large screens) */}
        <div className="hidden sm:block absolute top-6 left-6">
          <Button asChild variant="ghost" className="text-gray-300 hover:text-white hover:bg-white/10">
            <Link to="/patient">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>

        <main className="max-w-3xl mx-auto w-full">
          {/* Hero header (responsive sizes) */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="text-center mb-6 sm:mb-8 mt-2 sm:mt-0"
          >
            <div className="hidden sm:inline-block p-3 bg-white/10 rounded-2xl mb-4">
              <Stethoscope className="w-8 h-8 text-emerald-400" />
            </div>

            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight">
              HealthTracker
            </h1>
            <p className="text-sm sm:text-lg text-gray-300 mt-2 px-1">
              Monitor your health journey with voice-enabled symptom tracking and seamless provider sharing
            </p>
          </motion.div>

          {/* Desktop/Tablet navigation */}
          <div className="hidden sm:block">
            <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
          </div>

          {/* Content area */}
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex items-center justify-center h-48"
              >
                <div className="flex items-center gap-3 text-gray-300">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Loading your symptoms…</span>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                {renderContent()}
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Bottom mobile tab bar */}
        <nav
          className="sm:hidden fixed bottom-0 inset-x-0 z-50 border-t border-white/10 bg-gradient-to-t from-gray-900 to-gray-900/80 backdrop-blur"
          role="tablist"
          aria-label="Mobile navigation"
        >
          <div className="grid grid-cols-4">
            <button
              role="tab"
              aria-selected={activeTab === 'record'}
              onClick={() => setActiveTab('record')}
              className={`flex flex-col items-center justify-center py-2 text-xs ${activeTab === 'record' ? 'text-emerald-400' : 'text-gray-300'}`}
            >
              <Stethoscope className="w-5 h-5 mb-1" />
              Record
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'history'}
              onClick={() => setActiveTab('history')}
              className={`flex flex-col items-center justify-center py-2 text-xs ${activeTab === 'history' ? 'text-emerald-400' : 'text-gray-300'}`}
            >
              <History className="w-5 h-5 mb-1" />
              History
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'providers'}
              onClick={() => setActiveTab('providers')}
              className={`flex flex-col items-center justify-center py-2 text-xs ${activeTab === 'providers' ? 'text-emerald-400' : 'text-gray-300'}`}
            >
              <Users className="w-5 h-5 mb-1" />
              Providers
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'insights'}
              onClick={() => setActiveTab('insights')}
              className={`flex flex-col items-center justify-center py-2 text-xs ${activeTab === 'insights' ? 'text-emerald-400' : 'text-gray-300'}`}
            >
              <BarChart3 className="w-5 h-5 mb-1" />
              Insights
            </button>
          </div>
          {/* Safe-area spacer for iOS */}
          <div className="h-3" />
        </nav>
      </div>
    </>
  );
};

export default PatientSymptomTracker;
