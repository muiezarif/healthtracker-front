import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Link2, CheckCircle2, MapPin, RefreshCw, Stethoscope, ArrowLeft, Clock } from "lucide-react";
import healthtrackerapi from "../lib/healthtrackerapi";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

/**
 * PatientProviders
 * ----------------------------------------------------------------------------
 * Lists providers and lets a patient request a link.
 * - "Already linked" if provider is in user.providers (or locally marked as linked)
 * - "Pending" if a pending link request exists (GET /patient/link-requests)
 * - "Request Link" posts a new request (POST /patient/link-requests)
 */
export default function PatientProviders() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, token } = useAuth();

  // Build a fast lookup set from the user’s linked provider IDs
  const userLinkedSet = useMemo(() => {
    const ids =
      (Array.isArray(user?.providers) && user.providers) ||
      (Array.isArray(user?.linkedProviders) && user.linkedProviders) ||
      [];
    return new Set(ids.map(String));
  }, [user]);

  // Local state to track providers list, pending requests, and in-flight actions
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  // If you re-enable the checkbox, this works as before
  const [acceptingOnly, setAcceptingOnly] = useState(false);

  // Providers with a pending request from this patient
  const [pendingSet, setPendingSet] = useState(new Set());
  // Providers locally considered linked because backend replied "already linked"
  const [linkedOverride, setLinkedOverride] = useState(new Set());
  // Track per-provider button busy state
  const [busySet, setBusySet] = useState(new Set());

  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token]
  );

  // Fetch providers
  const fetchProviders = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await healthtrackerapi.get("/patient/providers/", { headers: authHeaders });
      const data = res?.data?.providers || res?.data || {};
      setProviders(data?.result || data || []);
    } catch (ex) {
      console.error(ex);
      setError(ex?.response?.data?.error || ex.message || "Failed to load providers");
    } finally {
      setLoading(false);
    }
  };

  // Fetch my pending link requests, build a Set(providerId)
  const fetchPendingRequests = async () => {
    try {
      const res = await healthtrackerapi.get("/patient/link-requests", { headers: authHeaders });
      const list = res?.data?.result || res?.data || [];
      const ids = (Array.isArray(list) ? list : []).map((r) =>
        String(r?.provider?._id || r?.provider || "")
      );
      setPendingSet(new Set(ids.filter(Boolean)));
    } catch (ex) {
      // Non-fatal for page UX; you’ll still see providers
      console.warn("Failed to fetch pending link requests:", ex);
    }
  };

  useEffect(() => {
    // Load providers and pending requests in parallel
    fetchProviders();
    fetchPendingRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addBusy = (id) =>
    setBusySet((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  const removeBusy = (id) =>
    setBusySet((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  const addPending = (id) =>
    setPendingSet((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  const addLinkedOverride = (id) =>
    setLinkedOverride((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

  // Click handler: POST /patient/link-requests
  const handleLink = async (providerId) => {
    const id = String(providerId || "");
    if (!id) return;

    const isAlreadyLinked = userLinkedSet.has(id) || linkedOverride.has(id);
    const isPending = pendingSet.has(id);
    if (isAlreadyLinked) {
      toast({ title: "Already linked", description: "This provider is already linked to your account." });
      return;
    }
    if (isPending) {
      toast({ title: "Request already pending", description: "You’ve already sent a request to this provider." });
      return;
    }

    try {
      addBusy(id);
      const res = await healthtrackerapi.post(
        "/patient/link-requests",
        { providerId: id },
        { headers: { ...authHeaders, "Content-Type": "application/json" } }
      );

      const payload = res?.data || {};
      const result = payload?.result ?? payload;
      const alreadyLinked = !!(result?.alreadyLinked);

      if (alreadyLinked) {
        addLinkedOverride(id);
        toast({
          title: "Already linked",
          description: "You’re already connected with this provider.",
        });
      } else {
        addPending(id);
        toast({
          title: "Link request sent",
          description: "Your provider will review your request.",
        });
      }
    } catch (ex) {
      console.error(ex);
      const msg = ex?.response?.data?.error || ex?.response?.data?.message || ex.message || "Failed to send request";
      toast({ title: "Couldn’t send request", description: msg });
    } finally {
      removeBusy(id);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (providers || []).filter((p) => {
      if (acceptingOnly && p?.acceptingNewPatients === false) return false;
      if (!q) return true;
      const hay = [p?.name, p?.specialty, p?.location?.city, p?.location?.state]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [providers, search, acceptingOnly]);

  const ProviderCard = ({ p }) => {
    const id = String(p?._id || p?.id || "");
    const isLinked = id && (userLinkedSet.has(id) || linkedOverride.has(id));
    const isPending = id && pendingSet.has(id);
    const isBusy = id && busySet.has(id);

    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="h-full">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <Stethoscope className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-base">{p?.name || "Unnamed Provider"}</CardTitle>
                  <CardDescription className="text-sm">
                    {p?.specialty || "General Practice"}
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <MapPin className="w-4 h-4" />
              <span>
                {[p?.location?.city, p?.location?.state].filter(Boolean).join(", ") || "Location not provided"}
              </span>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <div className="text-xs">
                {p?.acceptingNewPatients === false ? (
                  <span className="px-2 py-1 rounded bg-slate-100 text-slate-700">
                    Not accepting new patients
                  </span>
                ) : (
                  <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-700">
                    Accepting new patients
                  </span>
                )}
              </div>

              <Button
                onClick={() => handleLink(id)}
                className="gap-2"
                disabled={
                  isLinked ||
                  isPending ||
                  p?.acceptingNewPatients === false ||
                  !id ||
                  isBusy
                }
                variant={isLinked || isPending ? "outline" : "default"}
              >
                {isLinked ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Already linked
                  </>
                ) : isPending ? (
                  <>
                    <Clock className="w-4 h-4" /> Pending
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4" /> Request Link
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Button variant="ghost" className="mb-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>

        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-slate-800">Find Your Provider</h1>
          <Button
            variant="outline"
            onClick={() => {
              fetchProviders();
              fetchPendingRequests();
            }}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <Label className="text-slate-700">Search by name, specialty, or city</Label>
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="e.g., cardiology, Dr. Khan, Karachi"
                />
              </div>
              {/* Re-enable if you want to filter by accepting status
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={acceptingOnly}
                    onChange={(e) => setAcceptingOnly(e.target.checked)}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  Only show providers accepting new patients
                </label>
              </div> */}
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="p-6 rounded-lg border bg-slate-50 text-slate-600">Loading providers…</div>
        ) : error ? (
          <div className="p-6 rounded-lg border bg-red-50 text-red-700">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 rounded-lg border bg-slate-50 text-slate-600">
            No providers match your search.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <ProviderCard key={String(p?._id || p?.id)} p={p} />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
