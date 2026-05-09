"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { ErrorPanel, PageSkeleton } from "@/components/ui/list-states";
import {
  formatMargin,
  formatMoney,
  getTodayLabel,
  type Contact,
  type Project,
  type Quote,
} from "@/lib/app-data";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  deleteContact as deleteContactDb,
  listContacts,
  listProjects,
  listQuotes,
  upsertContact,
  upsertProject,
} from "@/lib/supabase/data";
import { t } from "@/lib/ui-strings";

type ContactForm = Omit<Contact, "id" | "createdAt">;

const emptyContact: ContactForm = {
  name: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
  customerType: "Homeowner",
};

export default function ContactsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<ContactForm>(emptyContact);
  const [error, setError] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(
    () =>
      typeof window === "undefined"
        ? null
        : new URLSearchParams(window.location.search).get("contactId")
  );

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [dbContacts, dbProjects, dbQuotes] = await Promise.all([
        listContacts(supabase),
        listProjects(supabase),
        listQuotes(supabase),
      ]);
      setContacts(dbContacts);
      setProjects(dbProjects);
      setQuotes(dbQuotes);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount fetch updates list state
    void loadData();
  }, [loadData]);

  const filteredContacts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return contacts;

    return contacts.filter(
      (contact) =>
        contact.name.toLowerCase().includes(query) ||
        contact.email.toLowerCase().includes(query) ||
        contact.phone.toLowerCase().includes(query) ||
        contact.address.toLowerCase().includes(query)
    );
  }, [contacts, search]);

  function createContact() {
    if (!form.name.trim()) {
      setError("Customer name is required.");
      return;
    }

    const next: Contact = {
      id: crypto.randomUUID(),
      ...form,
      createdAt: getTodayLabel(),
    };
    setContacts((current) => [next, ...current]);
    upsertContact(supabase, next).catch(() => undefined);
    setForm(emptyContact);
    setError("");
  }

  function updateContact(updated: Contact) {
    setContacts((current) => current.map((c) => (c.id === updated.id ? updated : c)));
    upsertContact(supabase, updated).catch(() => undefined);
  }

  async function deleteContact(id: string) {
    const linkedProjects = projects.filter((p) => p.contactId === id);
    for (const p of linkedProjects) {
      const next: Project = { ...p, contactId: undefined };
      await upsertProject(supabase, next);
    }
    setProjects((prev) =>
      prev.map((p) => (p.contactId === id ? { ...p, contactId: undefined } : p))
    );
    await deleteContactDb(supabase, id);
    setContacts((current) => current.filter((c) => c.id !== id));
    setSelectedContactId(null);
  }

  const selectedContact = contacts.find(
    (contact) => contact.id === selectedContactId
  );

  if (isLoading && !loadError) {
    return (
      <div className="min-h-screen bg-[var(--page-bg)] lg:flex">
        <AppSidebar />
        <main className="min-w-0 flex-1 p-5 sm:p-8 lg:p-10">
          <PageSkeleton rows={6} />
        </main>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-[var(--page-bg)] lg:flex">
        <AppSidebar />
        <main className="flex min-w-0 flex-1 items-center justify-center p-6">
          <div className="max-w-md">
            <ErrorPanel message={loadError} onRetry={() => void loadData()} />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[var(--brand-navy)] lg:flex">
      <AppSidebar />

      <main className="min-w-0 flex-1 overflow-auto p-5 pb-24 sm:p-8 sm:pb-24 lg:p-10">
        <div className="w-full">
          <header>
            <p className="text-sm font-medium text-gray-500">Contacts</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Contacts
            </h2>
            <p className="mt-3 max-w-2xl text-gray-500">
              Store basic customer information before connecting projects and
              quotes to a full CRM later.
            </p>
          </header>

          <div className="mt-8 grid gap-6 xl:grid-cols-[360px_1fr]">
            <section className="h-fit rounded-lg border border-[#d9e2ec] bg-white p-5 sm:p-6">
              <h3 className="text-lg font-semibold tracking-tight">
                New Contact
              </h3>
              <div className="mt-5 grid gap-4">
                <TextField
                  label="Name"
                  value={form.name}
                  onChange={(value) => setForm({ ...form, name: value })}
                />
                <TextField
                  label="Phone"
                  value={form.phone}
                  onChange={(value) => setForm({ ...form, phone: value })}
                />
                <TextField
                  label="Email"
                  value={form.email}
                  onChange={(value) => setForm({ ...form, email: value })}
                />
                <TextField
                  label="Address"
                  value={form.address}
                  onChange={(value) => setForm({ ...form, address: value })}
                />
                <label className="block text-sm font-medium">
                  Customer Type
                  <select
                    value={form.customerType}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        customerType: event.target
                          .value as Contact["customerType"],
                      })
                    }
                    className="mt-2 w-full rounded-md border border-[#d9e2ec] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#ff5c35]"
                  >
                    <option>Homeowner</option>
                    <option>Business</option>
                    <option>Property Manager</option>
                  </select>
                </label>
                <label className="block text-sm font-medium">
                  Notes
                  <textarea
                    value={form.notes}
                    onChange={(event) =>
                      setForm({ ...form, notes: event.target.value })
                    }
                    className="mt-2 min-h-24 w-full resize-none rounded-md border border-[#d9e2ec] px-4 py-3 text-sm outline-none transition focus:border-[#ff5c35]"
                  />
                </label>
              </div>

              {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

              <button
                onClick={createContact}
                className="mt-5 w-full rounded-md bg-[#ff5c35] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#e94820]"
              >
                Create Contact
              </button>
            </section>

            <section>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search contacts"
                className="w-full rounded-lg border border-[#d9e2ec] px-4 py-3 text-sm outline-none transition focus:border-[#ff5c35]"
              />

              {/* Mobile cards */}
              <div className="mt-4 space-y-2 sm:hidden">
                {filteredContacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => setSelectedContactId(contact.id)}
                    className="w-full rounded-lg border border-[#d9e2ec] bg-white p-4 text-left transition hover:bg-[#f6f8fb]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-black">{contact.name}</p>
                        <p className="mt-0.5 text-xs text-gray-500">{contact.customerType}</p>
                      </div>
                      <span className="shrink-0 text-xs text-gray-400">{contact.createdAt}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-600">
                      {contact.phone && <span>{contact.phone}</span>}
                      {contact.email && <span className="truncate">{contact.email}</span>}
                    </div>
                  </button>
                ))}
              </div>

              {/* Desktop table */}
              <div className="mt-5 hidden overflow-x-auto rounded-lg border border-[#d9e2ec] bg-white sm:block">
                <div className="grid min-w-190 grid-cols-[1.4fr_1fr_1fr_1.3fr_1fr] gap-4 border-b border-[#d9e2ec] bg-[#f6f8fb] px-5 py-3 text-xs font-medium uppercase tracking-[0.08em] text-gray-400">
                  <span>Name</span>
                  <span>Type</span>
                  <span>Phone</span>
                  <span>Email</span>
                  <span>Created</span>
                </div>
                <div className="min-w-190 divide-y divide-gray-100">
                  {filteredContacts.map((contact) => (
                    <button
                      key={contact.id}
                      onClick={() => setSelectedContactId(contact.id)}
                      className="grid w-full grid-cols-[1.4fr_1fr_1fr_1.3fr_1fr] items-center gap-4 px-5 py-4 text-left text-sm transition hover:bg-[#f6f8fb]"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-black">{contact.name}</p>
                        <p className="mt-1 truncate text-gray-500">{contact.address || "No address"}</p>
                      </div>
                      <span>{contact.customerType}</span>
                      <span className="text-gray-600">{contact.phone || "No phone"}</span>
                      <span className="truncate text-gray-600">{contact.email || "No email"}</span>
                      <span>{contact.createdAt}</span>
                    </button>
                  ))}
                </div>
              </div>

              {filteredContacts.length === 0 ? (
                <div className="mt-5 rounded-lg border border-[#d9e2ec] bg-white p-10 text-center">
                  <p className="font-semibold tracking-tight">
                    {contacts.length === 0 ? t("emptyContacts") : "No contacts match your search"}
                  </p>
                  <p className="mt-2 text-sm text-gray-500">
                    {contacts.length === 0
                      ? t("emptyContactsHint")
                      : "Try a different search."}
                  </p>
                </div>
              ) : null}
            </section>
          </div>
        </div>
      </main>

      {selectedContact ? (
        <ContactDetailPanel
          key={selectedContact.id}
          contact={selectedContact}
          projects={getContactProjects(selectedContact, projects)}
          quotes={getContactQuotes(selectedContact, quotes)}
          onClose={() => setSelectedContactId(null)}
          onUpdate={updateContact}
          onDelete={() => deleteContact(selectedContact.id)}
          onOpenProject={(projectId) =>
            router.push(`/projects?projectId=${projectId}&projectTab=overview`)
          }
          onOpenQuote={(quoteId) => router.push(`/quotes/preview?id=${quoteId}`)}
        />
      ) : null}
    </div>
  );
}

