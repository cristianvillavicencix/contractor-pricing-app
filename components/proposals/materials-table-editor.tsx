"use client";

import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import type { MaterialItem } from "@/lib/proposal-templates";
import { getSignedUrlViaApi, uploadImageViaApi } from "@/lib/supabase/data";

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
  const [editorMode, setEditorMode] = useState<"add" | "edit" | null>(null);
  const [draft, setDraft] = useState<MaterialItem | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const FIELDS: Array<{ key: keyof Omit<MaterialItem, "id">; label: string; placeholder: string }> = [
    { key: "category", label: "Category", placeholder: "Category" },
    { key: "product", label: "Product", placeholder: "Product" },
    { key: "brand", label: "Brand", placeholder: "Brand" },
    { key: "warranty", label: "Warranty", placeholder: "Warranty" },
    { key: "notes", label: "Notes", placeholder: "Notes / specs / duration details" },
    { key: "imageUrl", label: "Image URL (optional)", placeholder: "Image URL (https://...)" },
  ];

  function openEdit(item: MaterialItem) {
    setEditorMode("edit");
    setDraft({ ...item });
  }

  function openAdd() {
    setEditorMode("add");
    setDraft({
      id: "",
      category: "",
      product: "",
      brand: "",
      warranty: "",
      notes: "",
      imageUrl: "",
      imagePath: "",
    });
  }

  function closeEditor() {
    setEditorMode(null);
    setDraft(null);
  }

  function saveDraft() {
    if (!draft || !draft.product.trim()) return;
    if (editorMode === "edit") {
      onChange(items.map((item) => (item.id === draft.id ? draft : item)));
    } else if (editorMode === "add") {
      const id = Math.random().toString(36).slice(2, 8);
      onChange([...items, { ...draft, id }]);
    }
    closeEditor();
  }

  function deleteItem(id: string) {
    onChange(items.filter((item) => item.id !== id));
    if (draft?.id === id && editorMode === "edit") {
      closeEditor();
    }
  }

  async function uploadMaterialImage(file: File): Promise<{ imagePath: string; imageUrl: string }> {
    const reader = new FileReader();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      reader.onload = () => {
        if (typeof reader.result === "string") resolve(reader.result);
        else reject(new Error("Invalid file data"));
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
    const ext = file.type.includes("png") ? "png" : file.type.includes("webp") ? "webp" : "jpg";
    const fileName = `settings-materials/${crypto.randomUUID()}.${ext}`;
    const { path } = await uploadImageViaApi({
      bucket: "proposal-photos",
      fileName,
      contentType: file.type || "image/jpeg",
      dataUrl,
    });
    const signed = await getSignedUrlViaApi({ bucket: "proposal-photos", path });
    return { imagePath: path, imageUrl: signed };
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium">{title}</p>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div
            key={item.id}
            role="button"
            tabIndex={0}
            onClick={() => openEdit(item)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openEdit(item);
              }
            }}
            className="flex w-full items-center gap-2 rounded border border-[#d9e2ec] px-2 py-2 text-left transition hover:bg-[#f6f8fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5c35]/40"
          >
            {item.imageUrl ? (
              <img src={item.imageUrl} alt="Material thumbnail" className="h-9 w-9 shrink-0 rounded object-cover" />
            ) : (
              <div className="h-9 w-9 shrink-0 rounded border border-dashed border-[#d9e2ec] bg-white" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-[#213343]">
                {[item.brand, item.product || item.category].filter(Boolean).join(" · ")}
              </p>
              <p className="truncate text-[10px] text-gray-400">
                {[item.category, item.warranty].filter(Boolean).join(" · ")}
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                deleteItem(item.id);
              }}
              className="rounded p-1 text-gray-400 transition hover:bg-red-50 hover:text-red-500"
              aria-label="Delete row"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={openAdd}
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded border border-dashed border-[#d9e2ec] py-1.5 text-xs text-gray-400 transition hover:border-[#111111] hover:text-[#111111]"
      >
        <Plus className="h-3 w-3" />
        Add row
      </button>

      {editorMode && draft ? (
        <div className="fixed inset-0 z-[70]">
          <button
            type="button"
            onClick={closeEditor}
            aria-label="Close editor"
            className="absolute inset-0 bg-[#213343]/35"
          />
          <aside className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col border-l border-[#d9e2ec] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#d9e2ec] px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Material editor</p>
                <h4 className="text-sm font-semibold text-[#213343]">
                  {editorMode === "add" ? "Add material row" : "Edit material row"}
                </h4>
              </div>
              <button
                type="button"
                onClick={closeEditor}
                className="rounded border border-[#d9e2ec] p-1.5 text-gray-500 transition hover:bg-[#f6f8fb]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {FIELDS.map(({ key, label, placeholder }) => (
                <label key={key} className="block text-xs font-medium text-gray-600">
                  {label}
                  {key === "notes" ? (
                    <textarea
                      value={draft[key] ?? ""}
                      onChange={(e) => setDraft((current) => (current ? { ...current, [key]: e.target.value } : current))}
                      placeholder={placeholder}
                      rows={3}
                      className="mt-1 w-full rounded border border-[#d9e2ec] px-2.5 py-2 text-xs outline-none transition focus:border-[#111111]"
                    />
                  ) : (
                    <input
                      value={draft[key] ?? ""}
                      onChange={(e) => setDraft((current) => (current ? { ...current, [key]: e.target.value } : current))}
                      placeholder={placeholder}
                      className="mt-1 w-full rounded border border-[#d9e2ec] px-2.5 py-2 text-xs outline-none transition focus:border-[#111111]"
                    />
                  )}
                </label>
              ))}

              <div className="rounded border border-[#d9e2ec] bg-[#f6f8fb] p-3">
                <p className="text-[11px] font-semibold text-gray-500">Material photo</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center rounded border border-[#d9e2ec] bg-white px-2.5 py-1.5 text-[11px] font-medium text-[#213343] transition hover:bg-[#eef3f7]">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingImage}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (!file) return;
                        const MAX_BYTES = 1.2 * 1024 * 1024;
                        if (file.size > MAX_BYTES) return;
                        setUploadingImage(true);
                        void uploadMaterialImage(file)
                          .then(({ imagePath, imageUrl }) =>
                            setDraft((current) =>
                              current ? { ...current, imagePath, imageUrl } : current
                            )
                          )
                          .finally(() => setUploadingImage(false));
                      }}
                    />
                    {uploadingImage ? "Uploading..." : "Upload image"}
                  </label>
                  {draft.imageUrl ? (
                    <button
                      type="button"
                      onClick={() => setDraft((current) => (current ? { ...current, imageUrl: "", imagePath: "" } : current))}
                      className="rounded border border-[#d9e2ec] bg-white px-2.5 py-1.5 text-[11px] text-gray-500 transition hover:bg-[#eef3f7]"
                    >
                      Remove image
                    </button>
                  ) : null}
                </div>
                {draft.imageUrl ? (
                  <img
                    src={draft.imageUrl}
                    alt="Material preview"
                    className="mt-3 h-24 w-24 rounded object-cover"
                  />
                ) : null}
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-[#d9e2ec] px-5 py-4">
              <button
                type="button"
                onClick={closeEditor}
                className="rounded border border-[#d9e2ec] px-3 py-2 text-xs font-medium transition hover:bg-[#f6f8fb]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveDraft}
                disabled={!draft.product.trim()}
                className="rounded bg-[#111111] px-3 py-2 text-xs font-medium text-white transition hover:bg-[#333] disabled:opacity-50"
              >
                {editorMode === "add" ? "Add material" : "Save changes"}
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
