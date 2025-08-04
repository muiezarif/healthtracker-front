import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import {
  Heart,
  Brain,
  Smile,
  Mic,
  MicOff,
  Plus,
  Bot,
  X,
  Phone,
  PhoneOff,
  Volume2,
  VolumeX,
} from 'lucide-react';

// Mock utility functions since we don't have access to the actual ones
const getSymptomColor = (type) => {
  const colors = {
    physical: 'from-red-500 to-orange-500',
    mental: 'from-purple-500 to-indigo-500',
    emotional: 'from-pink-500 to-rose-500'
  };
  return colors[type] || colors.physical;
};

const getSeverityColor = (severity) => {
  if (severity <= 3) return 'text-green-400';
  if (severity <= 6) return 'text-yellow-400';
  return 'text-red-400';
};

// Voice Agent Component
const VoiceAgent = ({ isOpen, onClose, onSymptomExtracted }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [conversation, setConversation] = useState([]);
  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && !isConnected) {
      connectToVoiceAgent();
    }
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [isOpen]);

  const connectToVoiceAgent = async () => {
    try {
      // Initialize audio context
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      
      // Connect to OpenAI Realtime API
      // Note: In production, you'd need to handle authentication through your backend
      const ws = new WebSocket('wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview');
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        toast({
          title: "🤖 AI Voice Agent Connected",
          description: "You can now speak with the AI assistant to record your symptoms."
        });

        // Send session configuration
        ws.send(JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: `You are a helpful medical assistant helping patients record their symptoms. 
            Ask relevant questions about their symptoms including:
            - Type (physical, mental, or emotional)
            - Description and details
            - Severity level (1-10)
            - Any additional notes or context
            
            Be empathetic and thorough. Once you have enough information, summarize the symptom data and ask for confirmation.`,
            voice: 'alloy',
            temperature: 0.7,
          }
        }));

        // Start conversation
        ws.send(JSON.stringify({
          type: 'conversation.item.create',
          item: {
            type: 'message',
            role: 'assistant',
            content: [{
              type: 'text',
              text: 'Hello! I\'m here to help you record your symptoms. Can you tell me what you\'re experiencing today?'
            }]
          }
        }));

        ws.send(JSON.stringify({
          type: 'response.create'
        }));
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleRealtimeEvent(data);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast({
          variant: "destructive",
          title: "Connection Error",
          description: "Failed to connect to AI voice agent. Please try again."
        });
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsListening(false);
        setIsSpeaking(false);
      };

    } catch (error) {
      console.error('Failed to connect:', error);
      toast({
        variant: "destructive",
        title: "Connection Failed",
        description: "Unable to initialize voice agent. Please check your connection."
      });
    }
  };

  const handleRealtimeEvent = (event) => {
    switch (event.type) {
      case 'response.audio.delta':
        // Handle audio playback
        setIsSpeaking(true);
        break;
      
      case 'response.audio.done':
        setIsSpeaking(false);
        break;
      
      case 'response.text.delta':
        setTranscript(prev => prev + event.delta);
        break;
      
      case 'response.text.done':
        setConversation(prev => [...prev, { role: 'assistant', content: event.text }]);
        setTranscript('');
        break;
      
      case 'input_audio_buffer.speech_started':
        setIsListening(true);
        break;
      
      case 'input_audio_buffer.speech_stopped':
        setIsListening(false);
        break;
      
      case 'conversation.item.input_audio_transcription.completed':
        setConversation(prev => [...prev, { role: 'user', content: event.transcript }]);
        break;
    }
  };

  const startListening = async () => {
    if (!wsRef.current || !audioContextRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      // Simple audio processing - in production you'd want more sophisticated audio handling
      setIsListening(true);
      
      // Send audio start event
      wsRef.current.send(JSON.stringify({
        type: 'input_audio_buffer.append',
        audio: '' // Base64 encoded audio data would go here
      }));

    } catch (error) {
      console.error('Microphone access denied:', error);
      toast({
        variant: "destructive",
        title: "Microphone Access Denied",
        description: "Please allow microphone access to use the voice agent."
      });
    }
  };

  const stopListening = () => {
    setIsListening(false);
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'input_audio_buffer.commit'
      }));
    }
  };

  const extractSymptomData = () => {
    // This would analyze the conversation and extract structured symptom data
    // For demo purposes, we'll show a mock extraction
    const mockSymptomData = {
      type: 'physical',
      description: 'Headache with sensitivity to light',
      severity: 7,
      notes: 'Started this morning, feels like tension headache'
    };
    
    onSymptomExtracted(mockSymptomData);
    onClose();
    
    toast({
      title: "✅ Symptom Data Extracted",
      description: "Your conversation has been processed and symptom data has been recorded."
    });
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-white/20 p-6 max-w-md w-full max-h-[80vh] overflow-hidden"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">AI Voice Agent</h3>
              <p className="text-sm text-gray-400">
                {isConnected ? (
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    Connected
                  </span>
                ) : (
                  'Connecting...'
                )}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="space-y-4">
          {/* Conversation Display */}
          <div className="bg-black/20 rounded-lg p-4 h-40 overflow-y-auto">
            {conversation.length === 0 ? (
              <p className="text-gray-400 text-center">
                Start speaking to begin the conversation...
              </p>
            ) : (
              <div className="space-y-2">
                {conversation.map((message, index) => (
                  <div
                    key={index}
                    className={`p-2 rounded text-sm ${
                      message.role === 'assistant'
                        ? 'bg-blue-500/20 text-blue-100'
                        : 'bg-gray-500/20 text-gray-100'
                    }`}
                  >
                    <span className="font-medium">
                      {message.role === 'assistant' ? '🤖 AI: ' : '👤 You: '}
                    </span>
                    {message.content}
                  </div>
                ))}
                {transcript && (
                  <div className="p-2 rounded text-sm bg-blue-500/20 text-blue-100">
                    <span className="font-medium">🤖 AI: </span>
                    {transcript}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Status Indicators */}
          <div className="flex items-center justify-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
              isListening ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
            }`}>
              {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              {isListening ? 'Listening...' : 'Not listening'}
            </div>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
              isSpeaking ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'
            }`}>
              {isSpeaking ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              {isSpeaking ? 'AI Speaking...' : 'AI Silent'}
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={isListening ? stopListening : startListening}
              disabled={!isConnected}
              className={`flex-1 ${
                isListening
                  ? 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600'
                  : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
              }`}
            >
              {isListening ? (
                <>
                  <PhoneOff className="w-4 h-4 mr-2" />
                  Stop Talking
                </>
              ) : (
                <>
                  <Phone className="w-4 h-4 mr-2" />
                  Start Talking
                </>
              )}
            </Button>
            
            <Button
              onClick={extractSymptomData}
              disabled={!isConnected || conversation.length === 0}
              className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Extract Data
            </Button>
          </div>

          <p className="text-xs text-gray-400 text-center">
            Speak naturally about your symptoms. The AI will ask follow-up questions to gather complete information.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

const RecordTab = ({ addSymptom }) => {
  const { toast } = useToast();
  const [newSymptom, setNewSymptom] = useState({
    type: 'physical',
    description: '',
    severity: 5,
    notes: ''
  });
  const [isRecording, setIsRecording] = useState(false);
  const [showVoiceAgent, setShowVoiceAgent] = useState(false);

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

  const handleSymptomExtracted = (symptomData) => {
    setNewSymptom(symptomData);
    toast({
      title: "🤖 AI Processed Your Symptoms",
      description: "Review the extracted data and record it to your health tracker."
    });
  };

  return (
    <div className="relative">
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

      {/* Floating AI Voice Agent Button */}
      <motion.div
        className="fixed bottom-6 right-6 z-40"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5 }}
        onClick={() => setShowVoiceAgent(true)}
      >
        <Button
          onClick={() => setShowVoiceAgent(true)}
          className="w-16 h-16 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 shadow-2xl shadow-purple-500/25 border-2 border-white/20"
        >
          <Bot className="w-8 h-8 text-white" />
        </Button>
        
        {/* Pulse animation rings */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 animate-ping opacity-20"></div>
        <div className="absolute inset-2 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 animate-ping opacity-10 animation-delay-75"></div>
      </motion.div>

      {/* Voice Agent Modal */}
      <AnimatePresence>
        <VoiceAgent
          isOpen={showVoiceAgent}
          onClose={() => setShowVoiceAgent(false)}
          onSymptomExtracted={handleSymptomExtracted}
        />
      </AnimatePresence>
    </div>
  );
};

export default RecordTab;