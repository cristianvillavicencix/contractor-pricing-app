"use client";

import type {
  BeforeAfterBlockData,
  CTASectionBlockData,
  FAQBlockData,
  FinancingBlockData,
  GalleryGridBlockData,
  TeamBlockData,
  TestimonialBlockData,
} from "@/types/proposal-blocks";
import { AssetPicker } from "../AssetPicker";

const label: React.CSSProperties = { display: "block", fontSize: 11.5, fontWeight: 800, color: "#6b7280", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 5 };
const input: React.CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", fontSize: 13.5, color: "#111827", outline: "none", boxSizing: "border-box" };
const stack: React.CSSProperties = { display: "grid", gap: 14 };

function TextField({ label: l, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <div><label style={label}>{l}</label><input style={input} value={value} onChange={(e) => onChange(e.target.value)} /></div>;
}

function TextArea({ label: l, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <div><label style={label}>{l}</label><textarea style={{ ...input, minHeight: 90, resize: "vertical", fontFamily: "inherit" }} value={value} onChange={(e) => onChange(e.target.value)} /></div>;
}

export function TestimonialSettings({ data, onChange }: { data: TestimonialBlockData & { type: "testimonial" }; onChange: (d: TestimonialBlockData & { type: "testimonial" }) => void }) {
  const upd = (p: Partial<TestimonialBlockData>) => onChange({ ...data, ...p });
  return <div style={stack}><TextArea label="Quote" value={data.quote} onChange={(v) => upd({ quote: v })} /><TextField label="Author" value={data.author} onChange={(v) => upd({ author: v })} /><TextField label="Role" value={data.role ?? ""} onChange={(v) => upd({ role: v })} /><AssetPicker category="Gallery Images" value={data.photoUrl} onSelect={(url) => upd({ photoUrl: url })} /></div>;
}

export function BeforeAfterSettings({ data, onChange }: { data: BeforeAfterBlockData & { type: "before_after" }; onChange: (d: BeforeAfterBlockData & { type: "before_after" }) => void }) {
  const upd = (p: Partial<BeforeAfterBlockData>) => onChange({ ...data, ...p });
  return <div style={stack}><TextField label="Before URL" value={data.beforeUrl ?? ""} onChange={(v) => upd({ beforeUrl: v })} /><AssetPicker category="Gallery Images" value={data.beforeUrl} onSelect={(url) => upd({ beforeUrl: url })} /><TextField label="After URL" value={data.afterUrl ?? ""} onChange={(v) => upd({ afterUrl: v })} /><AssetPicker category="Gallery Images" value={data.afterUrl} onSelect={(url) => upd({ afterUrl: url })} /><TextField label="Caption" value={data.caption ?? ""} onChange={(v) => upd({ caption: v })} /></div>;
}

export function TeamSettings({ data, onChange }: { data: TeamBlockData & { type: "team" }; onChange: (d: TeamBlockData & { type: "team" }) => void }) {
  const first = data.members[0] ?? { name: "", role: "" };
  const updMember = (p: Partial<typeof first>) => onChange({ ...data, members: [{ ...first, ...p }, ...data.members.slice(1)] });
  return <div style={stack}><TextField label="Headline" value={data.headline} onChange={(v) => onChange({ ...data, headline: v })} /><TextField label="Lead name" value={first.name} onChange={(v) => updMember({ name: v })} /><TextField label="Role" value={first.role} onChange={(v) => updMember({ role: v })} /><TextArea label="Bio" value={first.bio ?? ""} onChange={(v) => updMember({ bio: v })} /><AssetPicker category="Gallery Images" value={first.photoUrl} onSelect={(url) => updMember({ photoUrl: url })} /></div>;
}

export function FAQSettings({ data, onChange }: { data: FAQBlockData & { type: "faq" }; onChange: (d: FAQBlockData & { type: "faq" }) => void }) {
  const first = data.items[0] ?? { question: "", answer: "" };
  return <div style={stack}><TextField label="Question" value={first.question} onChange={(v) => onChange({ ...data, items: [{ ...first, question: v }, ...data.items.slice(1)] })} /><TextArea label="Answer" value={first.answer} onChange={(v) => onChange({ ...data, items: [{ ...first, answer: v }, ...data.items.slice(1)] })} /></div>;
}

export function FinancingSettings({ data, onChange }: { data: FinancingBlockData & { type: "financing" }; onChange: (d: FinancingBlockData & { type: "financing" }) => void }) {
  const upd = (p: Partial<FinancingBlockData>) => onChange({ ...data, ...p });
  return <div style={stack}><TextField label="Headline" value={data.headline} onChange={(v) => upd({ headline: v })} /><TextArea label="Description" value={data.description} onChange={(v) => upd({ description: v })} /><TextField label="Monthly payment" value={data.monthlyPayment ?? ""} onChange={(v) => upd({ monthlyPayment: v })} /><TextField label="Terms" value={data.terms ?? ""} onChange={(v) => upd({ terms: v })} /></div>;
}

export function GallerySettings({ data, onChange }: { data: GalleryGridBlockData & { type: "gallery_grid" }; onChange: (d: GalleryGridBlockData & { type: "gallery_grid" }) => void }) {
  const first = data.images[0] ?? { src: "" };
  return <div style={stack}><TextField label="Image URL" value={first.src} onChange={(v) => onChange({ ...data, images: [{ ...first, src: v }, ...data.images.slice(1)] })} /><AssetPicker category="Gallery Images" value={first.src} onSelect={(url) => onChange({ ...data, images: [{ ...first, src: url }, ...data.images.slice(1)] })} /><TextField label="Caption" value={first.caption ?? ""} onChange={(v) => onChange({ ...data, images: [{ ...first, caption: v }, ...data.images.slice(1)] })} /></div>;
}

export function CTASettings({ data, onChange }: { data: CTASectionBlockData & { type: "cta" }; onChange: (d: CTASectionBlockData & { type: "cta" }) => void }) {
  const upd = (p: Partial<CTASectionBlockData>) => onChange({ ...data, ...p });
  return <div style={stack}><TextField label="Headline" value={data.headline} onChange={(v) => upd({ headline: v })} /><TextArea label="Body" value={data.body} onChange={(v) => upd({ body: v })} /><TextField label="Button label" value={data.buttonLabel ?? ""} onChange={(v) => upd({ buttonLabel: v })} /><TextField label="Button URL" value={data.buttonUrl ?? ""} onChange={(v) => upd({ buttonUrl: v })} /></div>;
}
