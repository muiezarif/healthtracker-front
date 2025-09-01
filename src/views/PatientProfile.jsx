import React, { useMemo, useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { Save, Plus, X, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import healthtrackerapi from "../lib/healthtrackerapi";
import { useAuth } from '@/contexts/AuthContext';

/**
 * PatientProfile (stable-focus build)
 * - No live JSON preview.
 * - No framer-motion wrappers.
 * - No dynamic keys that depend on state.
 * - recordedAt only at submit.
 * - Fixed focus issues by moving components outside render
 */

// Move helper components outside to prevent recreation
const Field = ({ label, children }) => (
    <div className="space-y-2">
        <Label className="text-slate-700">{label}</Label>
        {children}
    </div>
);

const Section = ({ title, children }) => (
    <div className="border rounded-xl p-4 bg-white">
        <h3 className="text-lg font-semibold mb-3">{title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </div>
);

const Tag = ({ text, onRemove }) => (
    <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 border text-slate-700 text-xs mr-2 mb-2">
        {text}
        <button type="button" className="hover:text-red-600" onClick={onRemove}>
            <X className="w-3 h-3" />
        </button>
    </span>
);

export default function PatientProfile({ onSubmit }) {
    const { toast } = useToast();
    const navigate = useNavigate();
    const { user, token } = useAuth();
    const initialData = user || {};

    // --- Catalogs ---
    const CONDITIONS = useMemo(
        () => [
            "Diabetes",
            "Hypertension",
            "Asthma",
            "Heart Disease",
            "High Cholesterol",
            "Thyroid Disorder",
            "Depression",
            "Anxiety",
            "Other",
        ],
        []
    );

    // --- Form State ---
    const [fullName, setFullName] = useState(initialData?.fullName || "");
    const [dob, setDob] = useState(initialData?.dob || ""); // YYYY-MM-DD
    const [age, setAge] = useState(initialData?.age || ""); // derived if dob present
    const [sexAtBirth, setSexAtBirth] = useState(initialData?.sexAtBirth || "");
    const [genderIdentity, setGenderIdentity] = useState(initialData?.genderIdentity || "");

    const [city, setCity] = useState(initialData?.address?.city || "");
    const [stateRegion, setStateRegion] = useState(initialData?.address?.state || "");
    const [zip, setZip] = useState(initialData?.address?.zip || "");

    const [phone, setPhone] = useState(initialData?.phone || "");
    const [email, setEmail] = useState(initialData?.email || "");

    // Physical baseline + units
    const [heightUnit, setHeightUnit] = useState(initialData?.heightUnit || "cm"); // cm | ftin
    const [weightUnit, setWeightUnit] = useState(initialData?.weightUnit || "kg"); // kg | lbs
    const [heightCm, setHeightCm] = useState(initialData?.heightCm || "");
    const [heightFt, setHeightFt] = useState(initialData?.heightFt || "");
    const [heightIn, setHeightIn] = useState(initialData?.heightIn || "");
    const [weightKg, setWeightKg] = useState(initialData?.weightKg || "");
    const [weightLbs, setWeightLbs] = useState(initialData?.weightLbs || "");
    const [bmi, setBmi] = useState(initialData?.bmi || "");

    // Health flags
    const [allergyInput, setAllergyInput] = useState("");
    const [allergies, setAllergies] = useState(initialData?.allergies || []); // array of strings

    const [conditions, setConditions] = useState(() => {
        const preset = new Set(initialData?.conditions || []);
        return CONDITIONS.reduce((acc, c) => ({ ...acc, [c]: preset.has(c) }), {});
    });
    const [otherCondition, setOtherCondition] = useState(initialData?.otherCondition || "");

    const [medications, setMedications] = useState(initialData?.medications || []);
    const [medInput, setMedInput] = useState("");

    // Emergency & compliance
    const [emergencyName, setEmergencyName] = useState(initialData?.emergencyContact?.name || "");
    const [emergencyPhone, setEmergencyPhone] = useState(initialData?.emergencyContact?.phone || "");
    const [primaryCareProvider, setPrimaryCareProvider] = useState(initialData?.primaryCareProvider || "");
    const [consent, setConsent] = useState(Boolean(initialData?.consent));

    // --- Helpers ---
    const toNumber = useCallback((v) => (v === "" ? NaN : Number(v)), []);

    const calcBmi = useCallback(() => {
        // Convert to metric
        let cm =
            heightUnit === "cm"
                ? toNumber(heightCm)
                : toNumber(heightFt) * 30.48 + toNumber(heightIn) * 2.54;
        let kg = weightUnit === "kg" ? toNumber(weightKg) : toNumber(weightLbs) * 0.45359237;
        if (!isFinite(cm) || cm <= 0 || !isFinite(kg) || kg <= 0) return "";
        const meters = cm / 100;
        return (kg / (meters * meters)).toFixed(1);
    }, [heightUnit, weightUnit, heightCm, heightFt, heightIn, weightKg, weightLbs, toNumber]);

    useEffect(() => {
        setBmi(calcBmi());
    }, [calcBmi]);

    useEffect(() => {
        // Derive age if dob present
        if (!dob) return;
        const birth = new Date(dob);
        if (isNaN(birth.getTime())) return;
        const today = new Date();
        let years = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) years--;
        setAge(String(years));
    }, [dob]);

    const toggleCondition = useCallback((c, checked) =>
        setConditions((prev) => ({ ...prev, [c]: checked })), []);

    const addAllergy = useCallback(() => {
        const v = allergyInput.trim();
        if (!v) return;
        if (allergies.includes(v)) return;
        setAllergies((prev) => [...prev, v]);
        setAllergyInput("");
    }, [allergyInput, allergies]);

    const removeAllergy = useCallback((val) =>
        setAllergies((prev) => prev.filter((a) => a !== val)), []);

    const addMedication = useCallback(() => {
        const v = medInput.trim();
        if (!v) return;
        if (medications.includes(v)) return;
        setMedications((prev) => [...prev, v]);
        setMedInput("");
    }, [medInput, medications]);

    const removeMedication = useCallback((val) =>
        setMedications((prev) => prev.filter((m) => m !== val)), []);

    // Build payload; recordedAt only on submit
    const buildPayload = useCallback(() => {
        const picked = Object.entries(conditions)
            .filter(([_, v]) => v)
            .map(([k]) => (k === "Other" ? otherCondition.trim() || "Other" : k));

        return {
            fullName: fullName.trim(),
            dob: dob || null,
            age: age || null,
            sexAtBirth: sexAtBirth || null,
            genderIdentity: genderIdentity?.trim() || null,
            address: {
                city: city?.trim() || null,
                state: stateRegion?.trim() || null,
                zip: zip?.trim() || null,
            },
            phone: phone?.trim() || null,
            email: email?.trim() || null,
            physicalBaseline: {
                height:
                    heightUnit === "cm"
                        ? { unit: "cm", cm: heightCm ? Number(heightCm) : null }
                        : {
                            unit: "ftin",
                            ft: heightFt ? Number(heightFt) : null,
                            in: heightIn ? Number(heightIn) : null,
                        },
                weight:
                    weightUnit === "kg"
                        ? { unit: "kg", kg: weightKg ? Number(weightKg) : null }
                        : { unit: "lbs", lbs: weightLbs ? Number(weightLbs) : null },
                bmi: bmi ? Number(bmi) : null,
            },
            allergies,
            conditions: picked,
            medications,
            emergencyContact: {
                name: emergencyName?.trim() || null,
                phone: emergencyPhone?.trim() || null,
            },
            primaryCareProvider: primaryCareProvider?.trim() || null,
            consent: Boolean(consent),
            recordedAt: new Date().toISOString(),
        };
    }, [
        conditions, otherCondition, fullName, dob, age, sexAtBirth, genderIdentity,
        city, stateRegion, zip, phone, email, heightUnit, heightCm, heightFt,
        heightIn, weightUnit, weightKg, weightLbs, bmi, allergies, medications,
        emergencyName, emergencyPhone, primaryCareProvider, consent
    ]);

    const validate = useCallback(() => {
        if (!fullName.trim()) return "Full Name is required";
        if (!dob && !age) return "Provide either Date of Birth or Age";
        if (!sexAtBirth) return "Sex at Birth is required";
        if (!consent) return "You must agree to consent to continue";
        return null;
    }, [fullName, dob, age, sexAtBirth, consent]);

    const submitDefault = useCallback(async (payload) => {
        console.log("📤 Submitting profile payload:", payload);
        await healthtrackerapi.put("/patient/profile", payload, {
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        });
    }, []);

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        const err = validate();
        if (err) {
            toast({
                variant: "destructive",
                title: "Cannot save profile",
                description: err,
            });
            return;
        }
        const payload = buildPayload(); // inject recordedAt now
        try {
            if (typeof onSubmit === "function") await onSubmit(payload);
            else await submitDefault(payload);
        } catch (ex) {
            console.error(ex);
            toast({
                variant: "destructive",
                title: "Save failed",
                description: String(ex),
            });
        }
    }, [validate, buildPayload, onSubmit, submitDefault, toast]);

    const handleGoBack = useCallback(() => navigate(-1), [navigate]);

    return (
        <div className="container mx-auto p-6 max-w-5xl">
            <Button variant="ghost" className="mb-4" onClick={handleGoBack}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle>Patient Profile</CardTitle>
                </CardHeader>
                <CardContent>
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {/* Core Demographics */}
                        <Section title="Core Demographics (Required)">
                            <Field label="Full Name *">
                                <Input
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="Jane Doe"
                                />
                            </Field>

                            <Field label="Date of Birth">
                                <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
                            </Field>

                            <Field label="Age (years)">
                                <Input
                                    type="number"
                                    inputMode="numeric"
                                    min="0"
                                    value={age}
                                    onChange={(e) => setAge(e.target.value)}
                                    placeholder="e.g., 34"
                                />
                            </Field>

                            <Field label="Sex at Birth *">
                                <div className="flex gap-3">
                                    {["Male", "Female", "Other"].map((opt) => (
                                        <label className="flex items-center gap-2 text-sm" key={opt}>
                                            <Checkbox
                                                checked={sexAtBirth === opt}
                                                onCheckedChange={() => setSexAtBirth(opt)}
                                            />
                                            {opt}
                                        </label>
                                    ))}
                                </div>
                            </Field>

                            <Field label="Gender Identity (optional)">
                                <Input
                                    value={genderIdentity}
                                    onChange={(e) => setGenderIdentity(e.target.value)}
                                    placeholder="e.g., Woman, Man, Non-binary"
                                />
                            </Field>

                            <Field label="City">
                                <Input value={city} onChange={(e) => setCity(e.target.value)} />
                            </Field>

                            <Field label="State/Province">
                                <Input value={stateRegion} onChange={(e) => setStateRegion(e.target.value)} />
                            </Field>

                            <Field label="ZIP/Postal Code">
                                <Input value={zip} onChange={(e) => setZip(e.target.value)} />
                            </Field>

                            <Field label="Phone Number">
                                <Input
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="e.g., +1 555 123 4567"
                                />
                            </Field>

                            <Field label="Email">
                                <Input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@example.com"
                                />
                            </Field>
                        </Section>

                        {/* Physical Baseline */}
                        <Section title="Physical Baseline">
                            <Field label="Height">
                                <div className="flex gap-3">
                                    <select
                                        className="border rounded-md px-2 py-2"
                                        value={heightUnit}
                                        onChange={(e) => setHeightUnit(e.target.value)}
                                    >
                                        <option value="cm">cm</option>
                                        <option value="ftin">ft/in</option>
                                    </select>
                                    {heightUnit === "cm" ? (
                                        <Input
                                            type="number"
                                            inputMode="decimal"
                                            placeholder="cm"
                                            value={heightCm}
                                            onChange={(e) => setHeightCm(e.target.value)}
                                        />
                                    ) : (
                                        <div className="flex gap-2 w-full">
                                            <Input
                                                type="number"
                                                inputMode="numeric"
                                                placeholder="ft"
                                                value={heightFt}
                                                onChange={(e) => setHeightFt(e.target.value)}
                                            />
                                            <Input
                                                type="number"
                                                inputMode="numeric"
                                                placeholder="in"
                                                value={heightIn}
                                                onChange={(e) => setHeightIn(e.target.value)}
                                            />
                                        </div>
                                    )}
                                </div>
                            </Field>

                            <Field label="Weight">
                                <div className="flex gap-3">
                                    <select
                                        className="border rounded-md px-2 py-2"
                                        value={weightUnit}
                                        onChange={(e) => setWeightUnit(e.target.value)}
                                    >
                                        <option value="kg">kg</option>
                                        <option value="lbs">lbs</option>
                                    </select>
                                    {weightUnit === "kg" ? (
                                        <Input
                                            type="number"
                                            inputMode="decimal"
                                            placeholder="kg"
                                            value={weightKg}
                                            onChange={(e) => setWeightKg(e.target.value)}
                                        />
                                    ) : (
                                        <Input
                                            type="number"
                                            inputMode="decimal"
                                            placeholder="lbs"
                                            value={weightLbs}
                                            onChange={(e) => setWeightLbs(e.target.value)}
                                        />
                                    )}
                                </div>
                            </Field>

                            <Field label="BMI (auto)">
                                <Input value={bmi} readOnly placeholder="—" />
                            </Field>
                        </Section>

                        {/* Basic Health Flags */}
                        <Section title="Basic Health Flags">
                            <div className="md:col-span-2">
                                <Label className="text-slate-700">Allergies</Label>
                                <div className="flex gap-2 mt-2">
                                    <Input
                                        value={allergyInput}
                                        onChange={(e) => setAllergyInput(e.target.value)}
                                        placeholder="Add allergy (e.g., Penicillin)"
                                    />
                                    <Button type="button" onClick={addAllergy} className="gap-1">
                                        <Plus className="w-4 h-4" />
                                        Add
                                    </Button>
                                </div>
                                <div className="mt-3">
                                    {allergies.length === 0 ? (
                                        <p className="text-sm text-slate-500">No allergies added.</p>
                                    ) : (
                                        allergies.map((a) => (
                                            <Tag key={a} text={a} onRemove={() => removeAllergy(a)} />
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <Label className="text-slate-700">Pre-existing Conditions</Label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
                                    {CONDITIONS.map((c) => (
                                        <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50" key={c}>
                                            <Checkbox
                                                checked={Boolean(conditions[c])}
                                                onCheckedChange={(ch) => toggleCondition(c, Boolean(ch))}
                                            />
                                            <span className="text-sm">{c}</span>
                                        </label>
                                    ))}
                                </div>
                                {conditions["Other"] && (
                                    <div className="mt-2">
                                        <Input
                                            value={otherCondition}
                                            onChange={(e) => setOtherCondition(e.target.value)}
                                            placeholder="Other condition"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="md:col-span-2">
                                <Label className="text-slate-700">Current Medications (optional)</Label>
                                <div className="flex gap-2 mt-2">
                                    <Input
                                        value={medInput}
                                        onChange={(e) => setMedInput(e.target.value)}
                                        placeholder="Medication name"
                                    />
                                    <Button type="button" onClick={addMedication} className="gap-1">
                                        <Plus className="w-4 h-4" />
                                        Add
                                    </Button>
                                </div>
                                <div className="mt-3">
                                    {medications.length === 0 ? (
                                        <p className="text-sm text-slate-500">No medications added.</p>
                                    ) : (
                                        medications.map((m) => (
                                            <Tag key={m} text={m} onRemove={() => removeMedication(m)} />
                                        ))
                                    )}
                                </div>
                            </div>
                        </Section>

                        {/* Emergency & Compliance */}
                        <Section title="Emergency & Compliance">
                            <Field label="Emergency Contact Name">
                                <Input
                                    value={emergencyName}
                                    onChange={(e) => setEmergencyName(e.target.value)}
                                />
                            </Field>
                            <Field label="Emergency Contact Phone">
                                <Input
                                    value={emergencyPhone}
                                    onChange={(e) => setEmergencyPhone(e.target.value)}
                                    placeholder="e.g., +1 555 987 6543"
                                />
                            </Field>
                            <Field label="Primary Care Provider (if any)">
                                <Input
                                    value={primaryCareProvider}
                                    onChange={(e) => setPrimaryCareProvider(e.target.value)}
                                    placeholder="Provider name"
                                />
                            </Field>
                            <div className="md:col-span-2">
                                <label className="flex items-start gap-3 p-3 rounded-lg border">
                                    <Checkbox
                                        checked={consent}
                                        onCheckedChange={(ch) => setConsent(Boolean(ch))}
                                    />
                                    <span className="text-sm text-slate-700">
                                        I acknowledge the HIPAA Notice and agree to the Terms of Use. I
                                        consent to the secure collection and use of my health information
                                        for the purposes of care and service delivery.
                                    </span>
                                </label>
                            </div>
                        </Section>

                        <div className="flex items-center justify-end gap-3">
                            <Button type="submit" className="gap-2">
                                <Save className="w-4 h-4" /> Save Profile
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}