import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { getSymptomIcon, getSymptomColor, getSeverityColor } from '@/lib/symptomUtils.jsx';
import {
  Calendar,
  Clock,
  BarChart,
  MessageCircle,
  Clipboard,
  Check as CheckIcon,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// ---------------- helpers to summarize a conversation ----------------
const clamp1to10 = (n) => Math.min(10, Math.max(1, n));
const bandWordToNumber = (s) => {
  const t = String(s || '').toLowerCase();
  if (/\bworse\b|\bworst\b/.test(t)) return 10;
  if (/\bsevere\b/.test(t)) return 8;
  if (/\bmoderate\b/.test(t)) return 5;
  if (/\bmild\b/.test(t)) return 2;
  return null;
};
const wordsToSeverity = (val) => {
  if (typeof val === 'number' && !Number.isNaN(val)) return clamp1to10(val);
  const s = String(val || '').toLowerCase();
  const band = bandWordToNumber(s);
  if (band != null) return band;
  const frac = s.match(/\b(10|[1-9])\s*\/\s*10\b/);
  if (frac) return clamp1to10(Number(frac[1]));
  const outOf = s.match(/\b(10|[1-9])\s*(?:out\s*of|over)\s*10\b/);
  if (outOf) return clamp1to10(Number(outOf[1]));
  const digit = s.match(/\b(10|[1-9])\b/);
  if (digit) return clamp1to10(Number(digit[1]));
  const words = { one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10 };
  for (const w in words) if (new RegExp(`\\b${w}\\b`).test(s)) return clamp1to10(words[w]);
  return undefined;
};

const extractMessages = (messages = []) =>
  (messages || [])
    .filter(m => m && m.role && typeof m.text === 'string' && m.text.trim().length)
    .map(m => ({ role: m.role, text: m.text.trim() }));

const buildConversationSummary = (messages) => {
  const patientMsgs = messages.filter(m => m.role === 'patient').map(m => m.text);
  const assistantMsgs = messages.filter(m => m.role === 'assistant').map(m => m.text);

  const severities = patientMsgs.map(wordsToSeverity).filter(n => typeof n === 'number');
  const peak = severities.length ? Math.max(...severities) : null;
  const avg = severities.length ? +(severities.reduce((a,b)=>a+b,0) / severities.length).toFixed(2) : null;

  // last 3 distinct patient statements (first sentence)
  const seen = new Set();
  const keyPatient = [];
  for (let i = patientMsgs.length - 1; i >= 0 && keyPatient.length < 3; i--) {
    const firstSentence = patientMsgs[i].split(/(?<=[.!?])\s+/)[0].slice(0, 220);
    const key = firstSentence.toLowerCase();
    if (!seen.has(key) && firstSentence.length > 3) {
      seen.add(key);
      keyPatient.unshift(firstSentence);
    }
  }

  // notable phrases
  const notable = [];
  const re = /\b(since|because|trigger|worse|better|improved|flare|started|yesterday|today|week|month|year)\b/i;
  for (let i = patientMsgs.length - 1; i >= 0 && notable.length < 3; i--) {
    const txt = patientMsgs[i];
    if (re.test(txt)) {
      const sent = txt.split(/(?<=[.!?])\s+/).find((s) => re.test(s)) || txt;
      notable.unshift(sent.slice(0, 220));
    }
  }

  const overview =
    `Turn count: ${messages.length} (Patient ${patientMsgs.length} / Assistant ${assistantMsgs.length})` +
    (peak != null ? ` · Peak severity ${peak}/10` : '') +
    (avg != null ? ` · Avg severity ${avg}/10` : '');

  const plainText = [
    'Session Summary',
    overview,
    keyPatient.length ? '\nKey patient statements:\n- ' + keyPatient.join('\n- ') : '',
    severities.length ? '\nSeverity signals:\n- ' + [`Peak ${peak}/10`, `Average ${avg}/10`].filter(Boolean).join('\n- ') : '',
    notable.length ? '\nNotable mentions:\n- ' + notable.join('\n- ') : '',
  ].filter(Boolean).join('\n');

  return {
    overview,
    bullets: [
      ...(keyPatient.length ? [{ label: 'Key patient statements', items: keyPatient }] : []),
      ...(severities.length ? [{ label: 'Severity signals', items: [`Peak ${peak}/10`, `Average ${avg}/10`].filter(Boolean) }] : []),
      ...(notable.length ? [{ label: 'Notable mentions', items: notable }] : []),
    ],
    plainText,
  };
};

// ---------------- component ----------------
const chipCls = (active) =>
  `px-3 py-1 rounded-full text-xs border ${active ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'}`;

const HistoryTab = ({ symptoms = [], conversations = [] }) => {
  const { toast } = useToast();
  const { token } = useAuth();
  const [filter, setFilter] = useState('all'); // all | symptoms | conversations

  // modal state
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null); // the conversation object
  const [summary, setSummary] = useState(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [copied, setCopied] = useState(false);

  // Build unified timeline
  const items = useMemo(() => {
    const sItems = symptoms.map(s => ({
      kind: 'symptom',
      id: `sym-${s.id || s._id}`,
      ts: new Date(s.timestamp || s.createdAt),
      date: s.date,
      time: s.time,
      data: s,
    }));
    const cItems = conversations.map(c => ({
      kind: 'conversation',
      id: `con-${c.id || c._id}`,
      ts: new Date(c.timestamp || c.updatedAt || c.createdAt),
      date: c.date,
      time: c.time,
      data: c,
    }));
    const merged = [...sItems, ...cItems].filter(x => !isNaN(x.ts));
    merged.sort((a, b) => b.ts - a.ts); // newest first
    return merged;
  }, [symptoms, conversations]);

  const filtered = useMemo(() => {
    if (filter === 'symptoms') return items.filter(i => i.kind === 'symptom');
    if (filter === 'conversations') return items.filter(i => i.kind === 'conversation');
    return items;
  }, [items, filter]);

  const openConversation = (conv) => {
    const msgs = extractMessages(conv?.messages || []);
    const sum = buildConversationSummary(msgs);
    setSelected(conv);
    setSummary(sum);
    setShowTranscript(false);
    setCopied(false);
    setOpen(true);
  };

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(summary?.plainText || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Copy failed', description: e?.message || 'Could not copy summary.' });
    }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
        <Card className="bg-white/5 border-white/10 text-white backdrop-blur-lg">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="w-6 h-6 text-emerald-400" />
                History
              </CardTitle>
              <CardDescription className="text-gray-300">
                A unified timeline of your recorded symptoms and voice conversations.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2">
                <button className={chipCls(filter === 'all')} onClick={() => setFilter('all')}>All</button>
                <button className={chipCls(filter === 'symptoms')} onClick={() => setFilter('symptoms')}>Symptoms</button>
                <button className={chipCls(filter === 'conversations')} onClick={() => setFilter('conversations')}>Conversations</button>
              </div>
            </div>
            {/* Mobile chips */}
            <div className="sm:hidden flex items-center gap-2 -mt-1">
              <button className={chipCls(filter === 'all')} onClick={() => setFilter('all')}>All</button>
              <button className={chipCls(filter === 'symptoms')} onClick={() => setFilter('symptoms')}>Symptoms</button>
              <button className={chipCls(filter === 'conversations')} onClick={() => setFilter('conversations')}>Conversations</button>
            </div>
          </CardHeader>

          <CardContent>
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
              <AnimatePresence>
                {filtered.length > 0 ? (
                  filtered.map((item, index) => {
                    if (item.kind === 'symptom') {
                      const s = item.data;
                      const Icon = getSymptomIcon(s.type);
                      const color = getSymptomColor(s.type);
                      return (
                        <motion.div
                          key={item.id}
                          layout
                          initial={{ opacity: 0, y: 20, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          transition={{ duration: 0.25, delay: index * 0.03 }}
                          className="p-4 rounded-lg bg-white/10 flex items-start gap-4"
                        >
                          <div className={`p-2 rounded-full ${color}`}>
                            {Icon ? <Icon className="w-5 h-5 text-white" /> : null}
                          </div>
                          <div className="flex-grow">
                            <div className="flex justify-between items-center">
                              <p className="font-semibold">{s.description || s.symptom || 'Symptom'}</p>
                              <span className={`font-bold text-sm ${getSeverityColor(s.severity)}`}>
                                {s.severity}/10
                              </span>
                            </div>
                            <div className="text-xs text-gray-400 flex items-center gap-4 mt-1">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> {item.date}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {item.time}
                              </div>
                            </div>
                            {s.notes ? <p className="text-sm text-gray-300 mt-2 italic">"{s.notes}"</p> : null}
                          </div>
                        </motion.div>
                      );
                    }

                    // conversation item
                    const c = item.data;
                    return (
                      <motion.button
                        type="button"
                        onClick={() => openConversation(c)}
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 20, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.25, delay: index * 0.03 }}
                        className="w-full text-left p-4 rounded-lg bg-white/10 hover:bg-white/15 flex items-start gap-4 focus:outline-none"
                      >
                        <div className="p-2 rounded-full bg-blue-500/60">
                          <MessageCircle className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-grow">
                          <div className="flex justify-between items-center">
                            <p className="font-semibold">Voice Conversation</p>
                            <span className="text-xs text-gray-300">{c.messagesCount || (c.messages?.length ?? 0)} turns</span>
                          </div>
                          <div className="text-xs text-gray-400 flex items-center gap-4 mt-1">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> {item.date}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {item.time}
                            </div>
                          </div>

                          {/* quick preview: last patient + assistant lines if available */}
                          <div className="mt-2 space-y-1">
                            {c.lastPatient && (
                              <p className="text-sm text-gray-200 line-clamp-2">
                                <span className="text-blue-300 font-medium">Patient:</span> {c.lastPatient}
                              </p>
                            )}
                            {c.lastAssistant && (
                              <p className="text-sm text-gray-200 line-clamp-2">
                                <span className="text-emerald-300 font-medium">Assistant:</span> {c.lastAssistant}
                              </p>
                            )}
                          </div>
                        </div>
                      </motion.button>
                    );
                  })
                ) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10 text-gray-400">
                    <p>No history yet.</p>
                    <p className="text-sm">Use the Assistant or Record tabs to add entries.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* -------- Conversation Summary Modal -------- */}
      <AnimatePresence>
        {open && selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center"
            aria-modal="true"
            role="dialog"
          >
            {/* overlay */}
            <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />

            {/* panel */}
            <motion.div
              initial={{ y: 40, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 140, damping: 18 }}
              className="relative w-full sm:max-w-3xl mx-auto bg-slate-900/95 border border-white/10 rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 backdrop-blur"
            >
              {/* header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">Conversation Summary</h3>
                  <p className="text-xs text-gray-300 mt-0.5">
                    {new Date(selected.timestamp || selected.updatedAt || selected.createdAt).toLocaleString()}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* summary content */}
              {summary ? (
                <div className="mt-4">
                  <p className="text-sm text-slate-200 mb-3">{summary.overview}</p>

                  <div className="space-y-4">
                    {summary.bullets.map((group, idx) => (
                      <div key={idx}>
                        <p className="text-sm font-medium text-slate-300 mb-1">{group.label}</p>
                        <ul className="list-disc pl-6 text-slate-100 text-sm space-y-1">
                          {group.items.map((it, i) => (
                            <li key={i}>{it}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 mt-4">
                    <Button onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(summary.plainText);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      } catch (e) {
                        // graceful fallback
                      }
                    }} variant="outline" className="gap-2">
                      {copied ? <CheckIcon className="w-4 h-4" /> : <Clipboard className="w-4 h-4" />}
                      {copied ? 'Copied' : 'Copy Summary'}
                    </Button>

                    <Button
                      onClick={() => setShowTranscript(v => !v)}
                      className="bg-white/10 hover:bg-white/15 gap-1"
                      variant="ghost"
                    >
                      {showTranscript ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      {showTranscript ? 'Hide Transcript' : 'View Full Transcript'}
                    </Button>
                  </div>

                  {/* transcript */}
                  {showTranscript && (
                    <div className="mt-4 max-h-[45vh] overflow-y-auto pr-2">
                      <div className="space-y-3">
                        {(selected.messages || []).map((m, i) => (
                          <div key={i} className="p-3 rounded-lg bg-white/5">
                            <p className="text-xs font-semibold mb-1">
                              {m.role === 'assistant' ? <span className="text-emerald-300">Assistant</span> : <span className="text-blue-300">Patient</span>}
                            </p>
                            <p className="text-sm text-slate-100 whitespace-pre-wrap">{m.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-300 mt-4">No content available for this conversation.</p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default HistoryTab;
