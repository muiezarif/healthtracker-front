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
  Bug
} from 'lucide-react';
import healthtrackerapi from '../lib/healthtrackerapi';
import { useAuth } from '@/contexts/AuthContext';

/** ---------------- UI helpers ---------------- */
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

/** ---------------- NLP-ish helpers ---------------- */
const inferTypeFromText = (textRaw) => {
  const text = String(textRaw || '').toLowerCase();
  const physical = ['pain', 'ache', 'fever', 'cough', 'nausea', 'vomit', 'dizziness', 'rash', 'injury', 'cramp', 'chest', 'breath', 'breathing', 'headache', 'throat', 'stomach', 'diarrhea', 'fatigue', 'swelling', 'back', 'arm', 'leg', 'ear', 'nose', 'flu', 'cold'];
  const mental = ['focus', 'memory', 'concentrat', 'insomnia', 'sleep', 'adhd', 'brain fog', 'confus', 'hallucin', 'delusion', 'cognitive'];
  const emotional = ['anxiety', 'anxious', 'depress', 'sad', 'mood', 'anger', 'irritab', 'stress', 'panic', 'fear', 'lonely'];

  const hit = (arr) => arr.some(k => text.includes(k));
  if (hit(emotional)) return 'emotional';
  if (hit(mental)) return 'mental';
  if (hit(physical)) return 'physical';
  return 'physical'; // sensible default for UI
};

const bandWordToNumber = (s) => {
  const t = String(s || '').toLowerCase();
  if (/\bmild\b/.test(t)) return 2;      // 1–3
  if (/\bmoderate\b/.test(t)) return 5;  // 4–6
  if (/\bsevere\b/.test(t)) return 8;    // 7–8
  if (/\bworst\b/.test(t)) return 10;    // 9–10
  return null;
};

const clamp1to10 = (n) => Math.min(10, Math.max(1, n));

/**
 * Robust “words to severity”:
 * - digits: 10, 8, 7, “10/10”, “8 out of 10”
 * - words: one..ten
 * - band words: mild/moderate/severe/worst
 */
const wordsToSeverity = (val) => {
  if (typeof val === 'number' && !Number.isNaN(val)) return clamp1to10(val);
  const s = String(val || '').toLowerCase().trim();

  // quick band keywords
  const bandGuess = bandWordToNumber(s);
  if (bandGuess != null) return bandGuess;

  // explicit “x/10” first
  const frac = s.match(/\b(10|[1-9])\s*\/\s*10\b/);
  if (frac) return clamp1to10(Number(frac[1]));

  // “x out of 10”
  const outOf = s.match(/\b(10|[1-9])\s*(?:out\s+of|over)\s*10\b/);
  if (outOf) return clamp1to10(Number(outOf[1]));

  // standalone digit
  const digit = s.match(/\b(10|[1-9])\b/);
  if (digit) return clamp1to10(Number(digit[1]));

  // words
  const words = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
  for (const w in words) { if (new RegExp(`\\b${w}\\b`).test(s)) return clamp1to10(words[w]); }

  // nothing matched -> undefined (let caller decide whether to keep prior)
  return undefined;
};