function ContactDetailPanel({
  contact,
  projects,
  quotes,
  onClose,
  onUpdate,
  onDelete,
  onOpenProject,
  onOpenQuote,
}: {
  contact: Contact;
  projects: Project[];
  quotes: Quote[];
  onClose: () => void;
  onUpdate: (contact: Contact) => void;
  onDelete: () => Promise<void>;
  onOpenProject: (projectId: string) => void;
  onOpenQuote: (quoteId: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<Contact>(contact);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteWorking, setDeleteWorking] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

  function saveEdit() {
    if (!draft.name.trim()) return;
    onUpdate(draft);
    setIsEditing(false);
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-[#213343]/20 backdrop-blur-sm"
    >
      <aside
        onClick={(event) => event.stopPropagation()}
        className="ml-auto h-full w-full overflow-auto border-l border-[#d9e2ec] bg-white p-5 sm:p-6 lg:w-1/2"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-semibold tracking-tight">
              {contact.name}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {contact.customerType} · created {contact.createdAt}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing((v) => !v)}
              className={`rounded-md border px-3 py-2 text-sm font-medium transition hover:bg-[#f6f8fb] ${isEditing ? "border-[#ff5c35] text-[#ff5c35]" : "border-[#d9e2ec]"}`}
            >
              <Pencil className="inline h-3.5 w-3.5" />
              {isEditing ? " Editing" : " Edit"}
            </button>
            <button
              onClick={onClose}
              className="rounded-md border border-[#d9e2ec] px-3 py-2 text-sm font-medium transition hover:bg-[#f6f8fb]"
            >
              Close
            </button>
          </div>
        </div>

        {isEditing ? (
          <section className="mt-6 space-y-4 rounded-lg border border-[#d9e2ec] p-5">
            <TextField label="Name" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} />
            <TextField label="Phone" value={draft.phone} onChange={(v) => setDraft({ ...draft, phone: v })} />
            <TextField label="Email" value={draft.email} onChange={(v) => setDraft({ ...draft, email: v })} />
            <TextField label="Address" value={draft.address} onChange={(v) => setDraft({ ...draft, address: v })} />
            <label className="block text-sm font-medium">
              Customer Type
              <select
                value={draft.customerType}
                onChange={(e) => setDraft({ ...draft, customerType: e.target.value as Contact["customerType"] })}
                className="mt-2 w-full rounded-md border border-[#d9e2ec] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#ff5c35]"
              >
                <option>Homeowner</option>
                <option>Business</option>
                <option>Property Manager</option>
              </select>
            </label>
            <label className="block text-sm font-medium">
              Notes
              <textarea
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                className="mt-2 min-h-20 w-full resize-none rounded-md border border-[#d9e2ec] px-4 py-3 text-sm outline-none transition focus:border-[#ff5c35]"
              />
            </label>
            <div className="flex gap-3">
              <button
                onClick={saveEdit}
                className="flex-1 rounded-md bg-[#ff5c35] py-2.5 text-sm font-medium text-white transition hover:bg-[#e94820]"
              >
                Save Changes
              </button>
              <button
                onClick={() => { setDraft(contact); setIsEditing(false); }}
                className="rounded-md border border-[#d9e2ec] px-4 py-2.5 text-sm transition hover:bg-[#f6f8fb]"
              >
                Cancel
              </button>
            </div>
          </section>
        ) : (
          <section className="mt-8 grid gap-4 sm:grid-cols-2">
            <DetailBlock label="Phone" value={contact.phone || "No phone"} />
            <DetailBlock label="Email" value={contact.email || "No email"} />
            <DetailBlock label="Address" value={contact.address || "No address"} />
            <DetailBlock label="Customer type" value={contact.customerType} />
          </section>
        )}

        {!isEditing && (
          <section className="mt-4 rounded-lg border border-[#d9e2ec] bg-white p-5">
            <p className="text-sm font-medium text-black">Notes</p>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              {contact.notes || "No notes yet."}
            </p>
          </section>
        )}

        <section className="mt-4 rounded-lg border border-[#d9e2ec] bg-white p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-black">
                Connected Projects
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Projects assigned or matched to this customer.
              </p>
            </div>
            <span className="rounded-md border border-[#d9e2ec] px-3 py-1 text-xs text-gray-600">
              {projects.length}
            </span>
          </div>

          <div className="mt-4 divide-y divide-gray-100">
            {projects.length > 0 ? (
              projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => onOpenProject(project.id)}
                  className="grid w-full gap-3 py-4 text-left text-sm transition hover:bg-[#f6f8fb] sm:grid-cols-[1.4fr_1fr_1fr]"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-black">
                      {project.projectName}
                    </p>
                    <p className="mt-1 truncate text-gray-500">
                      {project.address}, {project.city}
                    </p>
                  </div>
                  <span className="text-gray-600">{project.trade}</span>
                  <span className="font-medium">{project.status}</span>
                </button>
              ))
            ) : (
              <p className="py-6 text-sm text-gray-500">
                No connected projects yet.
              </p>
            )}
          </div>
        </section>

        <section className="mt-4 rounded-lg border border-[#d9e2ec] bg-white p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-black">
                Connected Quotes
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Quotes created for this customer.
              </p>
            </div>
            <span className="rounded-md border border-[#d9e2ec] px-3 py-1 text-xs text-gray-600">
              {quotes.length}
            </span>
          </div>

          <div className="mt-4 divide-y divide-gray-100">
            {quotes.length > 0 ? (
              quotes.map((quote) => {
                const selected = getSelectedQuote(quote);
                return (
                  <button
                    key={quote.id}
                    onClick={() => onOpenQuote(quote.id)}
                    className="grid w-full gap-3 py-4 text-left text-sm transition hover:bg-[#f6f8fb] sm:grid-cols-[1.3fr_1fr_1fr_1fr]"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-black">
                        {quote.projectName}
                      </p>
                      <p className="mt-1 text-gray-500">
                        {quote.selectedOption} · {quote.status}
                      </p>
                    </div>
                    <span>{formatMoney(selected.salePrice)}</span>
                    <span>{formatMoney(selected.profit)}</span>
                    <span>{formatMargin(selected.margin)}</span>
                  </button>
                );
              })
            ) : (
              <p className="py-6 text-sm text-gray-500">
                No connected quotes yet.
              </p>
            )}
          </div>
        </section>

        {/* Delete contact */}
        <div className="mt-6">
          {confirmDelete ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-800">Delete this contact?</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-red-800">
                <li>
                  <strong>{projects.length}</strong> project
                  {projects.length === 1 ? "" : "s"} will be unlinked (contact removed from those
                  jobs).
                </li>
                <li>
                  <strong>{quotes.length}</strong> quote
                  {quotes.length === 1 ? "" : "s"} stay in the app; open each proposal if you need to
                  change the customer link.
                </li>
                <li>This cannot be undone.</li>
              </ul>
              {deleteErr ? (
                <p className="mt-2 text-xs font-medium text-red-700">{deleteErr}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={deleteWorking}
                  onClick={async () => {
                    setDeleteErr(null);
                    setDeleteWorking(true);
                    try {
                      await onDelete();
                      setConfirmDelete(false);
                    } catch (e) {
                      setDeleteErr(
                        e instanceof Error ? e.message : "Could not delete contact"
                      );
                    } finally {
                      setDeleteWorking(false);
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {deleteWorking ? "Deleting…" : "Yes, delete"}
                </button>
                <button
                  type="button"
                  disabled={deleteWorking}
                  onClick={() => {
                    setConfirmDelete(false);
                    setDeleteErr(null);
                  }}
                  className="rounded-md border border-[#d9e2ec] bg-white px-4 py-2 text-xs transition hover:bg-[#f6f8fb]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setDeleteErr(null);
                setConfirmDelete(true);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 py-2.5 text-xs font-medium text-red-500 transition hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Contact
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}

function getContactProjects(contact: Contact, projects: Project[]) {
  return projects.filter((project) => {
    if (project.contactId === contact.id) return true;
    const nameMatch = sameText(project.customerName, contact.name);
    const emailMatch =
      Boolean(contact.email) && Boolean(project.customerEmail) && sameText(project.customerEmail, contact.email);
    const phoneMatch =
      Boolean(contact.phone) && Boolean(project.customerPhone) && samePhone(project.customerPhone, contact.phone);

    return nameMatch || emailMatch || phoneMatch;
  });
}

function getContactQuotes(contact: Contact, quotes: Quote[]) {
  return quotes.filter(
    (quote) =>
      quote.contactId === contact.id ||
      sameText(quote.customerName, contact.name) ||
      (Boolean(contact.email) && sameText(quote.customerEmail ?? "", contact.email)) ||
      (Boolean(contact.phone) && Boolean(quote.customerPhone) && samePhone(quote.customerPhone ?? "", contact.phone))
  );
}

function getSelectedQuote(quote: Quote) {
  if (quote.selectedOption === "Good") return quote.good;
  if (quote.selectedOption === "Better") return quote.better;
  return quote.best;
}

function sameText(left: string, right: string) {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function samePhone(left: string, right: string) {
  const digits = (s: string) => s.replace(/\D/g, "");
  return digits(left) === digits(right) && digits(left).length > 0;
}

function DetailBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#d9e2ec] bg-white p-5 text-sm">
      <p className="text-gray-500">{label}</p>
      <p className="mt-2 font-medium text-black">{value}</p>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-md border border-[#d9e2ec] px-4 py-3 text-sm outline-none transition focus:border-[#ff5c35]"
      />
    </label>
  );
}
