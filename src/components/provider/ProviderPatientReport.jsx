import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import healthtrackerapi from "@/lib/healthtrackerapi";
import { Bot, Mic, MicOff, Phone, PhoneOff, CheckCircle, Loader2, X } from "lucide-react";

export default function ProviderPatientReport({ patientId, onClose }) {
  const { token } = useAuth();
  const { toast } = useToast();

  const [isConnecting, setIsConnecting] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [error, setError] = useState("");
  const [currentMessage, setCurrentMessage] = useState("");

  const peerConnection = useRef(null);
  const audioElement = useRef(null);
  const micStreamRef = useRef(null);
  const [dataChannel, setDataChannel] = useState(null);

  // animated orb
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(null);
  const [level, setLevel] = useState(0);
  const [talking, setTalking] = useState(false);

  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const cleanupAnalyser = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    try { audioCtxRef.current?.close(); } catch {}
    audioCtxRef.current = null;
    analyserRef.current = null;
    setLevel(0);
    setTalking(false);
  };

  const stopSession = async () => {
    try { dataChannel?.close(); } catch {}
    setDataChannel(null);
    if (peerConnection.current) {
      try {
        peerConnection.current.getSenders().forEach(s => { try { s.track && s.track.stop(); } catch {} });
        peerConnection.current.close();
      } catch {}
      peerConnection.current = null;
    }
    if (micStreamRef.current) {
      try { micStreamRef.current.getTracks().forEach(t => t.stop()); } catch {}
      micStreamRef.current = null;
    }
    cleanupAnalyser();
    setIsSessionActive(false);
    setSessionComplete(true);
  };

  // IMPORTANT: accept a channel param; fall back to state
  const primeContext = async (channel) => {
    const ch = channel || dataChannel;
    if (!ch || ch.readyState !== "open") return;

    // 1) fetch patient data window (default 7 days)
    const reportRes = await healthtrackerapi.get(`/voice-agent/provider-report/patient-data`, {
      params: { patientId, windowDays: 7 },
      headers: authHeaders,
    });
    const report = reportRes?.data || {};

    // 2) send as first message so the model answers strictly from context
    const text = `PATIENT_CONTEXT\n${JSON.stringify(report)}`;
    const msg = {
      type: "conversation.item.create",
      item: { type: "message", role: "user", content: [{ type: "input_text", text }] },
    };
    ch.send(JSON.stringify(msg));
    ch.send(JSON.stringify({ type: "response.create" }));
  };

  const startSession = async () => {
    if (!patientId) {
      setError("Missing patientId");
      return;
    }
    try {
      setIsConnecting(true);
      setError("");
      setSessionComplete(false);
      setCurrentMessage("");

      // Ephemeral key for provider-report assistant
      const tokenRes = await healthtrackerapi.get(`/voice-agent/provider-report/token`, { headers: authHeaders });
      const EPHEMERAL_KEY = tokenRes?.data?.client_secret?.value;
      if (!EPHEMERAL_KEY) throw new Error("Token generation failed");

      const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
      peerConnection.current = pc;

      // remote audio -> element + analyser
      pc.addTransceiver("audio", { direction: "sendrecv" });
      pc.ontrack = (e) => {
        if (audioElement.current) {
          audioElement.current.srcObject = e.streams[0];
          audioElement.current.muted = false;
          audioElement.current.playsInline = true;
          audioElement.current.play().catch(() => {});
        }
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
            let sum = 0;
            for (let i = 0; i < buf.length; i++) {
              const v = (buf[i] - 128) / 128;
              sum += v * v;
            }
            const rms = Math.sqrt(sum / buf.length);
            smooth = smooth * 0.8 + rms * 0.2;
            const norm = Math.min(1, Math.max(0, smooth * 3));
            setLevel(norm);
            setTalking(norm > 0.06);
            rafRef.current = requestAnimationFrame(tick);
          };
          rafRef.current = requestAnimationFrame(tick);
        } catch {}
      };

      // mic
      const ms = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      micStreamRef.current = ms;
      pc.addTrack(ms.getTracks()[0]);

      // data channel
      const dc = pc.createDataChannel("oai-events");
      setDataChannel(dc);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpResponse = await fetch(`https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17`, {
        method: "POST",
        body: offer.sdp,
        headers: { Authorization: `Bearer ${EPHEMERAL_KEY}`, "Content-Type": "application/sdp" },
      });
      if (!sdpResponse.ok) throw new Error(`SDP exchange failed: ${sdpResponse.status}`);
      const answer = { type: "answer", sdp: await sdpResponse.text() };
      await pc.setRemoteDescription(answer);

      // DC events — use the *local* dc reference to avoid state race
      dc.addEventListener("open", async () => {
        setIsSessionActive(true);
        try { await primeContext(dc); } catch (e) { console.error("Prime failed", e); }
      });
      dc.addEventListener("close", () => { setIsSessionActive(false); cleanupAnalyser(); });
      dc.addEventListener("error", (e) => { setError(e?.message || "Data channel error"); });
      dc.addEventListener("message", (e) => {
        try {
          const ev = JSON.parse(e.data);
          if (ev?.type === "conversation.item.created" && ev?.item?.role === "assistant") {
            const t = ev.item?.content?.[0]?.text;
            if (t) setCurrentMessage(t);
          }
        } catch {}
      });

      toast({ title: "Report agent connected", description: "Ask questions about this patient’s recent symptoms." });
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to start report session");
    } finally {
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    // Auto-start on mount
    startSession();
    return () => { stopSession(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card className="bg-white/5 border-white/20 p-5 sm:p-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Patient Report (Voice)</h3>
            <p className="text-xs text-gray-300">Grounded on saved symptoms & conversations (last 7 days).</p>
          </div>
        </div>
        <Button variant="ghost" onClick={onClose} className="gap-2">
          <X className="w-4 h-4" /> Close
        </Button>
      </div>

      <audio ref={audioElement} className="hidden" />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${isSessionActive ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}`}>
          {isSessionActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          {isSessionActive ? "Voice Active" : isConnecting ? "Connecting…" : "Idle"}
        </div>
        {sessionComplete && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-sm">
            <CheckCircle className="w-4 h-4" /> Session Ended
          </div>
        )}
      </div>

      {/* animated orb */}
      <div className="flex items-center justify-center my-6">
        <motion.div
          className="relative h-36 w-36 rounded-full"
          animate={{
            scale: 1 + level * 0.3,
            boxShadow: `0 0 ${10 + level * 30}px rgba(34,211,238,0.45), 0 0 ${6 + level * 20}px rgba(16,185,129,0.35)`,
          }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
        >
          <motion.div
            className="absolute inset-0 rounded-full bg-[conic-gradient(at_50%_50%,#06b6d4,#22c55e,#06b6d4)] blur-[1px]"
            animate={{ rotate: isSessionActive ? 360 : 0 }}
            transition={{ repeat: isSessionActive ? Infinity : 0, duration: talking ? 2 : 8, ease: "linear" }}
          />
          <div className="absolute inset-[6px] rounded-full bg-gradient-to-br from-slate-900/50 to-slate-800/40 backdrop-blur-sm border border-white/10" />
          <motion.div
            className="absolute -inset-2 rounded-full bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.25),transparent_60%)]"
            animate={{ opacity: talking ? 1 : 0.35, scale: talking ? 1.15 : 1 }}
            transition={{ type: "spring", stiffness: 100, damping: 15 }}
          />
        </motion.div>
      </div>

      {currentMessage && (
        <div className="bg-black/20 rounded-lg p-4 mb-4">
          <div className="text-xs text-cyan-300 font-semibold mb-1">Assistant:</div>
          <p className="text-gray-100 text-sm">{currentMessage}</p>
        </div>
      )}

      {isSessionActive ? (
        <Button onClick={stopSession} className="w-full p-4 text-lg font-semibold bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600">
          <PhoneOff className="w-5 h-5 mr-2" />
          End Session
        </Button>
      ) : (
        <Button onClick={startSession} disabled={isConnecting} className="w-full p-4 text-lg font-semibold bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 disabled:opacity-50">
          {isConnecting ? (<><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Connecting…</>) : (<><Phone className="w-5 h-5 mr-2" /> Start Voice Session</>)}
        </Button>
      )}

      {error && (
        <div className="mt-3 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
    </Card>
  );
}
