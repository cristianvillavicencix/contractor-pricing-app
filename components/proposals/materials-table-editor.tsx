"use client";

import { useState } from "react";
import { Edit3, Plus, Trash2 } from "lucide-react";
import type { MaterialItem } from "@/lib/proposal-templates";

export function MaterialsTableEditor({
  items,
  onChange,
  title = "Materials table rows",
}: {
  items: MaterialItem[];
  onChange: (items: MaterialItem[]) => void;
  /** Shown above the list (e.g. Good / Better / Best). */
  title?: string;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<MaterialItem | null>(null);
  const [adding, setAdding] = useState(false);
  const [newDraft, setNewDraft] = useState<Omit<MaterialItem, "id">>({
    category: "",
    product: "",
    brand: "",
    warranty: "",
    notes: "",
  });

  function startEdit(item: MaterialItem) {
    setEditingId(item.id);
    setDraft({ ...item });
  }

  function commitEdit() {
    if (!editingId || !draft) return;
    onChange(items.map((item) => (item.id === editingId ? draft : item)));
    setEditingId(null);
    setDraft(null);
  }

  function removeItem(id: string) {
    onChange(items.filter((item) => item.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setDraft(null);
    }
  }

  function addItem() {
    if (!newDraft.product.trim()) return;
    const id = Math.random().toString(36).slice(2, 8);
    onChange([...items, { id, ...newDraft }]);
    setNewDraft({ category: "", product: "", brand: "", warranty: "", notes: "" });
    setAdding(false);
  }

  const FIELDS: Array<{ key: keyof Omit<MaterialItem, "id">; placeholder: string }> = [
    { key: "category", placeholder: "Category" },
    { key: "product", placeholder: "Product" },
    { key: "brand", placeholder: "Brand" },
    { key: "warranty", placeholder: "Warranty" },
    { key: "notes", placeholder: "Notes" },
  ];

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium">{title}</p>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={item.id} className="overflow-hidden rounded border border-[#d9e2ec]">
            {editingId === item.id && draft ? (
              <div className="space-y-1.5 p-2">
                {FIELDS.map(({ key, placeholder }) => (
                  <input
                    key={key}
                    value={draft[key]}
                    onChange={(e) => setDraft((d) => (d ? { ...d, [key]: e.target.value } : d))}
                    placeholder={placeholder}
                    className="w-full rounded border border-[#d9e2ec] px-2 py-1.5 text-xs outline-none focus:border-[#111111]"
                  />
                ))}
                <div className="flex justify-end gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setDraft(null);
                    }}
                    className="rounded border border-[#d9e2ec] px-3 py-1 text-xs transition hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={commitEdit}
                    className="rounded bg-[#111111] px-3 py-1 text-xs text-white transition hover:bg-[#333]"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-2 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-[#213343]">
                    {item.category}
                    {item.product ? ` — ${item.product}` : ""}
                  </p>
                  <p className="truncate text-[10px] text-gray-400">
                    {[item.brand, item.warranty].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex shrink-0 gap-0.5">
                  <button
                    type="button"
                    onClick={() => startEdit(item)}
                    className="rounded p-1 text-gray-400 transition hover:bg-[#f6f8fb] hover:text-[#213343]"
                  >
                    <Edit3 className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="rounded p-1 text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      {adding ? (
        <div className="mt-2 space-y-1.5 rounded border border-[#d9e2ec] p-2">
          {FIELDS.map(({ key, placeholder }) => (
            <input
              key={key}
              value={newDraft[key]}
              onChange={(e) => setNewDraft((d) => ({ ...d, [key]: e.target.value }))}
              placeholder={placeholder}
              className="w-full rounded border border-[#d9e2ec] px-2 py-1.5 text-xs outline-none focus:border-[#111111]"
            />
          ))}
          <div className="flex justify-end gap-1.5 pt-0.5">
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="rounded border border-[#d9e2ec] px-3 py-1 text-xs transition hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={addItem}
              disabled={!newDraft.product.trim()}
              className="rounded bg-[#111111] px-3 py-1 text-xs text-white transition hover:bg-[#333] disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded border border-dashed border-[#d9e2ec] py-1.5 text-xs text-gray-400 transition hover:border-[#111111] hover:text-[#111111]"
        >
          <Plus className="h-3 w-3" />
          Add row
        </button>
      )}
    </div>
  );
}
