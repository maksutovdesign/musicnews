import { prisma } from "@/lib/db";
import { appPath } from "@/lib/paths";

export const dynamic = "force-dynamic";

function formatDate(value: Date | null) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("ru", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function qualityLabel(value: string) {
  switch (value) {
    case "google":
      return "Google News";
    case "marketplace":
      return "Marketplace";
    case "api":
      return "API";
    default:
      return "Editorial";
  }
}

export default async function SourcesAdminPage() {
  const [sources, totals] = await Promise.all([
    prisma.source.findMany({
      orderBy: [{ enabled: "desc" }, { category: "asc" }, { quality: "asc" }, { name: "asc" }],
      include: { _count: { select: { articles: true } } },
    }),
    prisma.source.groupBy({
      by: ["category", "quality", "enabled"],
      _count: { _all: true },
    }),
  ]);

  return (
    <div className="admin-page">
      <a className="reset" href={appPath("/")}>← back to news</a>
      <a className="reset" href={appPath("/admin/review")}>review queue →</a>
      <div className="feed-head">
        <strong>Source admin</strong>
        <span className="count">{sources.length} sources</span>
      </div>

      <div className="source-stats">
        {totals.map((item) => (
          <div key={`${item.category}-${item.quality}-${item.enabled}`} className="stat">
            <span>{item.category} · {qualityLabel(item.quality)}</span>
            <strong>{item._count._all}</strong>
            <small>{item.enabled ? "enabled" : "disabled"}</small>
          </div>
        ))}
      </div>

      <div className="source-table" role="table" aria-label="Sources">
        <div className="source-row source-row-head" role="row">
          <span>Name</span>
          <span>Type</span>
          <span>Last fetch</span>
          <span>New</span>
          <span>Total</span>
          <span>Errors</span>
        </div>
        {sources.map((source) => (
          <div key={source.id} className={`source-row ${source.enabled ? "" : "disabled"}`} role="row">
            <span>
              <strong>{source.name}</strong>
              <small>{source.region ?? "GLOBAL"} · {source.language ?? "n/a"}</small>
              {source.lastError && <small className="source-error">{source.lastError}</small>}
            </span>
            <span>
              <span className="tag">{source.category}</span>
              <span className="tag">{qualityLabel(source.quality)}</span>
            </span>
            <span>{formatDate(source.lastFetchedAt)}</span>
            <span>{source.lastNewItems}</span>
            <span>{source._count.articles}</span>
            <span>{source.errorCount}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
