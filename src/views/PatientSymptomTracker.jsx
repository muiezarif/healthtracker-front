import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { patientGetSymptomsHistory, patientAddSymptom } from '@/lib/api';
import { Stethoscope, ArrowLeft } from 'lucide-react';
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
      console.log('Fetched symptoms:', symptomsData);
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

    // const payload = {
    //   physical_symptoms: newSymptom.type === 'physical' ? [newSymptom.description] : [],
    //   mental_symptoms: newSymptom.type === 'mental' ? [newSymptom.description] : [],
    //   emotional_symptoms: newSymptom.type === 'emotional' ? [newSymptom.description] : [],
    //   severity: newSymptom.severity,
    //   notes: newSymptom.notes,
    // };

    const payload = {
      symptom_type: newSymptom.type,
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
        <body className="bg-gradient-to-br from-gray-900 to-slate-800" />
      </Helmet>
      <div className="min-h-screen text-white p-4 sm:p-6 lg:p-8 relative">
        <div className="absolute top-6 left-6">
          <Button asChild variant="ghost" className="text-gray-300 hover:text-white hover:bg-white/10">
            <Link to="/patient">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
        <main className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            <div className="inline-block p-3 bg-white/10 rounded-2xl mb-4">
              <Stethoscope className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">HealthTracker</h1>
            <p className="text-lg text-gray-300 mt-2">
              Monitor your health journey with voice-enabled symptom tracking and seamless provider sharing
            </p>
          </motion.div>

          <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

          <AnimatePresence mode="wait">
            {renderContent()}
          </AnimatePresence>
        </main>
      </div>
    </>
  );
};

export default PatientSymptomTracker;