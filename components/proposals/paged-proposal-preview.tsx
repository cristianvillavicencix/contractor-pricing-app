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

type PagedProposalPreviewProps = {
  children: ReactNode;
  className?: string;
  onRendered?: (pageCount: number) => void;
  renderKey?: string | number;
};

export function PagedProposalPreview({
  children,
  className = "",
  onRendered,
  renderKey = 0,
}: PagedProposalPreviewProps) {
  const sourceRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);
  const renderIdRef = useRef(0);
  const [isRendering, setIsRendering] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const renderId = ++renderIdRef.current;

    async function renderPagedPreview() {
      const source = sourceRef.current;
      const target = targetRef.current;
      if (!source || !target) return;

      setIsRendering(true);
      target.innerHTML = "";

      const clonedDocument = source.cloneNode(true) as HTMLElement;
      clonedDocument.classList.remove("paged-proposal-source-shell");

      const paged = await loadPagedJs();

      if (cancelled || renderId !== renderIdRef.current) return;

      const previewer = new paged.Previewer();
      const flow = await previewer.preview(clonedDocument, [], target);

      if (cancelled || renderId !== renderIdRef.current) return;

      const pageCount =
        flow.total ?? target.querySelectorAll(".pagedjs_page").length;
      onRendered?.(pageCount);
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
  }, [renderKey, onRendered]);

  return (
    <div className={`paged-proposal-preview ${className}`}>
      {isRendering ? (
        <div className="print:hidden mb-4 rounded border border-[#d9e2ec] bg-white px-4 py-3 text-sm text-gray-500">
          Paginating proposal…
        </div>
      ) : null}
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
