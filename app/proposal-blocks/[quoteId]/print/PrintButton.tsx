"use client";

export function PrintButton({ className }: { className?: string }) {
  return (
    <button className={className} onClick={() => window.print()}>
      Print
    </button>
  );
}
