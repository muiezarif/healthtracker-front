import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { getSeverityColor, getUrgencyFromSymptoms } from '@/lib/symptomUtils.jsx';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Heart,
  Brain,
  Smile,
  User as UserIcon,
  Loader2
} from 'lucide-react';
import ProviderPatientReport from '@/components/provider/ProviderPatientReport';

const PatientDetails = ({ patient, onBack, loading }) => {
  const { toast } = useToast();
  const [showReport, setShowReport] = useState(false);
  const urgency = getUrgencyFromSymptoms(patient?.symptoms || []);

  // Robustly resolve a 24-char ObjectId string from various shapes
  const resolvePatientId = (p) => {
    const val = String(
      p?._id || p?.id ||
      p?.result?._id || p?.result?.id ||
      p?.patient?._id || p?.patient?.id ||
      ""
    ).trim();
    return val;
  };
  const pid = resolvePatientId(patient);
  // (Optional) dev hint if id looks wrong
  if (process.env.NODE_ENV !== "production" && pid && !/^[a-fA-F0-9]{24}$/.test(pid)) {
    // eslint-disable-next-line no-console
    console.warn("[PatientDetails] patientId is not a 24-char ObjectId:", pid);
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-500" />
      </div>
    );
  }

  const symptomTypes = {
    physical: (patient?.symptoms || []).filter(s => s.type === 'physical'),
    mental: (patient?.symptoms || []).filter(s => s.type === 'mental'),
    emotional: (patient?.symptoms || []).filter(s => s.type === 'emotional'),
  };

  const SymptomCategory = ({ title, icon: Icon, symptoms }) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Icon className="w-6 h-6 text-teal-500" />
          {title}
        </CardTitle>
        <CardDescription>{symptoms.length} entries</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 max-h-96 overflow-y-auto">
        {symptoms.length > 0 ? (
          symptoms.map((symptom, index) => (
            <motion.div
              key={symptom.id || symptom._id || index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-4 border rounded-lg bg-slate-50/50"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-slate-700">{symptom.description}</p>
                <span className={`font-bold text-sm ${getSeverityColor(symptom.severity)}`}>
                  {symptom.severity}/10
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {symptom.date}</div>
                  <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> {symptom.time}</div>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <p className="text-slate-500 text-center py-4">No {title.toLowerCase()} symptoms recorded.</p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Patient List
        </Button>
        <Button
          onClick={() => {
            if (!pid) {
              toast({ variant: "destructive", title: "Missing patient id", description: "Cannot open the report without a patient id." });
              return;
            }
            setShowReport(true);
          }}
          className="bg-teal-500 hover:bg-teal-600"
        >
          Get Report
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="p-4 bg-teal-100 rounded-full">
              <UserIcon className="w-8 h-8 text-teal-600" />
            </div>
            <div>
              <CardTitle className="text-3xl">{patient?.name || patient?.fullName || "Patient"}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                Urgency: <span className={`font-bold ${urgency.color}`}>{urgency.level}</span>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid md:grid-cols-3 gap-6">
        <SymptomCategory title="Physical" icon={Heart} symptoms={symptomTypes.physical} />
        <SymptomCategory title="Mental" icon={Brain} symptoms={symptomTypes.mental} />
        <SymptomCategory title="Emotional" icon={Smile} symptoms={symptomTypes.emotional} />
      </div>

      {/* Inline Report Panel (opens voice agent) */}
      {showReport && pid && (
        <div className="mt-6">
          <ProviderPatientReport patientId={pid} onClose={() => setShowReport(false)} />
        </div>
      )}
    </motion.div>
  );
};

export default PatientDetails;
