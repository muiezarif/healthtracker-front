import React, { useEffect, useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  providerGetLinkRequests,
  providerAcceptLinkRequest,
  providerRejectLinkRequest,
} from "@/lib/api";
import {
  RefreshCw,
  UserCircle,
  Mail,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";

const Row = ({ req, onAccept, onReject, busy }) => {
  const created = useMemo(() => new Date(req.createdAt), [req.createdAt]);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="border rounded-xl p-4 bg-white flex items-center justify-between gap-4"
    >
      <div className="flex items-start gap-4">
        <div className="p-2 bg-slate-100 rounded-lg">
          <UserCircle className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <div className="font-medium text-slate-800">
            {req?.patient?.fullName || "Unnamed Patient"}
          </div>
          <div className="text-sm text-slate-600 flex items-center gap-2">
            <Mail className="w-4 h-4" />
            <span>{req?.patient?.email || "—"}</span>
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
            <Clock className="w-3.5 h-3.5" />
            <span>
              Requested on{" "}
              {created.toLocaleDateString()} at{" "}
              {created.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          {req?.message ? (
            <div className="text-sm text-slate-700 mt-2">
              “{req.message}”
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={() => onAccept(req._id)}
          className="gap-2"
          disabled={busy === req._id}
        >
          <CheckCircle2 className="w-4 h-4" /> Accept
        </Button>
        <Button
          onClick={() => onReject(req._id)}
          className="gap-2"
          variant="outline"
          disabled={busy === req._id}
        >
          <XCircle className="w-4 h-4" /> Reject
        </Button>
      </div>
    </motion.div>
  );
};

export default function ManageLinkRequestsTab() {
  const { token } = useAuth();
  const { toast } = useToast();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await providerGetLinkRequests(token);
      const list = data?.result ?? data ?? [];
      // latest first
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setRequests(list);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Could not load requests",
        description: err?.message || "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const removeFromList = (id) => {
    setRequests((prev) => prev.filter((r) => r._id !== id));
  };

  const onAccept = async (id) => {
    try {
      setBusy(id);
      await providerAcceptLinkRequest(token, id);
      removeFromList(id);
      toast({ title: "Request accepted", description: "Patient has been linked." });
    } catch (err) {
      // If already processed elsewhere, drop it locally
      removeFromList(id);
      toast({
        variant: "destructive",
        title: "Could not accept",
        description: err?.message || "Please refresh and try again.",
      });
    } finally {
      setBusy("");
    }
  };

  const onReject = async (id) => {
    try {
      setBusy(id);
      await providerRejectLinkRequest(token, id);
      removeFromList(id);
      toast({ title: "Request rejected", description: "The request has been removed." });
    } catch (err) {
      removeFromList(id);
      toast({
        variant: "destructive",
        title: "Could not reject",
        description: err?.message || "Please refresh and try again.",
      });
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Link Requests</CardTitle>
            <CardDescription>Review, accept, or reject requests from patients.</CardDescription>
          </div>
          <Button variant="outline" className="gap-2" onClick={load} disabled={loading}>
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="p-6 rounded-lg border bg-slate-50 text-slate-600">
              Loading requests…
            </div>
          ) : requests.length === 0 ? (
            <div className="p-6 rounded-lg border bg-slate-50 text-slate-600">
              No pending link requests.
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((r) => (
                <Row key={r._id} req={r} onAccept={onAccept} onReject={onReject} busy={busy} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
