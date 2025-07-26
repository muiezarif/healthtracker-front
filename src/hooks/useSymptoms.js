import { useLocalStorage } from './useLocalStorage';

export const useSymptoms = () => {
    const [symptoms, setSymptoms] = useLocalStorage('healthTracker_symptoms', []);
  
    const addSymptom = (newSymptom) => {
      const symptom = {
        id: Date.now(),
        ...newSymptom,
        timestamp: new Date().toISOString(),
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
      };
      setSymptoms(prev => [symptom, ...prev]);
    };

    return { symptoms, addSymptom };
};