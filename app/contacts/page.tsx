"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, Mail, MapPin, Pencil, Phone, Plus, Trash2, X } from "lucide-react";
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
  leadStage: "New",
  leadSource: "",
  nextFollowUpAt: "",
  owner: "",
};

type ContactsPageCache = {
  contacts: Contact[];
  projects: Project[];
  quotes: Quote[];
};

let contactsPageCache: ContactsPageCache | null = null;

export default function ContactsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [contacts, setContacts] = useState<Contact[]>(() => contactsPageCache?.contacts ?? []);
  const [projects, setProjects] = useState<Project[]>(() => contactsPageCache?.projects ?? []);
  const [quotes, setQuotes] = useState<Quote[]>(() => contactsPageCache?.quotes ?? []);
  const [isLoading, setIsLoading] = useState(() => !contactsPageCache);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<ContactForm>(emptyContact);
  const [error, setError] = useState("");
  const [showCreateDrawer, setShowCreateDrawer] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(
    () =>
      typeof window === "undefined"
        ? null
        : new URLSearchParams(window.location.search).get("contactId")
  );

  const loadData = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = Boolean(opts?.silent);
    const shouldBlock = !silent && !contactsPageCache;
    if (!silent) {
      if (shouldBlock) setIsLoading(true);
      setLoadError(null);
    }
    try {
      const [dbContacts, dbProjects, dbQuotes] = await Promise.all([
        listContacts(supabase),
        listProjects(supabase),
        listQuotes(supabase),
      ]);
      setContacts(dbContacts);
      setProjects(dbProjects);
      setQuotes(dbQuotes);
      contactsPageCache = {
        contacts: dbContacts,
        projects: dbProjects,
        quotes: dbQuotes,
      };
    } catch (e) {
      if (!silent) {
        setLoadError(e instanceof Error ? e.message : "Failed to load");
      }
    } finally {
      if (shouldBlock) {
        setIsLoading(false);
      }
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
    void (async () => {
      try {
        await upsertContact(supabase, next);
        await loadData({ silent: true });
        setForm(emptyContact);
        setError("");
        setShowCreateDrawer(false);
      } catch {
        setContacts((current) => current.filter((c) => c.id !== next.id));
        setError("Could not save contact. Try again.");
      }
    })();
  }

  function updateContact(updated: Contact) {
    setContacts((current) => current.map((c) => (c.id === updated.id ? updated : c)));
    void (async () => {
      try {
        await upsertContact(supabase, updated);
        await loadData({ silent: true });
      } catch {
        await loadData({ silent: true });
      }
    })();
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
    await loadData({ silent: true });
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
    <div className="min-h-screen bg-[var(--page-bg)] lg:flex">
      <AppSidebar />

      <main className="min-w-0 flex-1 overflow-auto p-5 pb-24 sm:p-8 sm:pb-24 lg:p-10">
        <div className="w-full">
          <header className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
            <div>
              <p className="page-kicker text-xs font-semibold uppercase tracking-[0.14em]">Contacts</p>
              <h2 className="page-title mt-2 text-[2rem] font-semibold tracking-tight sm:text-[2.4rem]">
                Contacts
              </h2>
              <p className="page-description mt-3 max-w-3xl text-sm leading-6">
                Store basic customer information before connecting projects and
                proposals to a full CRM later.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setForm(emptyContact);
                setError("");
                setShowCreateDrawer(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand-accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--brand-accent-hover)]"
            >
              <Plus className="h-4 w-4" />
              Create Contact
            </button>
          </header>

          <div className="mt-8">
            <section>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search contacts"
                className="w-full rounded-lg border border-[#d9e2ec] px-4 py-3.5 text-sm outline-none transition focus:border-[#ff5c35]"
              />

              {/* Mobile cards */}
              <div className="mt-4 space-y-2 sm:hidden">
                {filteredContacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => setSelectedContactId(contact.id)}
                    className="w-full elevated-panel rounded-lg border border-[#d9e2ec] bg-white dark:border-slate-600 p-4 text-left transition hover:bg-[#f6f8fb]"
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
              <div className="mt-5 hidden overflow-x-auto elevated-panel rounded-xl border border-[#d9e2ec] bg-white dark:border-slate-600 sm:block">
                <div className="grid min-w-220 grid-cols-[1.1fr_1.4fr_0.8fr_1fr_0.9fr_1.2fr] gap-4 border-b border-[#d9e2ec] bg-[#f6f8fb] px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                  <span>Name</span>
                  <span>Address</span>
                  <span>Lead</span>
                  <span>Type</span>
                  <span>Phone</span>
                  <span>Email</span>
                </div>
                <div className="min-w-220 divide-y divide-gray-100">
                  {filteredContacts.map((contact) => (
                    <button
                      key={contact.id}
                      onClick={() => setSelectedContactId(contact.id)}
                      className="grid w-full grid-cols-[1.1fr_1.4fr_0.8fr_1fr_0.9fr_1.2fr] items-center gap-4 px-6 py-4 text-left text-sm transition hover:bg-[#f6f8fb]"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-black">{contact.name}</p>
                      </div>
                      <span className="truncate text-gray-600">{contact.address || "No address"}</span>
                      <span className="inline-flex w-fit rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                        {contact.leadStage}
                      </span>
                      <span className="inline-flex w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {contact.customerType}
                      </span>
                      <span className="text-gray-600">{contact.phone || "No phone"}</span>
                      <span className="truncate text-gray-600">{contact.email || "No email"}</span>
                    </button>
                  ))}
                </div>
              </div>

              {filteredContacts.length === 0 ? (
                <div className="mt-5 elevated-panel rounded-lg border border-[#d9e2ec] bg-white dark:border-slate-600 p-10 text-center">
                  <p className="font-semibold tracking-tight">
                    {contacts.length === 0 ? t("emptyContacts") : "No contacts match your search"}
                  </p>
                  <p className="mt-2 text-sm text-gray-500">
                    {contacts.length === 0
                      ? t("emptyContactsHint")
                      : "Try a different search."}
                  </p>
                  {contacts.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setForm(emptyContact);
                        setError("");
                        setShowCreateDrawer(true);
                      }}
                      className="mt-4 rounded-lg bg-[var(--brand-accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--brand-accent-hover)]"
                    >
                      Create your first contact
                    </button>
                  ) : null}
                </div>
              ) : null}
            </section>
          </div>
        </div>
      </main>

      {showCreateDrawer && (
        <div
          className="fixed inset-0 z-50 bg-[#213343]/35 backdrop-blur-sm"
          onClick={() => setShowCreateDrawer(false)}
        >
          <aside
            onClick={(event) => event.stopPropagation()}
            className="ml-auto flex h-full w-full max-w-xl flex-col border-l border-[#d9e2ec] bg-white shadow-2xl dark:border-slate-600"
          >
            <div className="flex items-start justify-between border-b border-[#d9e2ec] px-6 py-5">
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-[#213343]">
                  Create Contact
                </h3>
                <p className="mt-0.5 text-sm text-gray-500">
                  Add customer details before linking projects and proposals.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateDrawer(false)}
                className="rounded-md p-1.5 text-gray-400 transition hover:bg-[#f6f8fb] hover:text-black"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid flex-1 gap-4 overflow-auto px-6 py-5">
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
                Lead stage
                <select
                  value={form.leadStage}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      leadStage: event.target.value as Contact["leadStage"],
                    })
                  }
                  className="mt-2 w-full rounded-md border border-[#d9e2ec] bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-[#ff5c35]"
                >
                  <option>New</option>
                  <option>Qualified</option>
                  <option>Proposal Sent</option>
                  <option>Negotiation</option>
                  <option>Won</option>
                  <option>Lost</option>
                </select>
              </label>
              <TextField
                label="Lead source"
                value={form.leadSource ?? ""}
                onChange={(value) => setForm({ ...form, leadSource: value })}
              />
              <TextField
                label="Owner"
                value={form.owner ?? ""}
                onChange={(value) => setForm({ ...form, owner: value })}
              />
              <TextField
                label="Next follow-up"
                value={form.nextFollowUpAt ?? ""}
                onChange={(value) => setForm({ ...form, nextFollowUpAt: value })}
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
                  className="mt-2 w-full rounded-md border border-[#d9e2ec] bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-[#ff5c35]"
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
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
            </div>

            <div className="sticky bottom-0 flex justify-end gap-3 border-t border-[#d9e2ec] bg-white px-6 py-4">
              <button
                type="button"
                onClick={() => setShowCreateDrawer(false)}
                className="rounded-md border border-[#d9e2ec] px-4 py-2.5 text-sm font-medium text-neutral-900 transition hover:bg-[#f6f8fb]"
              >
                Cancel
              </button>
              <button
                onClick={createContact}
                className="rounded-lg bg-[#ff5c35] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e94820]"
              >
                Create Contact
              </button>
            </div>
          </aside>
        </div>
      )}

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
            router.push(`/projects?projectId=${projectId}&projectTab=costs`)
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
  const [recordsTab, setRecordsTab] = useState<"projects" | "proposals">("projects");
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
        className="elevated-panel ml-auto h-full w-full overflow-auto border-l border-[#d9e2ec] bg-white p-5 sm:p-6 dark:border-slate-600 lg:w-1/2"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="min-w-0">
              <h3 className="truncate text-2xl font-semibold tracking-tight">
                {contact.name}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#e6f4ea] px-2.5 py-0.5 text-xs font-semibold text-[#067647]">
                  {contact.customerType}
                </span>
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                {contact.leadStage}
              </span>
                <span className="text-xs text-gray-500">Created {contact.createdAt}</span>
              </div>
            </div>
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
              Lead stage
              <select
                value={draft.leadStage}
                onChange={(e) => setDraft({ ...draft, leadStage: e.target.value as Contact["leadStage"] })}
                className="mt-2 w-full rounded-md border border-[#d9e2ec] bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-[#ff5c35]"
              >
                <option>New</option>
                <option>Qualified</option>
                <option>Proposal Sent</option>
                <option>Negotiation</option>
                <option>Won</option>
                <option>Lost</option>
              </select>
            </label>
            <TextField label="Lead source" value={draft.leadSource ?? ""} onChange={(v) => setDraft({ ...draft, leadSource: v })} />
            <TextField label="Owner" value={draft.owner ?? ""} onChange={(v) => setDraft({ ...draft, owner: v })} />
            <TextField label="Next follow-up" value={draft.nextFollowUpAt ?? ""} onChange={(v) => setDraft({ ...draft, nextFollowUpAt: v })} />
            <label className="block text-sm font-medium">
              Customer Type
              <select
                value={draft.customerType}
                onChange={(e) => setDraft({ ...draft, customerType: e.target.value as Contact["customerType"] })}
                className="mt-2 w-full rounded-md border border-[#d9e2ec] bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-[#ff5c35]"
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
          <section className="mt-6 space-y-3">
              <ContactInfoRow
                icon={<Building2 className="h-4 w-4 text-gray-400" />}
                value={contact.customerType}
              />
              <ContactInfoRow
                icon={<Building2 className="h-4 w-4 text-gray-400" />}
                value={`Lead: ${contact.leadStage}`}
              />
              <ContactInfoRow
                icon={<Building2 className="h-4 w-4 text-gray-400" />}
                value={`Owner: ${contact.owner || "Unassigned"}`}
              />
              <ContactInfoRow
                icon={<Building2 className="h-4 w-4 text-gray-400" />}
                value={`Follow-up: ${contact.nextFollowUpAt || "Not set"}`}
              />
              <ContactInfoRow
                icon={<Mail className="h-4 w-4 text-gray-400" />}
                value={contact.email || "No email"}
              />
              <ContactInfoRow
                icon={<Phone className="h-4 w-4 text-gray-400" />}
                value={contact.phone || "No phone"}
              />
              <ContactInfoRow
                icon={<MapPin className="h-4 w-4 text-gray-400" />}
                value={contact.address || "No address"}
              />
          </section>
        )}

        {!isEditing && (
          <section className="mt-4 elevated-panel rounded-lg border border-[#d9e2ec] bg-white dark:border-slate-600 p-5">
            <p className="text-sm font-medium text-black">Notes</p>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              {contact.notes || "No notes yet."}
            </p>
          </section>
        )}

        <section className="mt-4 elevated-panel rounded-lg border border-[#d9e2ec] bg-white dark:border-slate-600 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-md border border-[#d9e2ec] bg-white p-1">
              <button
                type="button"
                onClick={() => setRecordsTab("projects")}
                className={`rounded px-3 py-1.5 text-xs font-medium transition ${
                  recordsTab === "projects"
                    ? "bg-[#213343] text-white"
                    : "text-gray-600 hover:bg-[#f6f8fb]"
                }`}
              >
                Projects ({projects.length})
              </button>
              <button
                type="button"
                onClick={() => setRecordsTab("proposals")}
                className={`rounded px-3 py-1.5 text-xs font-medium transition ${
                  recordsTab === "proposals"
                    ? "bg-[#213343] text-white"
                    : "text-gray-600 hover:bg-[#f6f8fb]"
                }`}
              >
                Proposals ({quotes.length})
              </button>
            </div>
            <p className="text-xs text-gray-500">
              {recordsTab === "projects"
                ? "Projects assigned or matched to this customer."
                : "Proposals created for this customer."}
            </p>
          </div>

          {recordsTab === "projects" ? (
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
                    <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${projectStatusPill(project.status)}`}>
                      {project.status}
                    </span>
                  </button>
                ))
              ) : (
                <p className="py-6 text-sm text-gray-500">
                  No connected projects yet.
                </p>
              )}
            </div>
          ) : (
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
                  No connected proposals yet.
                </p>
              )}
            </div>
          )}
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
                  <strong>{quotes.length}</strong> proposal
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

function projectStatusPill(status: Project["status"]) {
  if (status === "Planned") return "bg-blue-50 text-blue-700";
  if (status === "In Progress") return "bg-indigo-50 text-indigo-700";
  if (status === "Completed") return "bg-green-50 text-green-700";
  if (status === "On Hold") return "bg-amber-50 text-amber-700";
  if (status === "Cancelled") return "bg-red-50 text-red-700";
  if (status === "Won") return "bg-green-50 text-green-700";
  if (status === "Lost") return "bg-red-50 text-red-700";
  if (status === "Quoted") return "bg-blue-50 text-blue-700";
  return "bg-slate-100 text-slate-700";
}

function ContactInfoRow({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-700">
      {icon}
      <span>{value}</span>
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
        className="mt-2 w-full rounded-md border border-[#d9e2ec] bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-[#ff5c35]"
      />
    </label>
  );
}
