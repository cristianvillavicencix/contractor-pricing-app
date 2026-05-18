"use client";

import type { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Undo,
  Redo,
  Highlighter,
  Link2,
  Minus,
} from "lucide-react";

type Props = { editor: Editor | null };

function Divider() {
  return <div className="h-5 w-px bg-gray-200 mx-1" />;
}

function Btn({
  onClick,
  active,
  title,
  children,
  disabled,
}: {
  onClick: () => void;
  active?: boolean;
  title?: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      title={title}
      disabled={disabled}
      className={`flex h-7 w-7 items-center justify-center rounded text-sm transition
        ${active ? "bg-[#213343] text-white" : "text-gray-600 hover:bg-gray-100"}
        ${disabled ? "opacity-30 cursor-not-allowed" : ""}
      `}
    >
      {children}
    </button>
  );
}

function HeadingSelect({ editor }: { editor: Editor }) {
  const current =
    editor.isActive("heading", { level: 1 })
      ? "H1"
      : editor.isActive("heading", { level: 2 })
        ? "H2"
        : editor.isActive("heading", { level: 3 })
          ? "H3"
          : "¶";

  return (
    <select
      value={current}
      onChange={(e) => {
        const v = e.target.value;
        if (v === "H1") editor.chain().focus().toggleHeading({ level: 1 }).run();
        else if (v === "H2") editor.chain().focus().toggleHeading({ level: 2 }).run();
        else if (v === "H3") editor.chain().focus().toggleHeading({ level: 3 }).run();
        else editor.chain().focus().setParagraph().run();
      }}
      className="h-7 rounded border border-gray-200 bg-white px-1.5 text-xs font-medium text-gray-700 focus:outline-none"
    >
      <option value="¶">Normal</option>
      <option value="H1">Heading 1</option>
      <option value="H2">Heading 2</option>
      <option value="H3">Heading 3</option>
    </select>
  );
}

export function ProposalToolbar({ editor }: Props) {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-3 py-1.5">
      {/* History */}
      <Btn
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Undo"
      >
        <Undo className="h-3.5 w-3.5" />
      </Btn>
      <Btn
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Redo"
      >
        <Redo className="h-3.5 w-3.5" />
      </Btn>

      <Divider />

      {/* Style */}
      <HeadingSelect editor={editor} />

      <Divider />

      {/* Formatting */}
      <Btn
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        title="Bold (⌘B)"
      >
        <Bold className="h-3.5 w-3.5" />
      </Btn>
      <Btn
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        title="Italic (⌘I)"
      >
        <Italic className="h-3.5 w-3.5" />
      </Btn>
      <Btn
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive("underline")}
        title="Underline (⌘U)"
      >
        <Underline className="h-3.5 w-3.5" />
      </Btn>
      <Btn
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive("strike")}
        title="Strikethrough"
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </Btn>
      <Btn
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        active={editor.isActive("highlight")}
        title="Highlight"
      >
        <Highlighter className="h-3.5 w-3.5" />
      </Btn>

      <Divider />

      {/* Alignment */}
      <Btn
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        active={editor.isActive({ textAlign: "left" })}
        title="Align left"
      >
        <AlignLeft className="h-3.5 w-3.5" />
      </Btn>
      <Btn
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        active={editor.isActive({ textAlign: "center" })}
        title="Center"
      >
        <AlignCenter className="h-3.5 w-3.5" />
      </Btn>
      <Btn
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        active={editor.isActive({ textAlign: "right" })}
        title="Align right"
      >
        <AlignRight className="h-3.5 w-3.5" />
      </Btn>
      <Btn
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        active={editor.isActive({ textAlign: "justify" })}
        title="Justify"
      >
        <AlignJustify className="h-3.5 w-3.5" />
      </Btn>

      <Divider />

      {/* Lists */}
      <Btn
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        title="Bullet list"
      >
        <List className="h-3.5 w-3.5" />
      </Btn>
      <Btn
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        title="Numbered list"
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </Btn>

      <Divider />

      {/* Horizontal rule */}
      <Btn
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Divider"
      >
        <Minus className="h-3.5 w-3.5" />
      </Btn>

      {/* Text color */}
      <label title="Text color" className="flex h-7 w-7 cursor-pointer items-center justify-center rounded hover:bg-gray-100">
        <span className="text-[11px] font-bold" style={{ color: editor.getAttributes("textStyle").color || "#111" }}>A</span>
        <input
          type="color"
          className="sr-only"
          value={editor.getAttributes("textStyle").color || "#111111"}
          onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
        />
      </label>
    </div>
  );
}
