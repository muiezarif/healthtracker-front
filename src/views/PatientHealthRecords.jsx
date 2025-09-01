import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
// import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { ChevronDown, ChevronUp, Save, ArrowLeft } from "lucide-react";
import healthtrackerapi from "../lib/healthtrackerapi";
import { useAuth } from '@/contexts/AuthContext';

/**
 * PatientHealthRecord
 * ---------------------------------------------------------------------------
 * A structured, category-based health history form.
 * - Users can tick common conditions. If "Other" is selected, a text field appears.
 * - The component normalizes the payload for API submission: { categories: { [category]: string[] }, notes, recordedAt }
 * - You can pass an optional onSubmit prop to intercept the payload before default handling.
 */
export default function PatientHealthRecord({ onSubmit }) {
  const navigate = useNavigate();
  const { toast } = useToast();
    const { user, token } = useAuth();

  // Master catalog
  const catalog = useMemo(
    () => ({
      Cardiovascular: [
        "Hypertension (High Blood Pressure)",
        "High Cholesterol",
        "Heart Disease",
        "History of Heart Attack",
        "History of Stroke",
        "Other",
      ],
      Respiratory: [
        "Asthma",
        "Chronic Obstructive Pulmonary Disease (COPD)",
        "Sleep Apnea",
        "Other",
      ],
      "Endocrine / Metabolic": [
        "Diabetes (Type 1 / Type 2)",
        "Thyroid Disorder (Hypothyroidism / Hyperthyroidism)",
        "Obesity",
        "Other",
      ],
      Neurological: [
        "Epilepsy / Seizure Disorder",
        "Migraines",
        "Multiple Sclerosis",
        "Parkinson’s Disease",
        "Other",
      ],
      "Mental Health": ["Depression", "Anxiety", "Bipolar Disorder", "PTSD", "Other"],
      Gastrointestinal: [
        "Gastroesophageal Reflux Disease (GERD)",
        "Irritable Bowel Syndrome (IBS)",
        "Crohn’s Disease / Ulcerative Colitis",
        "Liver Disease / Hepatitis",
        "Other",
      ],
      Musculoskeletal: [
        "Arthritis (Osteoarthritis / Rheumatoid Arthritis)",
        "Chronic Back Pain",
        "Osteoporosis",
        "Other",
      ],
      "Immunological / Other": [
        "Autoimmune Disease (e.g., Lupus, Psoriasis)",
        "Cancer (current or past)",
        "HIV/AIDS",
        "Kidney Disease",
        "Anemia / Blood Disorders",
        "Other",
      ],
    }),
    []
  );

  // UI open/close for sections
  const [openSections, setOpenSections] = useState(() =>
    Object.fromEntries(Object.keys(catalog).map((k) => [k, true]))
  );

  // Selections state per category
  const [selections, setSelections] = useState(() =>
    Object.fromEntries(
      Object.keys(catalog).map((k) => [k, { chosen: new Set(), other: "" }])
    )
  );

  // Metadata
  const [patientId, setPatientId] = useState("");
  const [recordedAt, setRecordedAt] = useState(() =>
    new Date().toISOString().slice(0, 16)
  ); // local datetime string (YYYY-MM-DDTHH:mm)
  const [notes, setNotes] = useState("");

  const toggleSection = (key) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleCheck = (category, condition, checked) => {
    setSelections((prev) => {
      const next = new Set(prev[category].chosen);
      checked ? next.add(condition) : next.delete(condition);
      // If unchecking Other, clear the input
      const other = condition === "Other" && !checked ? "" : prev[category].other;
      return { ...prev, [category]: { chosen: next, other } };
    });
  };

  const handleOtherChange = (category, value) => {
    setSelections((prev) => ({
      ...prev,
      [category]: { ...prev[category], other: value },
    }));
  };

  const buildPayload = () => {
    const categories = {};
    for (const [cat, { chosen, other }] of Object.entries(selections)) {
      const list = Array.from(chosen);
      if (chosen.has("Other") && other.trim()) list.push(other.trim());
      // Remove the literal "Other" token from the final list
      const normalized = list.filter((x) => x !== "Other");
      if (normalized.length) categories[cat] = normalized;
    }

    return {
      patientId: patientId || null,
      recordedAt: new Date(recordedAt).toISOString(),
      categories,
      notes: notes?.trim() || null,
    };
  };

  const submitDefault = async (payload) => {
    // Placeholder for your API. Example:
    // await fetch("/api/patient/health-records", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify(payload),
    // });
    healthtrackerapi.post("/patient/health-records", payload,{headers:{
      'Content-Type': 'application/json',
    "Authorization": `Bearer ${token}`}})
    .then((response) => {
        console.log("Response:", response.data);
    })
    .catch((error) => {

    });
    console.log("📤 Submitting payload:", payload);
    toast({ title: "Health record saved (mock)", description: "Hook up your API when ready." });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = buildPayload();

    try {
      if (typeof onSubmit === "function") await onSubmit(payload);
      else await submitDefault(payload);
    } catch (err) {
      console.error(err);
      toast({ title: "Save failed", description: String(err), variant: "destructive" });
      return;
    }

    // Optional: go back to dashboard
    // navigate(-1);
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Button variant="ghost" className="mb-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Patient Health Record</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-8" onSubmit={handleSubmit}>
              {/* Metadata */}
              {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="patientId">Patient ID (optional)</Label>
                  <Input
                    id="patientId"
                    placeholder="e.g., PT-10023"
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="recordedAt">Recorded At</Label>
                  <Input
                    id="recordedAt"
                    type="datetime-local"
                    value={recordedAt}
                    onChange={(e) => setRecordedAt(e.target.value)}
                    required
                  />
                </div>
              </div> */}

              {/* <Separator /> */}

              {/* Categories */}
              <div className="space-y-4">
                {Object.entries(catalog).map(([category, conditions]) => {
                  const open = openSections[category];
                  const state = selections[category];
                  return (
                    <div key={category} className="border rounded-xl p-4 bg-white">
                      <button
                        type="button"
                        onClick={() => toggleSection(category)}
                        className="w-full flex items-center justify-between text-left"
                        aria-expanded={open}
                        aria-controls={`section-${category}`}
                      >
                        <h3 className="text-lg font-semibold">{category}</h3>
                        {open ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                      {open && (
                        <div id={`section-${category}`} className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                          {conditions.map((cond) => (
                            <label key={cond} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                              <Checkbox
                                checked={state.chosen.has(cond)}
                                onCheckedChange={(checked) => handleCheck(category, cond, Boolean(checked))}
                              />
                              <span className="text-sm">{cond}</span>
                            </label>
                          ))}

                          {/* Other field (conditional) */}
                          {state.chosen.has("Other") && (
                            <div className="md:col-span-2">
                              <Label>Other (please specify)</Label>
                              <Input
                                placeholder={`Add other ${category.toLowerCase()} condition`}
                                value={state.other}
                                onChange={(e) => handleOtherChange(category, e.target.value)}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* <Separator /> */}

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Anything else relevant to the patient's history..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                />
              </div>

              {/* Preview */}
              {/* <div className="bg-slate-50 border rounded-xl p-4 text-sm overflow-auto">
                <strong className="block mb-2">Payload Preview</strong>
                <pre className="whitespace-pre-wrap break-words">{JSON.stringify(buildPayload(), null, 2)}</pre>
              </div> */}

              <div className="flex items-center justify-end gap-3">
                <Button type="submit" className="gap-2">
                  <Save className="w-4 h-4" /> Save Record
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
