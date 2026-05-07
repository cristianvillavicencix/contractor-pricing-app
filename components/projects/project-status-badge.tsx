import type { ProjectStatus } from "@/lib/projects";

const statusStyles: Record<ProjectStatus, string> = {
  Draft: "border-[#d9e2ec] bg-white text-gray-600",
  Pricing: "border-gray-300 bg-[#f6f8fb] text-gray-800",
  Quoted: "border-gray-300 bg-white text-gray-800",
  Won: "border-gray-300 bg-gray-100 text-black",
  Lost: "border-[#d9e2ec] bg-[#f6f8fb] text-gray-500",
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span
      className={`w-fit rounded-md border px-3 py-1 text-xs font-medium ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
}
