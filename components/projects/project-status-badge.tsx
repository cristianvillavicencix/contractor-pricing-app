import type { ProjectStatus } from "@/lib/projects";

const statusStyles: Record<ProjectStatus, string> = {
  Draft: "border-[#d9e2ec] bg-white text-gray-600",
  Pricing: "border-gray-300 bg-[#f6f8fb] text-gray-800",
  Quoted: "border-gray-300 bg-white text-gray-800",
  Planned: "border-blue-200 bg-blue-50 text-blue-700",
  "In Progress": "border-indigo-200 bg-indigo-50 text-indigo-700",
  Completed: "border-green-200 bg-green-50 text-green-700",
  "On Hold": "border-amber-200 bg-amber-50 text-amber-700",
  Cancelled: "border-red-200 bg-red-50 text-red-700",
  Won: "border-gray-300 bg-gray-100 text-black",
  Lost: "border-[#d9e2ec] bg-[#f6f8fb] text-gray-500",
  Archived: "border-[#d9e2ec] bg-gray-50 text-gray-400",
  not_started: "border-blue-200 bg-blue-50 text-blue-700",
  scheduled: "border-cyan-200 bg-cyan-50 text-cyan-700",
  in_progress: "border-indigo-200 bg-indigo-50 text-indigo-700",
  on_hold: "border-amber-200 bg-amber-50 text-amber-700",
  completed: "border-green-200 bg-green-50 text-green-700",
  invoiced: "border-violet-200 bg-violet-50 text-violet-700",
  paid: "border-emerald-200 bg-emerald-50 text-emerald-700",
  closed: "border-slate-300 bg-slate-100 text-slate-700",
  cancelled: "border-red-200 bg-red-50 text-red-700",
};

const statusLabels: Partial<Record<ProjectStatus, string>> = {
  not_started: "Not started",
  scheduled: "Scheduled",
  in_progress: "In progress",
  on_hold: "On hold",
  completed: "Completed",
  invoiced: "Invoiced",
  paid: "Paid",
  closed: "Closed",
  cancelled: "Cancelled",
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span
      className={`w-fit rounded-md border px-3 py-1 text-xs font-medium ${statusStyles[status]}`}
    >
      {statusLabels[status] ?? status}
    </span>
  );
}
