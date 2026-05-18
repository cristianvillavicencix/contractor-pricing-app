"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, GripVertical } from "lucide-react";

export type SidebarSection = {
  id: string;
  label: string;
  icon: string;
  visible: boolean;
};

export const DEFAULT_SECTIONS: SidebarSection[] = [
  { id: "cover",                label: "Cover",                  icon: "🏠", visible: true },
  { id: "executiveSummary",     label: "Executive Summary",      icon: "📋", visible: true },
  { id: "existingConditions",   label: "Existing Conditions",    icon: "🔍", visible: true },
  { id: "scopeOfWork",          label: "Scope of Work",          icon: "🔧", visible: true },
  { id: "materialsSpecs",       label: "Materials & Specs",      icon: "📦", visible: true },
  { id: "timeline",             label: "Timeline",               icon: "📅", visible: true },
  { id: "pricing",              label: "Investment Options",     icon: "💰", visible: true },
  { id: "warranty",             label: "Warranty",               icon: "🛡️", visible: true },
  { id: "terms",                label: "Terms & Conditions",     icon: "📄", visible: true },
  { id: "acceptance",           label: "Acceptance",             icon: "✍️", visible: true },
];

type Props = {
  documentRef: React.RefObject<HTMLDivElement | null>;
  sections: SidebarSection[];
  onToggleVisible: (id: string) => void;
  onReorder: (sections: SidebarSection[]) => void;
};

export function SectionsSidebar({ documentRef, sections, onToggleVisible, onReorder }: Props) {
  const [activeId, setActiveId] = useState<string>("cover");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Track active section via IntersectionObserver
  useEffect(() => {
    const doc = documentRef.current;
    if (!doc) return;

    observerRef.current?.disconnect();

    const targets = new Map<Element, string>();

    // Observe the cover block
    const cover = doc.querySelector(".proposal-cover");
    if (cover) targets.set(cover, "cover");

    // Observe each section heading
    sections.forEach(({ id }) => {
      if (id === "cover") return;
      const el = doc.querySelector(`#section-${id}`);
      if (el) targets.set(el, id);
    });

    const visible = new Map<string, number>(); // id → intersectionRatio

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const id = targets.get(e.target);
          if (!id) return;
          if (e.isIntersecting) visible.set(id, e.intersectionRatio);
          else visible.delete(id);
        });
        if (visible.size > 0) {
          // Highest ratio = most visible
          const best = [...visible.entries()].sort((a, b) => b[1] - a[1])[0][0];
          setActiveId(best);
        }
      },
      { root: doc.closest(".proposal-scroll-area"), threshold: [0, 0.1, 0.5, 1] }
    );

    targets.forEach((_, el) => observerRef.current!.observe(el));

    return () => observerRef.current?.disconnect();
  }, [sections, documentRef]);

  function scrollTo(id: string) {
    const doc = documentRef.current;
    if (!doc) return;
    const el =
      id === "cover"
        ? doc.querySelector(".proposal-cover")
        : doc.querySelector(`#section-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveId(id);
  }

  // Drag-to-reorder
  function onDragStart(i: number) { setDragIndex(i); }
  function onDragOver(e: React.DragEvent, i: number) {
    e.preventDefault();
    setDragOverIndex(i);
  }
  function onDrop(i: number) {
    if (dragIndex === null || dragIndex === i) { reset(); return; }
    const next = [...sections];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(i, 0, moved);
    onReorder(next);
    reset();
  }
  function reset() { setDragIndex(null); setDragOverIndex(null); }

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
          Sections
        </p>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {sections.map((sec, i) => {
          const isActive = activeId === sec.id;
          const isDragging = dragIndex === i;
          const isDragOver = dragOverIndex === i && dragIndex !== i;

          return (
            <div
              key={sec.id}
              draggable
              onDragStart={() => onDragStart(i)}
              onDragOver={(e) => onDragOver(e, i)}
              onDrop={() => onDrop(i)}
              onDragEnd={reset}
              className={`group flex cursor-pointer items-center gap-1.5 px-2 py-1.5 transition
                ${isActive ? "bg-[#213343]/8" : "hover:bg-gray-50"}
                ${isDragging ? "opacity-40" : ""}
                ${isDragOver ? "border-t-2 border-[#213343]" : ""}
              `}
            >
              {/* Drag handle */}
              <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-gray-300 opacity-0 group-hover:opacity-100" />

              {/* Section name */}
              <button
                type="button"
                onClick={() => scrollTo(sec.id)}
                className={`flex flex-1 items-center gap-2 text-left text-xs
                  ${isActive ? "font-semibold text-[#213343]" : "font-medium text-gray-600"}
                  ${!sec.visible ? "opacity-40 line-through" : ""}
                `}
              >
                <span className="text-[13px]">{sec.icon}</span>
                <span className="leading-tight">{sec.label}</span>
              </button>

              {/* Active indicator */}
              {isActive && (
                <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#213343]" />
              )}

              {/* Toggle visibility */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onToggleVisible(sec.id); }}
                className="shrink-0 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-[#213343] transition"
                title={sec.visible ? "Hide section" : "Show section"}
              >
                {sec.visible
                  ? <Eye className="h-3.5 w-3.5" />
                  : <EyeOff className="h-3.5 w-3.5" />
                }
              </button>
            </div>
          );
        })}
      </div>

      <div className="border-t border-gray-100 px-3 py-2 text-[10px] text-gray-400">
        Drag to reorder · Click eye to hide
      </div>
    </aside>
  );
}
