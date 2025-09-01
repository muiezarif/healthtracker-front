import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import ProviderHeader from '@/components/provider/ProviderHeader';
import PatientList from '@/components/provider/PatientList';
import PatientDetails from '@/components/provider/PatientDetails';
import OrderKitsTab from '@/components/provider/OrderKitsTab';
import EducationalResourcesTab from '@/components/provider/EducationalResourcesTab';
import ManageLinkRequestsTab from '@/components/provider/ManageLinkRequestsTab';
import ManagePatientsTab from '@/components/provider/ManagePatientsTab';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { providerGetAllPatients, providerGetPatientDetails, providerGetPatientSymptoms } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';

const ProviderPortal = () => {
  const { token } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('results');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchPatients = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const patientsData = await providerGetAllPatients(token);
      console.log('Fetched patients:', patientsData);
      const patientsWithId = patientsData.result.map(p => ({ ...p, id: p._id, name: p.name, symptoms: p.symptoms || [] }));
      setPatients(patientsWithId);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error fetching patients',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const handleSelectPatient = async (patient) => {
    if (!token) return;
    setLoadingDetails(true);
    setSelectedPatient(patient); // Show patient name while loading details
    try {
      const [details, symptomsData] = await Promise.all([
        providerGetPatientDetails(token, patient.id),
        providerGetPatientSymptoms(token, patient.id)
      ]);

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
        };
      });

      setSelectedPatient({ ...details, id: details._id, symptoms: formattedSymptoms });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error fetching patient details',
        description: error.message,
      });
      setSelectedPatient(null); // Clear selection on error
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleBackToList = () => {
    setSelectedPatient(null);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center p-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-t-emerald-500 border-slate-200 rounded-full"
          />
        </div>
      );
    }

    switch (activeTab) {
      case 'results':
        return (
          <AnimatePresence mode="wait">
            {selectedPatient ? (
              <motion.div
                key="details"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <PatientDetails patient={selectedPatient} onBack={handleBackToList} loading={loadingDetails} />
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <PatientList patients={patients} onSelectPatient={handleSelectPatient} />
              </motion.div>
            )}
          </AnimatePresence>
        );
      case 'managePatients':
        return <ManagePatientsTab patients={patients} refreshData={fetchPatients} />;
      case 'linkRequests':
        return <ManageLinkRequestsTab />;
      case 'orderKits':
        return <OrderKitsTab />;
      case 'educationalResources':
        return <EducationalResourcesTab />;
      default:
        return null;
    }
  };

  return (
    <>
      <Helmet>
        <title>Provider Portal - HealthTracker</title>
        <meta name="description" content="Manage patients and view their health data." />
        <body className="bg-slate-100" />
      </Helmet>
      <div className="min-h-screen flex flex-col text-slate-800">
        <ProviderHeader activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="flex-grow container mx-auto px-6 py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </>
  );
};

export default ProviderPortal;