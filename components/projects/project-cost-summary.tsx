import { formatMoney, getTotalCost, type CostBreakdown } from "@/lib/projects";

const costRows: { key: keyof CostBreakdown; label: string }[] = [
  { key: "materials", label: "Materials" },
  { key: "labor", label: "Labor" },
  { key: "dumpster", label: "Dumpster / disposal" },
  { key: "permits", label: "Permits" },
  { key: "equipment", label: "Equipment" },
  { key: "subcontractor", label: "Subcontractor" },
  { key: "miscellaneous", label: "Miscellaneous" },
];

export function ProjectCostSummary({ costs }: { costs: CostBreakdown }) {
  return (
    <div className="rounded-lg border border-[#d9e2ec] bg-white p-5">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-black">Cost Breakdown</p>
        <p className="text-sm font-semibold">{formatMoney(getTotalCost(costs))}</p>
      </div>

      <div className="mt-4 divide-y divide-gray-100">
        {costRows.map((row) => (
          <div
            key={row.key}
            className="flex items-center justify-between gap-4 py-2 text-sm"
          >
            <span className="text-gray-500">{row.label}</span>
            <span className="font-medium text-black">
              {formatMoney(costs[row.key])}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
