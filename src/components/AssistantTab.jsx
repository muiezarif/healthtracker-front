import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import healthtrackerapi from "@/lib/healthtrackerapi";
import {
  Bot,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  CheckCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";

/** -------- helpers (unchanged from RecordTab VoiceAgent) -------- */
const bandWordToNumber = (s) => {
  const t = String(s || "").toLowerCase();
  if (/\bmild\b/.test(t)) return 2;
  if (/\bmoderate\b/.test(t)) return 5;
  if (/\bsevere\b/.test(t)) return 8;
  if (/\bworst\b/.test(t)) return 10;
  return null;
};
const clamp1to10 = (n) => Math.min(10, Math.max(1, n));
const wordsToSeverity = (val) => {
  if (typeof val === "number" && !Number.isNaN(val)) return clamp1to10(val);
  const s = String(val || "").toLowerCase().trim();
  const bandGuess = bandWordToNumber(s);
  if (bandGuess != null) return bandGuess;
  const frac = s.match(/\b(10|[1-9])\s*\/\s*10\b/);
  if (frac) return clamp1to10(Number(frac[1]));
  const outOf = s.match(/\b(10|[1-9])\s*(?:out\s+of|over)\s*10\b/);
  if (outOf) return clamp1to10(Number(outOf[1]));
  const digit = s.match(/\b(10|[1-9])\b/);
  if (digit) return clamp1to10(Number(digit[1]));
  const words = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
  for (const w in words) { if (new RegExp(`\\b${w}\\b`).test(s)) return clamp1to10(words[w]); }
  return undefined;
};

/** -------- Voice Assistant panel -------- */
export default function AssistantTab() {
  const { token } = useAuth();
  const { toast } = useToast();

  // session/RTC
  const peerConnection = useRef(null);
  const audioElement = useRef(null);
  const micStreamRef = useRef(null);
  const [dataChannel, setDataChannel] = useState(null);

  // audio visualization (assistant speaking)
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(null);
  const [level, setLevel] = useState(0); // 0..1 normalized
  const [isAssistantTalking, setIsAssistantTalking] = useState(false);

  // ui + state
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [currentMessage, setCurrentMessage] = useState("");
  const [sessionComplete, setSessionComplete] = useState(false);
  const [error, setError] = useState("");

  // conversation events (used for saving)
  const [events, setEvents] = useState([]);
  const [rateLimitedUntil, setRateLimitedUntil] = useState(0);
  const RATE_LIMIT_COOLDOWN_MS = 15000;

  // light parsing (kept for parity with RecordTab)
  const [lastTranscript, setLastTranscript] = useState("");
  const [parsedSeverity, setParsedSeverity] = useState(null);

  // save guard to avoid double-saves on multiple end triggers
  const hasSavedRef = useRef(false);

  useEffect(() => {
    console.warn("[VoiceAgent] If a browser extension intercepts requests, try Incognito.");
  }, []);

  /** ---------- conversation save ---------- */
  const saveConversation = async ({ reason = "complete" } = {}) => {
    try {
      const filteredMessages = events
        .map(ev => {
          if (ev.type === "conversation.item.input_audio_transcription.completed" && ev.transcript) {
            return { role: "patient", text: ev.transcript.trim() };
          }
          if (ev.type === "conversation.item.created" && ev.item?.role === "assistant" && ev.item?.content?.[0]?.text) {
            return { role: "assistant", text: ev.item.content[0].text.trim() };
          }
          if (ev.type === "response.audio_transcript.done" && ev.transcript) {
            return { role: "assistant", text: ev.transcript.trim() };
          }
          if (ev.type === "conversation.item.create" && (ev.item?.role === "user" || ev.item?.role === "patient") && ev.item?.content?.[0]?.text) {
            return { role: "patient", text: ev.item.content[0].text.trim() };
          }
          return null;
        })
        .filter(Boolean);

      if (!filteredMessages.length) return;

      const payload = { messages: filteredMessages, reason };
      await healthtrackerapi.post("/conversations", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error("[Conversation] save failed:", err);
    }
  };

  const autoSaveOnEnd = async (reason = "auto-end") => {
    if (hasSavedRef.current) return;
    hasSavedRef.current = true;
    await saveConversation({ reason });
    setSessionComplete(true);
    toast({ title: "✅ Session saved", description: "Your conversation has been saved." });
  };

  /** ---------- teardown / cleanup ---------- */
  const cleanupAudioAnalyser = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    try {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    } catch {}
    audioCtxRef.current = null;
    analyserRef.current = null;
    setLevel(0);
    setIsAssistantTalking(false);
  };

  const stopSession = async () => {
    // stop data channel first (triggers onClose; guard will prevent double save)
    try { dataChannel?.close(); } catch {}
    setDataChannel(null);

    if (peerConnection.current) {
      try {
        peerConnection.current.getSenders().forEach((s) => { try { s.track && s.track.stop(); } catch {} });
        peerConnection.current.close();
      } catch {}
      peerConnection.current = null;
    }
    if (micStreamRef.current) {
      try { micStreamRef.current.getTracks().forEach(t => t.stop()); } catch {}
      micStreamRef.current = null;
    }
    cleanupAudioAnalyser();
    setIsSessionActive(false);

    // auto-save on end
    await autoSaveOnEnd("ended-by-user");
  };

  /** ---------- start session ---------- */
  const startSession = async () => {
    try {
      setIsConnecting(true);
      setError("");
      setIsSessionActive(false);
      setSessionComplete(false);
      setEvents([]);
      setRateLimitedUntil(0);
      setLastTranscript("");
      setParsedSeverity(null);
      hasSavedRef.current = false;

      // 1) ephemeral key from your backend
      const tokenResponse = await healthtrackerapi.get("/voice-agent/symptom-recorder/token");
      if (tokenResponse.status !== 200 || !tokenResponse?.data?.client_secret?.value) {
        throw new Error("Invalid token response");
      }
      const EPHEMERAL_KEY = tokenResponse.data.client_secret.value;

      // 2) WebRTC setup
      const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
      peerConnection.current = pc;

      // receive assistant audio
      pc.addTransceiver("audio", { direction: "sendrecv" });
      pc.ontrack = (e) => {
        // hook element
        if (audioElement.current) {
          audioElement.current.srcObject = e.streams[0];
          audioElement.current.muted = false;
          audioElement.current.playsInline = true;
          audioElement.current.play().catch(() => {});
        }
        // setup analyser on remote stream
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          audioCtxRef.current = ctx;
          const src = ctx.createMediaStreamSource(e.streams[0]);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 2048;
          analyserRef.current = analyser;
          src.connect(analyser);

          const buf = new Uint8Array(analyser.fftSize);
          let smooth = 0;

          const tick = () => {
            analyser.getByteTimeDomainData(buf);
            // compute normalized amplitude around 128
            let sum = 0;
            for (let i = 0; i < buf.length; i++) {
              const v = (buf[i] - 128) / 128; // -1..1
              sum += v * v;
            }
            const rms = Math.sqrt(sum / buf.length); // 0..~1
            // smooth a bit for nicer animation
            smooth = smooth * 0.8 + rms * 0.2;
            const norm = Math.min(1, Math.max(0, smooth * 3)); // amplify
            setLevel(norm);
            setIsAssistantTalking(norm > 0.06); // threshold for "talking"
            rafRef.current = requestAnimationFrame(tick);
          };
          rafRef.current = requestAnimationFrame(tick);
        } catch (err) {
          console.warn("Analyser setup failed:", err);
        }
      };

      // mic
      const ms = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      micStreamRef.current = ms;
      const micTrack = ms.getTracks()[0];
      const sender = pc.addTrack(micTrack);
      try {
        const params = sender.getParameters();
        if (!params.encodings) params.encodings = [{}];
        params.encodings = params.encodings.map((enc) => ({ ...enc, dtx: true }));
        await sender.setParameters(params);
      } catch {}

      // data channel
      const dc = pc.createDataChannel("oai-events");
      setDataChannel(dc);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // 3) exchange SDP with OpenAI Realtime
      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = "gpt-4o-realtime-preview-2024-12-17";
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: { Authorization: `Bearer ${EPHEMERAL_KEY}`, "Content-Type": "application/sdp" },
      });
      if (!sdpResponse.ok) {
        const errText = await sdpResponse.text();
        throw new Error(`SDP exchange failed: ${sdpResponse.status} - ${errText}`);
      }
      const answer = { type: "answer", sdp: await sdpResponse.text() };
      await pc.setRemoteDescription(answer);

      toast({ title: "🤖 AI Assistant Connected", description: "Voice session started. You can now speak with the AI." });
    } catch (err) {
      console.error("Session start error:", err);
      setError(`Failed to start session: ${err.message}`);
      toast({ variant: "destructive", title: "Connection Failed", description: err.message });
    } finally {
      setIsConnecting(false);
    }
  };

  /** ---------- client events ---------- */
  const sendClientEvent = (message) => {
    const now = Date.now();
    if (now < rateLimitedUntil) return;
    if (dataChannel && dataChannel.readyState === "open") {
      const timestamp = new Date().toLocaleTimeString();
      message.event_id = message.event_id || crypto.randomUUID();
      dataChannel.send(JSON.stringify(message));
      if (!message.timestamp) message.timestamp = timestamp;
      setEvents((prev) => [message, ...prev]);
    }
  };
  const sendTextMessage = (text) => {
    sendClientEvent({
      type: "conversation.item.create",
      item: { type: "message", role: "user", content: [{ type: "input_text", text }] },
    });
    sendClientEvent({ type: "response.create" });
  };

  /** ---------- data channel listeners ---------- */
  useEffect(() => {
    if (!dataChannel) return;

    const onMessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (!event.timestamp) event.timestamp = new Date().toLocaleTimeString();

        switch (event.type) {
          case "conversation.item.created": {
            if (event.item?.role === "assistant" && event.item?.content?.[0]?.text) {
              setCurrentMessage(event.item.content[0].text);
            }
            break;
          }
          case "conversation.item.input_audio_transcription.completed": {
            const said = String(event.transcript ?? "").trim();
            setLastTranscript(said);
            const maybe = wordsToSeverity(said);
            setParsedSeverity(maybe ?? null);
            break;
          }
          case "conversation.item.input_audio_transcription.failed": {
            const msg = event.error?.message || "Audio transcription failed";
            setError(msg);
            if (/429/.test(msg)) {
              const until = Date.now() + RATE_LIMIT_COOLDOWN_MS;
              setRateLimitedUntil(until);
              toast({
                variant: "destructive",
                title: "Speech-to-text rate limited",
                description: `Pausing mic for ${Math.ceil(RATE_LIMIT_COOLDOWN_MS / 1000)}s…`,
              });
            } else {
              toast({ variant: "destructive", title: "Transcription failed", description: msg });
            }
            break;
          }
          case "response.done":
            break;
          case "error":
            setError(event.error?.message || "Realtime error");
            break;
        }

        setEvents((prev) => [event, ...prev]);
        window.__voiceAgentEvents = (window.__voiceAgentEvents || []);
        window.__voiceAgentEvents.unshift(event);
      } catch (err) {
        console.error("Error parsing data channel message:", err);
      }
    };

    const onOpen = () => {
      setIsSessionActive(true);
      setEvents([]);
      setTimeout(() => {
        sendTextMessage("Hello, I'm ready to talk. Please help me get started.");
      }, 600);
    };

    const onClose = async () => {
      setIsSessionActive(false);
      cleanupAudioAnalyser();
      await autoSaveOnEnd("channel-closed");
    };
    const onError = (err) => setError(err?.message || "Communication error occurred");

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
  }, [dataChannel, toast]);

  const resetPanel = () => {
    setSessionComplete(false);
    setError("");
    setEvents([]);
    setCurrentMessage("");
    setLastTranscript("");
    setParsedSeverity(null);
    cleanupAudioAnalyser();
  };

  /** ---------- UI ---------- */
  return (
    <div className="max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">Assistant</h2>
            <p className="text-sm text-gray-300">
              Talk to the AI and we’ll save your conversation automatically when you end the session.
            </p>
          </div>
        </div>
        <Button variant="bg-black outline" className="gap-2" onClick={resetPanel}>
          <RefreshCw className="w-4 h-4" /> Reset
        </Button>
      </motion.div>

      <Card className="bg-white/5 border-white/20 p-5 sm:p-6">
        <audio ref={audioElement} className="hidden" />

        {/* status */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${isSessionActive ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}`}>
            {isSessionActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            {isSessionActive ? "Voice Active" : isConnecting ? "Connecting…" : "Idle"}
          </div>
          {sessionComplete && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-sm">
              <CheckCircle className="w-4 h-4" /> Saved
            </div>
          )}
        </div>

        {/* animated assistant orb */}
        <div className="flex items-center justify-center my-6">
          <motion.div
            className="relative h-40 w-40 rounded-full"
            animate={{
              scale: 1 + level * 0.3,
              boxShadow: `0 0 ${12 + level * 36}px rgba(99,102,241,0.45), 0 0 ${8 + level * 28}px rgba(16,185,129,0.35)`,
            }}
            transition={{ type: "spring", stiffness: 120, damping: 18 }}
          >
            {/* gradient shell */}
            <motion.div
              className="absolute inset-0 rounded-full bg-[conic-gradient(at_50%_50%,#6366f1,#22d3ee,#10b981,#6366f1)] blur-[1px]"
              animate={{ rotate: isSessionActive ? 360 : 0 }}
              transition={{ repeat: isSessionActive ? Infinity : 0, duration: isAssistantTalking ? 2 : 8, ease: "linear" }}
            />
            {/* soft inner core */}
            <div className="absolute inset-[6px] rounded-full bg-gradient-to-br from-slate-900/50 to-slate-800/40 backdrop-blur-sm border border-white/10" />
            {/* pulse ring */}
            <motion.div
              className="absolute -inset-2 rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.25),transparent_60%)]"
              animate={{ opacity: isAssistantTalking ? 1 : 0.35, scale: isAssistantTalking ? 1.15 : 1 }}
              transition={{ type: "spring", stiffness: 100, damping: 15 }}
            />
          </motion.div>
        </div>

        {/* assistant bubble */}
        {currentMessage && (
          <div className="bg-black/20 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full mt-2 bg-blue-400 animate-pulse" />
              <div>
                <p className="text-sm font-medium text-blue-400 mb-1">AI Assistant:</p>
                <p className="text-gray-100 text-sm">{currentMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* controls */}
        {!isSessionActive ? (
          <Button
            onClick={startSession}
            disabled={isConnecting}
            className="w-full p-4 text-lg font-semibold bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:opacity-50"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Connecting…
              </>
            ) : (
              <>
                <Phone className="w-5 h-5 mr-2" />
                Start Voice Session
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={stopSession}
            className="w-full p-4 text-lg font-semibold bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600"
          >
            <PhoneOff className="w-5 h-5 mr-2" />
            End Session (auto-save)
          </Button>
        )}

        {error && (
          <div className="mt-3 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
      </Card>
    </div>
  );
}