/** ---------------- Voice Agent ---------------- */
const VoiceAgent = ({ isOpen, onClose, onSymptomExtracted }) => {
  const { user, token } = useAuth();
  const startedAtRef = useRef(null);

  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const [sessionComplete, setSessionComplete] = useState(false);
  const [error, setError] = useState('');
  const [events, setEvents] = useState([]);
  const [dataChannel, setDataChannel] = useState(null);

  // Debug panel state
  const [lastTranscript, setLastTranscript] = useState('');
  const [parsedSeverity, setParsedSeverity] = useState(null);
  const [lastStepIndex, setLastStepIndex] = useState(0);

  const peerConnection = useRef(null);
  const audioElement = useRef(null);
  const micStreamRef = useRef(null);
  const { toast } = useToast();

  // 0: symptom, 1: severity, 2: description, 3: additional_notes
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState({
    symptom_type: '',
    symptom: '',
    severity_level: 5,   // start with 5 for UI; we won't overwrite it unless we successfully parse severity
    description: '',
    additional_notes: ''
  });

  // Local rate-limit guard (cooldown) after 429
  const [rateLimitedUntil, setRateLimitedUntil] = useState(0);
  const RATE_LIMIT_COOLDOWN_MS = 15000;

const saveConversation = async ({ reason = "complete" } = {}) => {
  try {
    const filteredMessages = events
      .map(ev => {
        // Patient speech → transcript
        if (
          ev.type === "conversation.item.input_audio_transcription.completed" &&
          ev.transcript
        ) {
          return { role: "patient", text: ev.transcript.trim() };
        }

        // Assistant replies (structured message)
        if (
          ev.type === "conversation.item.created" &&
          ev.item?.role === "assistant" &&
          ev.item?.content?.[0]?.text
        ) {
          return { role: "assistant", text: ev.item.content[0].text.trim() };
        }

        // Assistant spoken output (audio transcript)
        if (
          ev.type === "response.audio_transcript.done" &&
          ev.transcript
        ) {
          return { role: "assistant", text: ev.transcript.trim() };
        }

        // Patient typed input (role "user")
        if (
          ev.type === "conversation.item.create" &&
          (ev.item?.role === "user" || ev.item?.role === "patient") &&
          ev.item?.content?.[0]?.text
        ) {
          return { role: "patient", text: ev.item.content[0].text.trim() };
        }

        return null;
      })
      .filter(Boolean);

    if (!filteredMessages.length) {
      console.warn("[Conversation] No text messages to save, skipping");
      return;
    }

    const payload = { messages: filteredMessages, reason };

    await healthtrackerapi.post("/conversations", payload, {
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (err) {
    console.error("[Conversation] save failed:", err);
  }
};


  useEffect(() => {
    console.warn('[VoiceAgent] If you see "A listener indicated an asynchronous response..." it is most likely a browser extension. Try Incognito.');
  }, []);

  useEffect(() => () => { stopSession(); }, []);

  const startSession = async () => {
    try {
      setIsConnecting(true);
      setError('');
      setIsSessionActive(false);

      setStepIndex(0);
      setAnswers({
        symptom_type: '',
        symptom: '',
        severity_level: 5,
        description: '',
        additional_notes: ''
      });
      setEvents([]);
      setRateLimitedUntil(0);
      setLastTranscript('');
      setParsedSeverity(null);
      setLastStepIndex(0);

      console.groupCollapsed('[VoiceAgent] startSession');
      console.log('Fetching ephemeral key...');
      const tokenResponse = await healthtrackerapi.get('/voice-agent/symptom-recorder/token');
      console.log('Token response status:', tokenResponse.status);

      if (tokenResponse.status !== 200) {
        throw new Error(`Token request failed: ${tokenResponse.status} - ${tokenResponse.statusText || 'Bad response'}`);
      }
      const data = tokenResponse.data;
      if (!data?.client_secret?.value) {
        console.error('Unexpected token payload:', data);
        throw new Error('Invalid token response structure');
      }
      const EPHEMERAL_KEY = data.client_secret.value;

      console.log('Creating RTCPeerConnection...');
      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      peerConnection.current = pc;

      // Receive audio from agent
      pc.addTransceiver('audio', { direction: 'sendrecv' });
      pc.ontrack = (e) => {
        console.log('[VoiceAgent] ontrack (assistant audio stream received)');
        if (audioElement.current) {
          audioElement.current.srcObject = e.streams[0];
          audioElement.current.muted = false;
          audioElement.current.playsInline = true;
          audioElement.current.play().catch(() => { });
        }
      };

      // Microphone
      console.log('Requesting user media (mic)...');
      const ms = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      micStreamRef.current = ms;
      const micTrack = ms.getTracks()[0];
      const sender = pc.addTrack(micTrack);

      // Opus DTX
      try {
        const params = sender.getParameters();
        if (!params.encodings) params.encodings = [{}];
        params.encodings = params.encodings.map(enc => ({ ...enc, dtx: true }));
        await sender.setParameters(params);
        console.log('Enabled Opus DTX on mic sender.');
      } catch (e) {
        console.warn('Could not enable Opus DTX:', e);
      }

      // Data channel
      const dc = pc.createDataChannel("oai-events");
      setDataChannel(dc);
      console.log('DataChannel created.');

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log('Local SDP created.');

      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = "gpt-4o-realtime-preview-2024-12-17";
      console.log('Posting SDP to Realtime API...');
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: { Authorization: `Bearer ${EPHEMERAL_KEY}`, "Content-Type": "application/sdp" },
      });

      if (!sdpResponse.ok) {
        const errorText = await sdpResponse.text();
        console.error('SDP exchange failed payload:', errorText);
        throw new Error(`SDP exchange failed: ${sdpResponse.status} - ${errorText}`);
      }

      const answer = { type: "answer", sdp: await sdpResponse.text() };
      await pc.setRemoteDescription(answer);
      startedAtRef.current = new Date().toISOString();
      console.log("[Conversation] startedAt =", startedAtRef.current);
      console.log('Remote SDP set. WebRTC session established.');
      console.groupEnd();

      toast({ title: "🤖 AI Assistant Connected", description: "Voice session started. You can now speak with the AI." });
    } catch (err) {
      console.groupEnd();
      console.error('Session start error:', err);
      setError(`Failed to start session: ${err.message}`);
      toast({ variant: "destructive", title: "Connection Failed", description: err.message });
    } finally {
      setIsConnecting(false);
    }
  };

  const stopSession = () => {
    console.groupCollapsed('[VoiceAgent] stopSession');
    if (dataChannel) { try { dataChannel.close(); } catch { } }
    if (peerConnection.current) {
      try {
        peerConnection.current.getSenders().forEach((sender) => { try { sender.track && sender.track.stop(); } catch { } });
        peerConnection.current.close();
      } catch { }
      peerConnection.current = null;
    }
    if (micStreamRef.current) {
      try { micStreamRef.current.getTracks().forEach(t => t.stop()); } catch { }
      micStreamRef.current = null;
    }
    setIsSessionActive(false);
    setDataChannel(null);
    console.groupEnd();
  };

  const sendClientEvent = (message) => {
    const now = Date.now();
    if (now < rateLimitedUntil) {
      const secs = Math.ceil((rateLimitedUntil - now) / 1000);
      console.warn(`[VoiceAgent] Rate limited. Waiting ${secs}s before sending events.`);
      return;
    }

    if (dataChannel && dataChannel.readyState === 'open') {
      const timestamp = new Date().toLocaleTimeString();
      message.event_id = message.event_id || crypto.randomUUID();
      console.log('[VoiceAgent -> OAI]', message);
      dataChannel.send(JSON.stringify(message));
      if (!message.timestamp) message.timestamp = timestamp;
      setEvents((prev) => [message, ...prev]);
    } else {
      console.error("[VoiceAgent] Failed to send message - data channel not ready", message);
    }
  };

  const sendTextMessage = (message) => {
    const event = {
      type: "conversation.item.create",
      item: { type: "message", role: "user", content: [{ type: "input_text", text: message }] },
    };
    sendClientEvent(event);
    sendClientEvent({ type: "response.create" });
  };

  // Data channel listeners
  useEffect(() => {
    if (!dataChannel) return;

    const onMessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (!event.timestamp) event.timestamp = new Date().toLocaleTimeString();

        // Log EVERYTHING in a readable group
        console.groupCollapsed(`[OAI -> VoiceAgent] ${event.type}`);
        console.log('raw event:', event);
        console.groupEnd();

        switch (event.type) {
          case 'conversation.item.created': {
            if (event.item && event.item.role === 'assistant' && event.item.content) {
              const content = event.item.content[0];
              if (content && content.text) {
                setCurrentMessage(content.text);
              }
            }
            break;
          }

          case 'conversation.item.input_audio_transcription.completed': {
            const saidRaw = event.transcript ?? '';
            const said = String(saidRaw).trim();
            setLastTranscript(said);
            setLastStepIndex(stepIndex);

            setAnswers(prev => {
              const next = { ...prev };

              if (stepIndex === 0) {
                next.symptom = said;
                const inferred = inferTypeFromText(said);
                next.symptom_type = inferred;
                console.log('[Parse] Step 0 symptom:', said, '→ type:', inferred);
              } else if (stepIndex === 1) {
                // Parse severity with robust helper
                // Only apply if we actually parsed a number/band
                const parsed = wordsToSeverity(said);
                setParsedSeverity(parsed ?? null);

                if (typeof parsed === 'number' && !Number.isNaN(parsed)) {
                  next.severity_level = parsed;
                  console.log('[Parse] Step 1 severity transcript:', said, '→ parsed:', parsed);
                } else {
                  console.warn('[Parse] Step 1 severity NOT parsed, keeping previous value:', prev.severity_level);
                }
              } else if (stepIndex === 2) {
                next.description = said;
                const inferred = inferTypeFromText(`${next.symptom} ${said}`);
                next.symptom_type = inferred || next.symptom_type;
                console.log('[Parse] Step 2 description set. Refined type:', next.symptom_type);
              } else if (stepIndex === 3) {
                next.additional_notes = said;
                console.log('[Parse] Step 3 notes set.');
              }

              // Tell parent immediately
              onSymptomExtracted(next);
              return next;
            });

            // Move to next step
            setStepIndex(i => {
              const ni = Math.min(i + 1, 3);
              console.log('[Flow] stepIndex:', i, '→', ni);
              return ni;
            });
            break;
          }

          case 'conversation.item.input_audio_transcription.failed': {
            const msg = event.error?.message || 'Audio transcription failed';
            console.error('[STT failed]', msg);
            setError(msg);

            if (/429/.test(msg)) {
              const until = Date.now() + RATE_LIMIT_COOLDOWN_MS;
              setRateLimitedUntil(until);
              toast({
                variant: 'destructive',
                title: 'Speech-to-text rate limited',
                description: `Too many requests. Pausing mic for ${Math.ceil(RATE_LIMIT_COOLDOWN_MS / 1000)}s…`
              });
            } else {
              toast({ variant: 'destructive', title: 'Transcription failed', description: msg });
            }
            break;
          }

          case 'response.done':
            // AI finished responding (useful hook if needed)
            break;

          case 'error':
            console.error('[Realtime error]', event.error);
            setError(event.error?.message || 'Realtime error');
            break;
        }

        setEvents((prev) => [event, ...prev]);
        // expose last events for quick inspection
        window.__voiceAgentEvents = (window.__voiceAgentEvents || []);
        window.__voiceAgentEvents.unshift(event);
      } catch (err) {
        console.error('Error parsing data channel message:', err);
      }
    };

    const onOpen = () => {
      console.log('[VoiceAgent] DataChannel open');
      setIsSessionActive(true);
      setEvents([]);
      setTimeout(() => {
        sendTextMessage("Hello, I'm ready to record my symptoms. Please help me get started.");
      }, 600);
    };

    const onClose = () => {
      console.log('[VoiceAgent] DataChannel closed');
      setIsSessionActive(false);
    };
    const onError = (err) => {
      console.error('[VoiceAgent] DataChannel error:', err);
      setError('Communication error occurred');
    };

    dataChannel.addEventListener("message", onMessage);
    dataChannel.addEventListener("open", onOpen);
    dataChannel.addEventListener("close", onClose);
    dataChannel.addEventListener("error", onError);

    return () => {
      dataChannel.removeEventListener("message", onMessage);
      dataChannel.removeEventListener("open", onOpen);
      dataChannel.removeEventListener("close", onClose);
      dataChannel.removeEventListener("error", onError);
    };
  }, [dataChannel, stepIndex, onSymptomExtracted, rateLimitedUntil, toast]);

  const handleSessionComplete = async () => {
    console.log('[VoiceAgent] Session marked complete. Final answers:', answers);
    setSessionComplete(true);
    onSymptomExtracted(answers);
    await saveConversation({ reason: "complete" });
    toast({ title: "✅ Session Complete!", description: "Your conversation has been saved." });
  };

  const handleClose = async () => {
    await saveConversation({ reason: "cancelled" }); // no-op if events is empty

    stopSession();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-white/20 p-6 max-w-lg w-full max-h-[85vh] overflow-hidden">
        <audio ref={audioElement} className="hidden" />

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full">
              <Bot className="w-6 h-6 text-white" />
            </div>
            {/* <div>
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
            </div> */}
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose} className="text-gray-400 hover:text-white">
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

            <Button onClick={handleClose}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600">
              Continue to Record Form
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
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

            {/* Recent (verbose) events list (trimmed to 3) */}
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

            {/* Small inline debug panel */}
            <div className="bg-black/20 rounded-lg p-3 border border-white/10">
              <div className="flex items-center gap-2 text-gray-300 text-xs">
                <Bug className="w-4 h-4" />
                <span className="font-semibold">Debug</span>
                <span className="ml-2">stepIndex: <span className="font-mono">{lastStepIndex}</span></span>
                <span className="ml-3">parsedSeverity: <span className="font-mono">{parsedSeverity ?? '—'}</span></span>
              </div>
              {!!lastTranscript && (
                <div className="mt-1 text-[11px] text-gray-400">
                  lastTranscript: <span className="font-mono">{lastTranscript}</span>
                </div>
              )}
            </div>

            {/* Status */}
            <div className="flex items-center justify-center gap-4">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${isSessionActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                }`}>
                {isSessionActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                {isSessionActive ? 'Voice Active' : 'Voice Inactive'}
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-3">
              {!isSessionActive ? (
                <Button onClick={startSession} disabled={isConnecting}
                  className="w-full p-4 text-lg font-semibold bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:opacity-50">
                  {isConnecting ? (<><Loader2 className="w-5 h-5 mr-2 animate-spin" />Connecting...</>) : (<><Phone className="w-5 h-5 mr-2" />Start Voice Session</>)}
                </Button>
              ) : (
                <div className="space-y-2">
                  <Button onClick={stopSession}
                    className="w-full p-4 text-lg font-semibold bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600">
                    <PhoneOff className="w-5 h-5 mr-2" />
                    End Session
                  </Button>

                  <Button onClick={handleSessionComplete} variant="outline"
                    className="w-full border-green-500/50 text-green-400 hover:bg-green-500/10">
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

/** ---------------- Record Tab (form) ---------------- */
const RecordTab = ({ addSymptom }) => {
  const { toast } = useToast();
  const [newSymptom, setNewSymptom] = useState({
    type: 'physical',
    symptom: '',
    description: '',
    severity: 5,
    notes: ''
  });
  const [isRecording, setIsRecording] = useState(false);
  const [showVoiceAgent, setShowVoiceAgent] = useState(false);

  // Band mapping helpers
  const bandFromNumber = (n) => (n <= 3 ? 'mild' : n <= 6 ? 'moderate' : n <= 8 ? 'severe' : 'worst');
  const repValueForBand = (band) => ({ mild: 2, moderate: 5, severe: 8, worst: 10 }[band] ?? 5);
  const severityBands = [
    { key: 'mild', label: 'Mild', range: '1–3' },
    { key: 'moderate', label: 'Moderate', range: '4–6' },
    { key: 'severe', label: 'Severe', range: '7–8' },
    { key: 'worst', label: 'Worst', range: '9–10' },
  ];

  const handleVoiceRecording = () => {
    if (isRecording) { setIsRecording(false); return; }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        variant: "destructive",
        title: "Voice recording not supported",
        description: "Your browser doesn't support this feature. Please use the AI Assistant instead."
      });
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false; recognition.interimResults = false; recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
      toast({ title: "🎤 Listening...", description: "Speak your symptoms clearly." });
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setNewSymptom(prev => ({ ...prev, description: transcript }));
      toast({ title: "✅ Voice recorded!", description: "Your symptoms have been captured." });
    };

    recognition.onerror = (event) => {
      toast({
        variant: "destructive",
        title: "❌ Recording failed",
        description: event.error === 'not-allowed' ? "Microphone access denied." : "Please try again or use the AI Assistant."
      });
    };

    recognition.onend = () => setIsRecording(false);
    recognition.start();
  };

  const handleAddSymptom = () => {
    if (!newSymptom.description.trim() && !newSymptom.symptom.trim()) {
      toast({ variant: "destructive", title: "⚠️ Missing information", description: "Please provide at least a symptom name or a description." });
      return;
    }

    addSymptom({
      ...newSymptom,
      id: Date.now(),
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleDateString()
    });

    setNewSymptom({ type: 'physical', symptom: '', description: '', severity: 5, notes: '' });
    toast({ title: "✅ Symptom recorded!", description: "Your health data has been saved." });
  };

  // Map AI answers → form fields (with safer severity update)
  const handleSymptomExtracted = (a) => {
    // try to parse severity only if present; otherwise keep current value
    const maybeParsedSeverity = a?.severity_level !== undefined ? wordsToSeverity(a.severity_level) : undefined;

    console.groupCollapsed('[RecordTab] handleSymptomExtracted');
    console.log('incoming:', a);
    console.log('parsed severity:', maybeParsedSeverity, '(from)', a?.severity_level);
    console.groupEnd();

    setNewSymptom(prev => ({
      ...prev,
      type: a?.symptom_type ? a.symptom_type : prev.type,
      symptom: a?.symptom ?? prev.symptom,
      description:
        a?.description ||
        [a?.symptom, a?.additional_notes].filter(Boolean).join(' — ') ||
        prev.description,
      severity: typeof maybeParsedSeverity === 'number' ? maybeParsedSeverity : prev.severity,
      notes: a?.additional_notes ?? prev.notes
    }));
  };

  return (
    <div className="relative">
      <motion.div key="record" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
        className="max-w-2xl mx-auto">
        <Card className="bg-white/5 backdrop-blur-lg border-white/20 p-6 sm:p-8">
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Record New Symptom</h2>
              <p className="text-gray-300">Use voice, AI assistant, or text to describe your symptoms.</p>
            </div>

            {/* AI Assistant Banner */}
            {/* <div className="bg-gradient-to-r from-violet-500/20 to-purple-500/20 border border-violet-500/30 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Bot className="w-8 h-8 text-violet-400" />
                <div>
                  <h3 className="text-lg font-semibold text-white">AI Health Assistant</h3>
                  <p className="text-gray-300 text-sm">Get guided symptom recording with real-time voice interaction</p>
                </div>
                <Button onClick={() => setShowVoiceAgent(true)}
                  className="ml-auto bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600">
                  Start Session
                </Button>
              </div>
            </div> */}

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
                    onClick={() => setNewSymptom(prev => ({ ...prev, type }))}
                    className={`p-4 h-auto flex-col gap-2 transition-all ${newSymptom.type === type
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
                onChange={(e) => setNewSymptom(prev => ({ ...prev, symptom: e.target.value }))}
                placeholder="e.g., Headache, Nausea, Chest pain"
                className="w-full px-3 py-2 rounded-md bg-white/5 border border-white/20 text-white placeholder:text-gray-400 outline-none"
              />
            </div>

            {/* Description */}
            <div className="space-y-3">
              <Label className="text-white font-medium">Description</Label>
              <Textarea
                value={newSymptom.description}
                onChange={(e) => setNewSymptom(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your symptoms in detail..."
                className="bg-white/5 border-white/20 text-white placeholder:text-gray-400 min-h-[100px]"
              />
            </div>

            {/* Severity (banded chips) */}
            <div className="space-y-3">
              <Label className="text-white font-medium">
                Severity:
                <span className={`ml-2 font-bold ${getSeverityColor(newSymptom.severity)}`}>
                  {newSymptom.severity}/10
                </span>
              </Label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {severityBands.map(({ key, label, range }) => {
                  const active = bandFromNumber(newSymptom.severity) === key;
                  return (
                    <Button
                      key={key}
                      type="button"
                      variant={active ? 'default' : 'outline'}
                      onClick={() =>
                        setNewSymptom((prev) => ({ ...prev, severity: repValueForBand(key) }))
                      }
                      className={
                        active
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow'
                          : 'bg-white/5 border-white/20 text-gray-300 hover:bg-white/10'
                      }
                    >
                      <div className="flex flex-col items-center">
                        <span className="text-sm font-semibold">{label}</span>
                        <span className="text-[11px] text-gray-300">{range}</span>
                      </div>
                    </Button>
                  );
                })}
              </div>

              <p className="text-xs text-gray-400">
                Tip: say “it’s moderate” or “ten out of ten” — the assistant will set it automatically.
              </p>
            </div>

            {/* Notes */}
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
