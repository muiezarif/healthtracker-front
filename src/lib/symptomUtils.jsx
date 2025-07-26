import { HeartPulse, BrainCircuit, Smile, AlertTriangle } from 'lucide-react';

export const getSeverity = (symptoms) => {
  if (!symptoms || symptoms.length === 0) return { level: "Mild", color: "text-green-500", score: 0 };

  const totalScore = symptoms.reduce((acc, symptom) => {
    const normalized = symptom.type.toLowerCase();
    let score = 0;
    if (normalized === 'physical') score = 3;
    if (normalized === 'mental') score = 2;
    if (normalized === 'emotional') score = 1;
    return acc + score;
  }, 0);

  const averageScore = totalScore / symptoms.length;

  if (averageScore >= 2.5) {
    return { level: "Severe", color: "text-red-500", score: 3 };
  }
  if (averageScore >= 1.5) {
    return { level: "Moderate", color: "text-yellow-500", score: 2 };
  }
  return { level: "Mild", color: "text-green-500", score: 1 };
};

export const getUrgencyFromSymptoms = (symptoms) => {
  return getSeverity(symptoms);
};

export const getSymptomColor = (type) => {
  const normalized = type.toLowerCase();
  switch (normalized) {
    case 'physical':
      return 'from-red-500 to-orange-500';
    case 'mental':
      return 'from-blue-500 to-sky-500';
    case 'emotional':
      return 'from-amber-500 to-yellow-500';
    default:
      return 'from-slate-500 to-slate-600';
  }
};

export const getSeverityColor = (severity) => {
  if (severity >= 8) return 'text-red-400';
  if (severity >= 5) return 'text-yellow-400';
  return 'text-green-400';
};

export const getSymptomIcon = (type) => {
  const normalized = type.toLowerCase();
  switch (normalized) {
    case 'physical':
      return HeartPulse;
    case 'mental':
      return BrainCircuit;
    case 'emotional':
      return Smile;
    default:
      return AlertTriangle;
  }
};
