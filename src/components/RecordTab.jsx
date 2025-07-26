import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { getSymptomColor, getSeverityColor } from '@/lib/symptomUtils';
import {
  Heart,
  Brain,
  Smile,
  Mic,
  MicOff,
  Plus,
} from 'lucide-react';

const RecordTab = ({ addSymptom }) => {
  const { toast } = useToast();
  const [newSymptom, setNewSymptom] = useState({
    type: 'physical',
    description: '',
    severity: 5,
    notes: ''
  });
  const [isRecording, setIsRecording] = useState(false);

  const handleVoiceRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      return;
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        variant: "destructive",
        title: "Voice recording not supported",
        description: "Your browser doesn't support this feature. Please use text input instead."
      });
      return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    recognition.onstart = () => {
      setIsRecording(true);
      toast({
        title: "🎤 Listening...",
        description: "Speak your symptoms clearly."
      });
    };
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setNewSymptom(prev => ({ ...prev, description: transcript }));
      toast({
        title: "✅ Voice recorded!",
        description: "Your symptoms have been captured."
      });
    };
    
    recognition.onerror = (event) => {
      toast({
        variant: "destructive",
        title: "❌ Recording failed",
        description: event.error === 'not-allowed' ? "Microphone access denied." : "Please try again or type your symptoms."
      });
    };
    
    recognition.onend = () => {
      setIsRecording(false);
    };
    
    recognition.start();
  };

  const handleAddSymptom = () => {
    if (!newSymptom.description.trim()) {
      toast({
        variant: "destructive",
        title: "⚠️ Missing information",
        description: "Please describe your symptoms before recording."
      });
      return;
    }

    addSymptom(newSymptom);

    setNewSymptom({
      type: 'physical',
      description: '',
      severity: 5,
      notes: ''
    });

    toast({
      title: "✅ Symptom recorded!",
      description: "Your health data has been saved."
    });
  };

  return (
    <motion.div
      key="record"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-2xl mx-auto"
    >
      <Card className="bg-white/5 backdrop-blur-lg border-white/20 p-6 sm:p-8">
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Record New Symptom</h2>
            <p className="text-gray-300">Use voice or text to describe your symptoms.</p>
          </div>

          <div className="space-y-3">
            <Label className="text-white font-medium">Symptom Type</Label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { type: 'physical', label: 'Physical', icon: Heart },
                { type: 'mental', label: 'Mental', icon: Brain },
                { type: 'emotional', label: 'Emotional', icon: Smile }
              ].map(({ type, label, icon: Icon }) => (
                <Button
                  key={type}
                  variant={newSymptom.type === type ? 'default' : 'outline'}
                  onClick={() => setNewSymptom(prev => ({ ...prev, type }))}
                  className={`p-4 h-auto flex-col gap-2 transition-all ${
                    newSymptom.type === type
                      ? `bg-gradient-to-r ${getSymptomColor(type)} text-white shadow-lg`
                      : 'bg-white/5 border-white/20 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                  <span className="font-medium">{label}</span>
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-white font-medium">Voice Recording</Label>
            <Button
              onClick={handleVoiceRecording}
              disabled={isRecording}
              className={`w-full p-6 h-auto transition-all text-lg font-semibold ${
                isRecording
                  ? 'bg-gradient-to-r from-red-500 to-pink-500 animate-pulse'
                  : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600'
              }`}
            >
              {isRecording ? (
                <>
                  <MicOff className="w-6 h-6 mr-3" />
                  Recording... Tap to stop
                </>
              ) : (
                <>
                  <Mic className="w-6 h-6 mr-3" />
                  Tap to record symptoms
                </>
              )}
            </Button>
          </div>

          <div className="space-y-3">
            <Label className="text-white font-medium">Description</Label>
            <Textarea
              value={newSymptom.description}
              onChange={(e) => setNewSymptom(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe your symptoms in detail..."
              className="bg-white/5 border-white/20 text-white placeholder:text-gray-400 min-h-[100px]"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-white font-medium">
              Severity Level: <span className={`font-bold ${getSeverityColor(newSymptom.severity)}`}>
                {newSymptom.severity}/10
              </span>
            </Label>
            <input
              type="range"
              min="1"
              max="10"
              value={newSymptom.severity}
              onChange={(e) => setNewSymptom(prev => ({ ...prev, severity: parseInt(e.target.value, 10) }))}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-sm text-gray-400">
              <span>Mild</span>
              <span>Moderate</span>
              <span>Severe</span>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-white font-medium">Additional Notes (Optional)</Label>
            <Textarea
              value={newSymptom.notes}
              onChange={(e) => setNewSymptom(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Any additional context, triggers, or observations..."
              className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
            />
          </div>

          <Button
            onClick={handleAddSymptom}
            className="w-full p-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-medium text-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Record Symptom
          </Button>
        </div>
      </Card>
    </motion.div>
  );
};

export default RecordTab;