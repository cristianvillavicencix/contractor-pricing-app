import {
  calculateProjectPricing,
  formatMargin,
  formatMoney,
  getTotalCost,
  type Project,
} from "@/lib/projects";
import { ProjectStatusBadge } from "./project-status-badge";

export function ProjectCard({
  project,
  onView,
  onPrice,
}: {
  project: Project;
  onView: () => void;
  onPrice: () => void;
}) {
  const betterPrice = calculateProjectPricing(project).find(
    (result) => result.name === "Better"
  );
  const totalCost = getTotalCost(project.costs);

  return (
    <article className="rounded-lg border border-[#d9e2ec] bg-white p-5 transition hover:border-[#b7c7d6] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">
            {project.projectName}
          </h3>
          <p className="mt-1 text-sm text-gray-500">{project.customerName}</p>
        </div>
        <ProjectStatusBadge status={project.status} />
      </div>

      <p className="mt-4 text-sm leading-6 text-gray-600">
        {project.address}, {project.city}, {project.state} {project.zipCode}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
        <Metric label="Trade" value={project.trade} />
        <Metric label="Created" value={project.createdAt} />
        <Metric label="Total cost" value={formatMoney(totalCost)} />
        <Metric
          label="Better price"
          value={formatMoney(betterPrice?.salePrice ?? 0)}
          emphasized
        />
        <Metric label="Profit" value={formatMoney(betterPrice?.profit ?? 0)} />
        <Metric
          label="Margin"
          value={formatMargin(betterPrice?.margin ?? 0)}
        />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={onView}
          className="rounded-md border border-[#d9e2ec] px-4 py-2 text-sm font-medium transition hover:border-[#b7c7d6] hover:bg-[#f6f8fb]"
        >
          View
        </button>
        <button
          onClick={onPrice}
          className="rounded-md bg-[#ff5c35] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#e94820]"
        >
          Price Project
        </button>
      </div>
    </article>
  );
}

function Metric({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-gray-400">
        {label}
      </p>
      <p
        className={`mt-1 text-sm ${
          emphasized ? "font-semibold text-black" : "font-medium text-gray-700"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
