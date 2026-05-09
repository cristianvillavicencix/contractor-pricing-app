"use client";

import type { ReactNode } from "react";

export function PageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-4 p-4">
      <div className="h-8 w-48 rounded-md bg-gray-200" />
      <div className="h-12 w-full rounded-lg bg-gray-100" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 w-full rounded-lg bg-gray-100" />
      ))}
    </div>
  );
}

export function ErrorPanel({
  message,
  onRetry,
  title = "Something went wrong",
}: {
  message: string;
  onRetry?: () => void;
  title?: string;
}) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-6 text-center">
      <p className="font-semibold text-red-800">{title}</p>
      <p className="mt-2 text-sm text-red-700">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-800"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-[#d9e2ec] bg-white px-6 py-12 text-center">
      <p className="text-base font-semibold text-[#213343]">{title}</p>
      {description ? <p className="mt-2 text-sm text-gray-500">{description}</p> : null}
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}
