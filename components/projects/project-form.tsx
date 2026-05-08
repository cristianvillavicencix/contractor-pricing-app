"use client";

import { useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  projectSizeOptions,
  riskLevelOptions,
  stateOptions,
  tradeOptions,
  type Contact,
  type Project,
  type ProjectSize,
  type ProjectState,
  type RiskLevel,
  type Trade,
} from "@/lib/projects";

type FormState = {
  projectName: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  address: string;
  city: string;
  state: ProjectState;
  zipCode: string;
  trade: Trade;
  projectSize: ProjectSize;
  riskLevel: RiskLevel;
  notes: string;
};

const initialForm: FormState = {
  projectName: "",
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  address: "",
  city: "",
  state: "Connecticut",
  zipCode: "",
  trade: "Roofing",
  projectSize: "Medium",
  riskLevel: "Medium",
  notes: "",
};

export function ProjectForm({
  onCreate,
  onCancel,
  onCreateContact,
  contacts = [],
}: {
  onCreate: (project: Project) => void;
  onCancel: () => void;
  onCreateContact?: (contact: Omit<Contact, "id" | "createdAt">) => Contact;
  contacts?: Contact[];
}) {
  const [form, setForm] = useState<FormState>(initialForm);
  const [error, setError] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const isDirty =
    form.projectName.trim() !== "" ||
    form.customerName.trim() !== "" ||
    form.address.trim() !== "" ||
    form.notes.trim() !== "";

  function handleAttemptClose() {
    if (isDirty) {
      setShowConfirm(true);
    } else {
      onCancel();
    }
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const nameSuggestions =
    form.customerName.trim().length >= 1
      ? contacts.filter((c) =>
          c.name.toLowerCase().includes(form.customerName.trim().toLowerCase())
        )
      : [];

  function applyContact(contact: Contact) {
    const parts = contact.address.split(",");
    const street = parts[0]?.trim() ?? "";
    const cityPart = parts[1]?.trim() ?? "";
    const stateZipPart = parts[2]?.trim() ?? "";
    const [statePart, zip] = stateZipPart.split(" ").filter(Boolean);
    const matchedState = (stateOptions as readonly string[]).includes(statePart)
      ? (statePart as ProjectState)
      : form.state;

    setForm((current) => ({
      ...current,
      customerName: contact.name,
      customerPhone: contact.phone || current.customerPhone,
      customerEmail: contact.email || current.customerEmail,
      address: street || current.address,
      city: cityPart || current.city,
      state: matchedState,
      zipCode: zip || current.zipCode,
    }));
    setSelectedContactId(contact.id);
    setShowSuggestions(false);
  }

  function createProject() {
    if (
      !form.projectName.trim() ||
      !form.customerName.trim() ||
      !form.address.trim() ||
      !form.trade
    ) {
      setError("Project name, customer, address, and trade are required.");
      return;
    }

    const matchedContact =
      contacts.find((contact) => contact.id === selectedContactId) ??
      contacts.find(
        (contact) =>
          sameText(contact.name, form.customerName) ||
          (Boolean(contact.email) && sameText(contact.email, form.customerEmail)) ||
          (Boolean(contact.phone) && sameText(contact.phone, form.customerPhone))
      );

    const createdContact =
      matchedContact ??
      onCreateContact?.({
        name: form.customerName.trim(),
        phone: form.customerPhone.trim(),
        email: form.customerEmail.trim(),
        address: buildAddress(form),
        notes: "",
        customerType: "Homeowner",
      });

    onCreate({
      id: crypto.randomUUID(),
      ...form,
      contactId: createdContact?.id,
      status: "Draft",
      costs: {
        materials: 0,
        labor: 0,
        dumpster: 0,
        permits: 0,
        equipment: 0,
        subcontractor: 0,
        miscellaneous: 0,
      },
      createdAt: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    });
  }

  return (
    <div
      onClick={handleAttemptClose}
      className="fixed inset-0 z-50 bg-[#213343]/20 px-4 py-6 backdrop-blur-sm sm:px-6"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="mx-auto max-h-full max-w-3xl overflow-auto rounded-lg border border-[#d9e2ec] bg-white"
      >
        <div className="border-b border-[#d9e2ec] p-5 sm:p-6">
          <h2 className="text-xl font-semibold tracking-tight">New Project</h2>
          <p className="mt-1 text-sm text-gray-500">
            Create the job container. Costs and pricing can be added next.
          </p>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <InputField
            label="Project name"
            value={form.projectName}
            onChange={(value) => updateField("projectName", value)}
            required
          />

          {/* Customer name with contact autocomplete */}
          <div className="relative">
            <label className="block text-sm font-medium">
              Customer name <span className="text-gray-400">*</span>
              <input
                ref={nameInputRef}
                value={form.customerName}
                onChange={(e) => {
                  updateField("customerName", e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                autoComplete="off"
                className="mt-2 w-full rounded-md border border-[#d9e2ec] px-4 py-3 text-sm outline-none transition focus:border-[#ff5c35]"
              />
            </label>
            {showSuggestions && nameSuggestions.length > 0 && (
              <ul className="absolute left-0 right-0 z-10 mt-1 max-h-44 overflow-auto rounded-md border border-[#d9e2ec] bg-white shadow-lg">
                {nameSuggestions.map((contact) => (
                  <li key={contact.id}>
                    <button
                      type="button"
                      onMouseDown={() => applyContact(contact)}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-[#f6f8fb]"
                    >
                      <span className="font-medium text-black">
                        {contact.name}
                      </span>
                      {contact.phone && (
                        <span className="ml-2 text-gray-400">
                          {contact.phone}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <InputField
            label="Customer phone"
            value={form.customerPhone}
            onChange={(value) => updateField("customerPhone", value)}
          />
          <InputField
            label="Customer email"
            value={form.customerEmail}
            onChange={(value) => updateField("customerEmail", value)}
          />
          <InputField
            label="Project address"
            value={form.address}
            onChange={(value) => updateField("address", value)}
            required
            className="sm:col-span-2"
          />
          <InputField
            label="City"
            value={form.city}
            onChange={(value) => updateField("city", value)}
          />
          <SelectField
            label="State"
            value={form.state}
            options={stateOptions}
            onChange={(value) => updateField("state", value as ProjectState)}
          />
          <InputField
            label="ZIP code"
            value={form.zipCode}
            onChange={(value) => updateField("zipCode", value)}
          />
          <SelectField
            label="Trade"
            value={form.trade}
            options={tradeOptions}
            onChange={(value) => updateField("trade", value as Trade)}
            required
          />
          <SelectField
            label="Project size"
            value={form.projectSize}
            options={projectSizeOptions}
            onChange={(value) =>
              updateField("projectSize", value as ProjectSize)
            }
          />
          <SelectField
            label="Risk level"
            value={form.riskLevel}
            options={riskLevelOptions}
            onChange={(value) => updateField("riskLevel", value as RiskLevel)}
          />
          <label className="block text-sm font-medium sm:col-span-2">
            Notes
            <textarea
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              className="mt-2 min-h-28 w-full resize-none rounded-md border border-[#d9e2ec] px-4 py-3 text-sm outline-none transition focus:border-[#ff5c35]"
            />
          </label>
        </div>

        {error ? (
          <p className="px-5 pb-2 text-sm text-red-600 sm:px-6">{error}</p>
        ) : null}

        {/* Discard confirmation */}
        {showConfirm && (
          <div className="mx-5 mb-3 flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 sm:mx-6">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-900">Discard unsaved changes?</p>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={onCancel}
                  className="rounded-md bg-yellow-700 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-yellow-800"
                >
                  Yes, discard
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="rounded-md border border-yellow-300 px-3 py-1.5 text-xs font-medium text-yellow-800 transition hover:bg-yellow-100"
                >
                  Keep editing
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 border-t border-[#d9e2ec] p-5 sm:p-6">
          <button
            onClick={handleAttemptClose}
            className="rounded-md border border-[#d9e2ec] px-4 py-2 text-sm font-medium transition hover:bg-[#f6f8fb]"
          >
            Cancel
          </button>
          <button
            onClick={createProject}
            className="rounded-md bg-[#ff5c35] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#e94820]"
          >
            Create Project
          </button>
        </div>
      </div>
    </div>
  );
}

function buildAddress(form: FormState) {
  return [form.address, form.city, `${form.state} ${form.zipCode}`]
    .filter((part) => part.trim())
    .join(", ");
}

function sameText(left: string, right: string) {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function InputField({
  label,
  value,
  onChange,
  required = false,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={`block text-sm font-medium ${className}`}>
      {label}
      {required ? <span className="text-gray-400"> *</span> : null}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-md border border-[#d9e2ec] px-4 py-3 text-sm outline-none transition focus:border-[#ff5c35]"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      {required ? <span className="text-gray-400"> *</span> : null}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-md border border-[#d9e2ec] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#ff5c35]"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
