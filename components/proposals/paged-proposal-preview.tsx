"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type PagedFlow = { total?: number };
type PagedWindow = Window & {
  Paged?: {
    Previewer: new () => {
      preview: (
        content: HTMLElement,
        stylesheets: string[],
        renderTo: HTMLElement
      ) => Promise<PagedFlow>;
    };
  };
};

function useDebouncedRenderKey(key: string | number, debounceMs: number) {
  const [debounced, setDebounced] = useState(key);

  useEffect(() => {
    if (debounceMs <= 0) {
      setDebounced(key);
      return;
    }
    const t = window.setTimeout(() => setDebounced(key), debounceMs);
    return () => window.clearTimeout(t);
  }, [key, debounceMs]);

  return debounceMs <= 0 ? key : debounced;
}

type PagedProposalPreviewProps = {
  children: ReactNode;
  className?: string;
  onRendered?: (pageCount: number) => void;
  renderKey?: string | number;
  /**
   * Waits this long after the last `renderKey` change before re-running Paged.js.
   * Use in editors so typing does not blank the preview on every keystroke.
   */
  debounceMs?: number;
};

export function PagedProposalPreview({
  children,
  className = "",
  onRendered,
  renderKey = 0,
  debounceMs = 0,
}: PagedProposalPreviewProps) {
  const sourceRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);
  const stagingRef = useRef<HTMLDivElement>(null);
  const renderIdRef = useRef(0);
  const onRenderedRef = useRef(onRendered);
  onRenderedRef.current = onRendered;

  const debouncedRenderKey = useDebouncedRenderKey(renderKey, debounceMs);
  const [isRendering, setIsRendering] = useState(true);
  const [showSlowHint, setShowSlowHint] = useState(false);

  useEffect(() => {
    if (!isRendering) {
      setShowSlowHint(false);
      return;
    }
    const t = window.setTimeout(() => setShowSlowHint(true), 400);
    return () => window.clearTimeout(t);
  }, [isRendering]);

  useEffect(() => {
    let cancelled = false;
    const renderId = ++renderIdRef.current;

    async function renderPagedPreview() {
      const source = sourceRef.current;
      const target = targetRef.current;
      const staging = stagingRef.current;
      if (!source || !target || !staging) return;

      setIsRendering(true);

      const clonedDocument = source.cloneNode(true) as HTMLElement;
      clonedDocument.classList.remove("paged-proposal-source-shell");
      /*
       * ProposalDocument keeps a legacy footer for non-paged fallback output.
       * If Paged.js sees it, it can allocate a final page for that footer and
       * our CSS hides it afterward, producing a blank last PDF page. Remove it
       * from the paginated clone before layout is calculated.
       */
      clonedDocument
        .querySelectorAll(".proposal-document > footer")
        .forEach((footer) => footer.remove());

      const paged = await loadPagedJs();

      if (cancelled || renderId !== renderIdRef.current) return;

      const previewer = new paged.Previewer();
      staging.innerHTML = "";
      /* Empty [] would skip Polisher.add(); Paged then keeps ~Letter page height and a 297mm cover splits across two sheets. */
      const a4Stylesheet = `${window.location.origin}/paged-proposal-a4.css`;
      const flow = await previewer.preview(clonedDocument, [a4Stylesheet], staging);

      if (cancelled || renderId !== renderIdRef.current) return;

      target.replaceChildren(...Array.from(staging.childNodes));
      removeTrailingBlankPages(target);

      const pageCount = target.querySelectorAll(".pagedjs_page").length || flow.total || 0;
      onRenderedRef.current?.(pageCount);
      window.dispatchEvent(
        new CustomEvent("proposal:paged", { detail: { pageCount } })
      );
      setIsRendering(false);
    }

    const frame = window.requestAnimationFrame(() => {
      renderPagedPreview().catch((error) => {
        console.error("Paged proposal preview failed", error);
        setIsRendering(false);
      });
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [debouncedRenderKey]);

  return (
    <div className={`paged-proposal-preview ${className}`}>
      {isRendering && showSlowHint ? (
        <div className="print:hidden mb-4 rounded border border-[#d9e2ec] bg-white px-4 py-3 text-sm text-gray-500">
          Updating pages…
        </div>
      ) : null}
      <div ref={stagingRef} className="paged-proposal-staging-host" aria-hidden />
      <div ref={targetRef} className="paged-proposal-output" />
      <div
        ref={sourceRef}
        className="paged-proposal-source-shell"
        aria-hidden="true"
      >
        {children}
      </div>
    </div>
  );
}

function removeTrailingBlankPages(target: HTMLElement) {
  const pages = Array.from(target.querySelectorAll<HTMLElement>(".pagedjs_page"));

  for (let index = pages.length - 1; index >= 0; index -= 1) {
    const page = pages[index];
    const content = page.querySelector<HTMLElement>(".pagedjs_page_content");
    const text = content?.textContent?.replace(/\s+/g, "").trim() ?? "";
    const hasMedia = Boolean(
      content?.querySelector("img, svg, canvas, table, figure, [data-proposal-section]")
    );

    if (text || hasMedia) return;
    page.remove();
  }
}

function loadPagedJs() {
  const pagedWindow = window as PagedWindow;
  if (pagedWindow.Paged) return Promise.resolve(pagedWindow.Paged);

  return new Promise<NonNullable<PagedWindow["Paged"]>>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-pagedjs="true"]'
    );

    if (existing) {
      existing.addEventListener("load", () => {
        if (pagedWindow.Paged) resolve(pagedWindow.Paged);
        else reject(new Error("Paged.js loaded without window.Paged"));
      });
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load Paged.js"))
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "/vendor/paged.js";
    script.async = true;
    script.dataset.pagedjs = "true";
    script.onload = () => {
      if (pagedWindow.Paged) resolve(pagedWindow.Paged);
      else reject(new Error("Paged.js loaded without window.Paged"));
    };
    script.onerror = () => reject(new Error("Failed to load Paged.js"));
    document.head.appendChild(script);
  });
}
