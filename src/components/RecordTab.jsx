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
  Activity,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import healthtrackerapi from '../lib/healthtrackerapi';

// Utility functions
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

// ---------- Voice Agent ----------
const VoiceAgent = ({ isOpen, onClose, onSymptomExtracted }) => {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const [sessionComplete, setSessionComplete] = useState(false);
  const [error, setError] = useState('');
  const [events, setEvents] = useState([]);
  const [dataChannel, setDataChannel] = useState(null);

  const peerConnection = useRef(null);
  const audioElement = useRef(null);
  const { toast } = useToast();

  // Capture the five answers in order
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState({
    symptom_type: '',     // physical | mental | emotional
    symptom: '',          // short name e.g., "headache"
    severity_level: 5,    // 1..10
    description: '',      // details
    additional_notes: ''  // extras
  });

  // --- Normalizers (be generous with real-world phrasing) ---
  const normalizeSymptomType = (text) => {
    const v = String(text || '').toLowerCase().replace(/[.!,?]/g, ' ').trim();
    if (/(phys|body|bodily|physical)/.test(v)) return 'physical';
    if (/(ment|psych|anxiety|stress|mental)/.test(v)) return 'mental';
    if (/(emo|mood|feelings|emotional)/.test(v)) return 'emotional';
    // default fallback: return what we have (UI will still show it)
    return v || '';
  };

  const toSeverityNumber = (val) => {
    if (typeof val === 'number' && !Number.isNaN(val)) {
      return Math.min(10, Math.max(1, val));
    }
    const s = String(val || '').toLowerCase();

    // 7/10, 8 out of 10, rate is 6, etc.
    const digitFirst = s.match(/\b(10|[1-9])\b/);
    if (digitFirst) return Math.min(10, Math.max(1, Number(digitFirst[1])));

    // spelled numbers
    const words = {
      one:1, two:2, three:3, four:4, five:5,
      six:6, seven:7, eight:8, nine:9, ten:10
    };
    for (const w in words) {
      if (new RegExp(`\\b${w}\\b`).test(s)) {
        return words[w];
      }
    }
    return 5; // safe default
  };

  useEffect(() => {
    if (isOpen) {
      // Initialize audio element
      audioElement.current = document.createElement('audio');
      audioElement.current.autoplay = true;
    }
    return () => { stopSession(); };
  }, [isOpen]);

  const startSession = async () => {
    try {
      setIsConnecting(true);
      setError('');
      setIsSessionActive(false);

      // Reset capture state at the beginning of every session
      setStepIndex(0);
      setAnswers({
        symptom_type: '',
        symptom: '',
        severity_level: 5,
        description: '',
        additional_notes: ''
      });
      setEvents([]);

      // Get ephemeral token from your backend
      const tokenResponse = await healthtrackerapi.get('/token'); // axios instance call
      if (tokenResponse.status !== 200) {
        throw new Error(
          `Token request failed: ${tokenResponse.status} - ${tokenResponse.statusText || 'Bad response'}`
        );
      }
      const data = tokenResponse.data;
      if (!data?.client_secret?.value) {
        console.error('Unexpected token payload:', data);
        throw new Error('Invalid token response structure');
      }
      const EPHEMERAL_KEY = data.client_secret.value;

      // Create peer connection
      const pc = new RTCPeerConnection();
      peerConnection.current = pc;

      // Play remote audio from the AI
      pc.ontrack = (e) => {
        if (audioElement.current) {
          audioElement.current.srcObject = e.streams[0];
        }
      };

      // Add local audio track (microphone)
      const ms = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      pc.addTrack(ms.getTracks()[0]);

      // Data channel for events
      const dc = pc.createDataChannel('oai-events');
      setDataChannel(dc);

      // Offer/answer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const baseUrl = 'https://api.openai.com/v1/realtime';
      const model = 'gpt-4o-realtime-preview-2024-12-17';
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${EPHEMERAL_KEY}`,
          'Content-Type': 'application/sdp',
        },
      });

      if (!sdpResponse.ok) {
        const errorText = await sdpResponse.text();
        throw new Error(`SDP exchange failed: ${sdpResponse.status} - ${errorText}`);
      }

      const answer = { type: 'answer', sdp: await sdpResponse.text() };
      await pc.setRemoteDescription(answer);

      toast({
        title: '🤖 AI Assistant Connected',
        description: 'Voice session started. You can now speak with the AI.',
      });
    } catch (err) {
      console.error('Session start error:', err);
      setError(`Failed to start session: ${err.message}`);
      toast({
        variant: 'destructive',
        title: 'Connection Failed',
        description: err.message,
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const stopSession = () => {
    if (dataChannel) { try { dataChannel.close(); } catch {} }
    if (peerConnection.current) {
      try {
        peerConnection.current.getSenders().forEach((sender) => {
          try { sender.track && sender.track.stop(); } catch {}
        });
        peerConnection.current.close();
      } catch {}
      peerConnection.current = null;
    }
    setIsSessionActive(false);
    setDataChannel(null);
  };

  const sendClientEvent = (message) => {
    if (dataChannel && dataChannel.readyState === 'open') {
      const timestamp = new Date().toLocaleTimeString();
      message.event_id = message.event_id || crypto.randomUUID();
      dataChannel.send(JSON.stringify(message));
      if (!message.timestamp) message.timestamp = timestamp;
      setEvents((prev) => [message, ...prev]);
    } else {
      console.error('Failed to send message - data channel not ready', message);
    }
  };

  const sendTextMessage = (message) => {
    const event = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text: message }],
      },
    };
    sendClientEvent(event);
    sendClientEvent({ type: 'response.create' });
  };

  // Data channel listeners
  useEffect(() => {
    if (!dataChannel) return;

    const onMessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (!event.timestamp) event.timestamp = new Date().toLocaleTimeString();

        switch (event.type) {
          case 'conversation.item.created': {
            if (event.item?.role === 'assistant' && event.item?.content) {
              const content = event.item.content[0];
              if (content?.text) setCurrentMessage(content.text);
            }
            break;
          }

          case 'conversation.item.input_audio_transcription.completed': {
            // User speech → transcript
            const saidRaw = event.transcript || '';
            const said = String(saidRaw).trim();

            setAnswers((prev) => {
              const next = { ...prev };
              if (stepIndex === 0) next.symptom_type = normalizeSymptomType(said);
              else if (stepIndex === 1) next.symptom = said;
              else if (stepIndex === 2) next.severity_level = toSeverityNumber(said);
              else if (stepIndex === 3) next.description = said;
              else if (stepIndex === 4) next.additional_notes = said;

              // LIVE UPDATE the parent form so users see fields fill in immediately:
              onSymptomExtracted(next); // ← remove this line if you only want final submit to populate

              return next;
            });

            setStepIndex((i) => Math.min(i + 1, 4));
            break;
          }

          case 'response.done':
            // AI finished a turn
            break;

          case 'error':
            setError(event.error?.message || 'Realtime error');
            break;
        }

        setEvents((prev) => [event, ...prev]);
      } catch (err) {
        console.error('Error parsing data channel message:', err);
      }
    };

    const onOpen = () => {
      setIsSessionActive(true);
      setEvents([]);
      setTimeout(() => {
        sendTextMessage("Hello, I'm ready to record my symptoms. Please help me get started.");
      }, 600);
    };

    const onClose = () => setIsSessionActive(false);
    const onError = (err) => {
      console.error('Data channel error:', err);
      setError('Communication error occurred');
    };

    dataChannel.addEventListener('message', onMessage);
    dataChannel.addEventListener('open', onOpen);
    dataChannel.addEventListener('close', onClose);
    dataChannel.addEventListener('error', onError);

    return () => {
      dataChannel.removeEventListener('message', onMessage);
      dataChannel.removeEventListener('open', onOpen);
      dataChannel.removeEventListener('close', onClose);
      dataChannel.removeEventListener('error', onError);
    };
  }, [dataChannel, stepIndex, onSymptomExtracted]);

  const handleSessionComplete = () => {
    setSessionComplete(true);
    onSymptomExtracted(answers);
    toast({
      title: '✅ Session Complete!',
      description: 'Your symptoms have been recorded successfully.'
    });
  };

  const handleClose = () => {
    stopSession();
    onClose();
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
        className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-white/20 p-6 max-w-lg w-full max-h-[85vh] overflow-hidden"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">AI Health Assistant</h3>
              <p className="text-sm text-gray-400">
                {isSessionActive ? (
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    Connected & Active
                  </span>
                ) : isConnecting ? (
                  <span className="flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Connecting...
                  </span>
                ) : (
                  'Ready to Connect'
                )}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {sessionComplete ? (
          <div className="text-center space-y-4">
            <div className="p-4 bg-green-500/20 rounded-lg border border-green-500/30">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <h3 className="text-xl font-semibold text-white mb-2">Session Complete!</h3>
              <p className="text-gray-300">Your symptoms have been recorded and processed.</p>
            </div>

            <Button
              onClick={handleClose}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            >
              Continue to Record Form
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Current AI Message */}
            {currentMessage && (
              <div className="bg-black/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Activity className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-400 mb-1">AI Assistant:</p>
                    <p className="text-gray-100 text-sm">{currentMessage}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Events */}
            {events.length > 0 && (
              <div className="bg-black/20 rounded-lg p-4 max-h-40 overflow-y-auto">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Recent Activity:</h4>
                <div className="space-y-1">
                  {events.slice(0, 3).map((event, index) => (
                    <div key={index} className="text-xs text-gray-400">
                      <span className="font-mono">{event.timestamp}</span> - {event.type}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Status Indicators */}
            <div className="flex items-center justify-center gap-4">
              <div
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                  isSessionActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                }`}
              >
                {isSessionActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                {isSessionActive ? 'Voice Active' : 'Voice Inactive'}
              </div>
            </div>

            {/* Control Buttons */}
            <div className="space-y-3">
              {!isSessionActive ? (
                <Button
                  onClick={startSession}
                  disabled={isConnecting}
                  className="w-full p-4 text-lg font-semibold bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:opacity-50"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Phone className="w-5 h-5 mr-2" />
                      Start Voice Session
                    </>
                  )}
                </Button>
              ) : (
                <div className="space-y-2">
                  <Button
                    onClick={stopSession}
                    className="w-full p-4 text-lg font-semibold bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600"
                  >
                    <PhoneOff className="w-5 h-5 mr-2" />
                    End Session
                  </Button>

                  <Button
                    onClick={handleSessionComplete}
                    variant="outline"
                    className="w-full border-green-500/50 text-green-400 hover:bg-green-500/10"
                  >
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Complete Recording
                  </Button>
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <p className="text-xs text-gray-400 text-center">
              Speak clearly about your symptoms. The AI will guide you through the recording process.
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

// ---------- Record Tab ----------
const RecordTab = ({ addSymptom }) => {
  const { toast } = useToast();

  // This state backs the visible form controls
  const [newSymptom, setNewSymptom] = useState({
    type: 'physical',   // physical | mental | emotional
    symptom: '',        // short name (e.g., "headache")
    description: '',    // details
    severity: 5,        // 1..10
    notes: ''           // extras
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
        variant: 'destructive',
        title: 'Voice recording not supported',
        description: "Your browser doesn't support this feature. Please use the AI Assistant instead."
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
      toast({ title: '🎤 Listening...', description: 'Speak your symptoms clearly.' });
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setNewSymptom((prev) => ({ ...prev, description: transcript }));
      toast({ title: '✅ Voice recorded!', description: 'Your symptoms have been captured.' });
    };

    recognition.onerror = (event) => {
      toast({
        variant: 'destructive',
        title: '❌ Recording failed',
        description: event.error === 'not-allowed' ? 'Microphone access denied.' : 'Please try again or use the AI Assistant.'
      });
    };

    recognition.onend = () => { setIsRecording(false); };
    recognition.start();
  };

  const handleAddSymptom = () => {
    if (!newSymptom.description.trim() && !newSymptom.symptom.trim()) {
      toast({
        variant: 'destructive',
        title: '⚠️ Missing information',
        description: 'Please provide at least a symptom name or a description.'
      });
      return;
    }

    addSymptom({
      ...newSymptom,
      id: Date.now(),
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleDateString()
    });

    setNewSymptom({
      type: 'physical',
      symptom: '',
      description: '',
      severity: 5,
      notes: ''
    });

    toast({ title: '✅ Symptom recorded!', description: 'Your health data has been saved.' });
  };

  // Map AI answers (schema-shaped) → visible form fields
  const mapFromAI = (a) => {
    // normalize type to our 3 values
    const normalizeType = (t) => {
      const v = String(t || '').toLowerCase();
      if (v.includes('phys')) return 'physical';
      if (v.includes('ment')) return 'mental';
      if (v.includes('emo')) return 'emotional';
      return v || 'physical';
    };

    const toNum = (v) => {
      if (typeof v === 'number') return Math.min(10, Math.max(1, v));
      const s = String(v || '');
      const m = s.match(/\b(10|[1-9])\b/);
      if (m) return Math.min(10, Math.max(1, Number(m[1])));
      const words = { one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10 };
      const lower = s.toLowerCase();
      for (const w in words) if (lower.includes(w)) return words[w];
      return 5;
    };

    setNewSymptom((prev) => ({
      ...prev,
      type: a?.symptom_type ? normalizeType(a.symptom_type) : prev.type,
      symptom: a?.symptom ?? prev.symptom,
      description:
        a?.description ||
        [a?.symptom, a?.additional_notes].filter(Boolean).join(' — ') ||
        prev.description,
      severity: a?.severity_level != null ? toNum(a.severity_level) : prev.severity,
      notes: a?.additional_notes ?? prev.notes
    }));
  };

  const handleSymptomExtracted = (a) => {
    mapFromAI(a);
    // do not toast on every live update; the VoiceAgent will toast on completion
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
              <p className="text-gray-300">Use voice, AI assistant, or text to describe your symptoms.</p>
            </div>

            {/* AI Assistant Banner */}
            <div className="bg-gradient-to-r from-violet-500/20 to-purple-500/20 border border-violet-500/30 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Bot className="w-8 h-8 text-violet-400" />
                <div>
                  <h3 className="text-lg font-semibold text-white">AI Health Assistant</h3>
                  <p className="text-gray-300 text-sm">Get guided symptom recording with real-time voice interaction</p>
                </div>
                <Button
                  onClick={() => setShowVoiceAgent(true)}
                  className="ml-auto bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600"
                >
                  Start Session
                </Button>
              </div>
            </div>

            {/* Symptom Type */}
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
                    onClick={() => setNewSymptom((prev) => ({ ...prev, type }))}
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

            {/* Symptom (short name) */}
            <div className="space-y-3">
              <Label className="text-white font-medium">Symptom (short name)</Label>
              <input
                type="text"
                value={newSymptom.symptom}
                onChange={(e) => setNewSymptom((prev) => ({ ...prev, symptom: e.target.value }))}
                placeholder="e.g., Headache, Nausea, Chest pain"
                className="w-full px-3 py-2 rounded-md bg-white/5 border border-white/20 text-white placeholder:text-gray-400 outline-none"
              />
            </div>

            {/* Description */}
            <div className="space-y-3">
              <Label className="text-white font-medium">Description</Label>
              <Textarea
                value={newSymptom.description}
                onChange={(e) =>
                  setNewSymptom((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Describe your symptoms in detail..."
                className="bg-white/5 border-white/20 text-white placeholder:text-gray-400 min-h-[100px]"
              />
            </div>

            {/* Severity */}
            <div className="space-y-3">
              <Label className="text-white font-medium">
                Severity Level:{' '}
                <span className={`font-bold ${getSeverityColor(newSymptom.severity)}`}>
                  {newSymptom.severity}/10
                </span>
              </Label>
              <input
                type="range"
                min="1"
                max="10"
                value={newSymptom.severity}
                onChange={(e) =>
                  setNewSymptom((prev) => ({ ...prev, severity: parseInt(e.target.value, 10) }))
                }
                className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-sm text-gray-400">
                <span>Mild</span>
                <span>Moderate</span>
                <span>Severe</span>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-3">
              <Label className="text-white font-medium">Additional Notes (Optional)</Label>
              <Textarea
                value={newSymptom.notes}
                onChange={(e) => setNewSymptom((prev) => ({ ...prev, notes: e.target.value }))}
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
