"use client";

import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Minus,
  Braces,
} from "lucide-react";
import type { RichTextBlockData } from "@/types/proposal-blocks";
import { PROPOSAL_VARIABLES, variableToken } from "@/lib/proposal-variables";

// ─── Hook ────────────────────────────────────────────────────────────────────
// Create and manage a Tiptap editor instance.
// Call this in any component that needs the editor — not inside conditionals.

export function useRichTextEditor(html: string, onChange: (html: string) => void) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
    ],
    content: html || "<p></p>",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  useEffect(() => {
    if (!editor) return;

    const nextHtml = html || "<p></p>";
    if (editor.getHTML() !== nextHtml) {
      editor.commands.setContent(nextHtml, { emitUpdate: false });
    }
  }, [editor, html]);

  return editor;
}

// ─── Toolbar ─────────────────────────────────────────────────────────────────
// Renders only the formatting buttons. Background is transparent so the
// caller controls the container color.

type BtnProps = {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
};

function Btn({ active, onClick, children, title }: BtnProps) {
  return (
    <button
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 28,
        height: 28,
        borderRadius: 5,
        border: "none",
        background: active ? "rgba(22,163,74,.18)" : "transparent",
        color: active ? "#4ade80" : "#d1d5db",
        cursor: "pointer",
        transition: "all .1s",
      }}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div style={{ width: 1, height: 16, background: "rgba(255,255,255,.15)", margin: "0 3px", alignSelf: "center" }} />;
}

export function RichTextToolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 1, padding: "5px 10px" }}>
      <Btn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold"><Bold size={13} strokeWidth={2.5} /></Btn>
      <Btn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic"><Italic size={13} /></Btn>
      <Btn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline"><UnderlineIcon size={13} /></Btn>
      <Sep />
      <Btn active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2"><Heading2 size={14} /></Btn>
      <Btn active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3"><Heading3 size={14} /></Btn>
      <Sep />
      <Btn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list"><List size={14} /></Btn>
      <Btn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list"><ListOrdered size={14} /></Btn>
      <Sep />
      <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal rule"><Minus size={14} /></Btn>
      <Sep />
      <select
        title="Insert variable"
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => {
          if (!e.target.value) return;
          editor.chain().focus().insertContent(variableToken(e.target.value)).run();
          e.currentTarget.value = "";
        }}
        style={{
          height: 28,
          borderRadius: 6,
          border: "1px solid rgba(255,255,255,.14)",
          background: "rgba(255,255,255,.06)",
          color: "#d1d5db",
          fontSize: 12,
          outline: "none",
        }}
      >
        <option value="">Variables</option>
        {PROPOSAL_VARIABLES.map((v) => <option key={v.key} value={v.key}>{v.label}</option>)}
      </select>
      <Btn onClick={() => editor.chain().focus().insertContent("{{client_name}}").run()} title="Insert client name"><Braces size={14} /></Btn>
    </div>
  );
}

// ─── Editor content area ──────────────────────────────────────────────────────
// Renders only the ProseMirror editing area (no toolbar).

export function RichTextEditorContent({ editor }: { editor: Editor | null }) {
  if (!editor) return null;
  return (
    <div
      style={{
        flex: 1,
        overflow: "auto",
        padding: "24px 32px",
        background: "#ffffff",
        cursor: "text",
        fontSize: 14,
        lineHeight: 1.75,
        color: "#111827",
      }}
      onClick={() => editor.commands.focus()}
    >
      <style>{`
        .blk-rt .ProseMirror { outline: none; min-height: 560px; }
        .blk-rt .ProseMirror p { margin: 0 0 12px; color: #374151; }
        .blk-rt .ProseMirror h2 { font-size: 1.2em; font-weight: 700; color: #111827; margin: 20px 0 10px; }
        .blk-rt .ProseMirror h3 { font-size: 1.05em; font-weight: 600; color: #1f2937; margin: 16px 0 8px; }
        .blk-rt .ProseMirror ul, .blk-rt .ProseMirror ol { padding-left: 22px; margin: 0 0 12px; }
        .blk-rt .ProseMirror li { margin-bottom: 5px; color: #374151; }
        .blk-rt .ProseMirror hr { border: none; border-top: 1px solid #e5e7eb; margin: 20px 0; }
        .blk-rt .ProseMirror p.is-editor-empty:first-child::before {
          content: "Start typing…";
          color: #d1d5db;
          pointer-events: none;
          float: left;
          height: 0;
        }
      `}</style>
      <div className="blk-rt">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

// ─── Combined component (backward-compatible) ─────────────────────────────────
// Used by BlockCanvas (panel editor) where toolbar lives inside the panel.

interface Props {
  data: { type: string; html: string };
  onChange: (html: string) => void;
}

export function RichTextBlock({ data, onChange }: Props) {
  const editor = useRichTextEditor(data.html, onChange);
  if (!editor) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, height: "100%" }}>
      {/* Toolbar — light styling when inside the canvas panel */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          padding: "5px 10px",
          borderBottom: "1px solid #f3f4f6",
          background: "#ffffff",
          flexShrink: 0,
        }}
      >
        <RichTextToolbar editor={editor} />
      </div>
      <RichTextEditorContent editor={editor} />
    </div>
  );
}

export type { RichTextBlockData };
