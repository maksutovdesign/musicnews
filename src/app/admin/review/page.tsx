import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { appPath } from "@/lib/paths";
import { blockExistingArticles, blockRules, domainFromUrl } from "@/lib/moderation";

export const dynamic = "force-dynamic";

function stringField(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function idsFromForm(formData: FormData, singleId: string) {
  if (singleId) return [singleId];
  return formData
    .getAll("ids")
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);
}

async function moderateArticles(formData: FormData) {
  "use server";
  const [action, singleId = ""] = stringField(formData, "command").split(":");
  const ids = idsFromForm(formData, singleId);
  if (!ids.length) return;
  if (action === "publish") {
    await prisma.article.updateMany({
      where: { id: { in: ids } },
      data: { moderationStatus: "published", moderationReason: null },
    });
  }
  if (action === "block") {
    await prisma.article.updateMany({
      where: { id: { in: ids } },
      data: {
        moderationStatus: "blocked",
        moderationReason: "Blocked in review queue",
      },
    });
  }
  revalidatePath("/admin/review");
  revalidatePath("/");
}

async function blockDomain(formData: FormData) {
  "use server";
  const domain = stringField(formData, "domain").toLowerCase();
  if (!domain) return;
  const rule = await prisma.blockRule.upsert({
    where: { type_value: { type: "domain", value: domain } },
    create: { type: "domain", value: domain, reason: "Blocked from review queue" },
    update: { reason: "Blocked from review queue" },
  });
  await blockExistingArticles(rule);
  revalidatePath("/admin/review");
  revalidatePath("/");
}

async function publishDomain(formData: FormData) {
  "use server";
  const domain = stringField(formData, "domain").toLowerCase();
  if (!domain) return;
  await prisma.article.updateMany({
    where: { moderationStatus: "review", sourceDomain: domain },
    data: { moderationStatus: "published", moderationReason: null },
  });
  revalidatePath("/admin/review");
  revalidatePath("/");
}

async function blockKeyword(formData: FormData) {
  "use server";
  const keyword = stringField(formData, "keyword").toLowerCase();
  if (!keyword) return;
  const rule = await prisma.blockRule.upsert({
    where: { type_value: { type: "keyword", value: keyword } },
    create: { type: "keyword", value: keyword, reason: "Blocked keyword from review queue" },
    update: { reason: "Blocked keyword from review queue" },
  });
  await blockExistingArticles(rule);
  revalidatePath("/admin/review");
  revalidatePath("/");
}

export default async function ReviewPage() {
  const [articles, rules, counts, domains] = await Promise.all([
    prisma.article.findMany({
      where: { moderationStatus: "review" },
      orderBy: { publishedAt: "desc" },
      take: 80,
      include: { source: true },
    }),
    blockRules(),
    prisma.article.groupBy({
      by: ["moderationStatus"],
      _count: { _all: true },
    }),
    prisma.article.groupBy({
      by: ["sourceDomain"],
      where: { moderationStatus: "review", sourceDomain: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { sourceDomain: "desc" } },
      take: 12,
    }),
  ]);

  return (
    <div className="admin-page">
      <a className="reset" href={appPath("/admin/sources")}>← source admin</a>
      <div className="feed-head">
        <strong>Review queue</strong>
        <span className="count">{articles.length} waiting</span>
      </div>

      <div className="source-stats">
        {counts.map((item) => (
          <div key={item.moderationStatus} className="stat">
            <span>{item.moderationStatus}</span>
            <strong>{item._count._all}</strong>
            <small>articles</small>
          </div>
        ))}
        <div className="stat">
          <span>block rules</span>
          <strong>{rules.length}</strong>
          <small>domains and keywords</small>
        </div>
      </div>

      <form className="search" action={blockKeyword}>
        <input type="text" name="keyword" placeholder="Block keyword..." />
        <button type="submit">Block keyword</button>
      </form>

      {rules.length > 0 && (
        <div className="active-filters" aria-label="Block rules">
          {rules.map((rule) => (
            <span key={rule.id} className="tag">{rule.type}: {rule.value}</span>
          ))}
        </div>
      )}

      {domains.length > 0 && (
        <div className="domain-actions">
          {domains.map((item) => (
            <div key={item.sourceDomain} className="domain-action">
              <strong>{item.sourceDomain}</strong>
              <span>{item._count._all} waiting</span>
              <form action={publishDomain}>
                <input type="hidden" name="domain" value={item.sourceDomain ?? ""} />
                <button type="submit">Publish domain</button>
              </form>
              <form action={blockDomain}>
                <input type="hidden" name="domain" value={item.sourceDomain ?? ""} />
                <button type="submit">Block domain</button>
              </form>
            </div>
          ))}
        </div>
      )}

      <form className="review-list" action={moderateArticles}>
        {articles.length === 0 ? (
          <div className="empty">No articles waiting for review.</div>
        ) : (
          <>
            <div className="bulk-actions">
              <button type="submit" name="command" value="publish">Publish selected</button>
              <button type="submit" name="command" value="block">Block selected</button>
            </div>
            {articles.map((article) => {
              const domain = article.sourceDomain ?? domainFromUrl(article.url);
              return (
                <article key={article.id} className="review-item">
                  <label className="review-check">
                    <input type="checkbox" name="ids" value={article.id} />
                    <span>Select</span>
                  </label>
                  {article.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={article.imageUrl} alt="" loading="lazy" />
                  )}
                  <div className="review-body">
                    <div className="meta">
                      <span className="tag">{article.source.name}</span>
                      {domain && <span className="tag">{domain}</span>}
                      <time dateTime={article.publishedAt.toISOString()}>
                        {article.publishedAt.toLocaleDateString("ru")}
                      </time>
                    </div>
                    <h2>{article.title}</h2>
                    {article.summary && <p>{article.summary}</p>}
                    <a className="reset" href={article.url} target="_blank" rel="noopener noreferrer">
                      Open source
                    </a>
                    <div className="review-actions">
                      <button type="submit" name="command" value={`publish:${article.id}`} formAction={moderateArticles}>
                        Publish
                      </button>
                      <button type="submit" name="command" value={`block:${article.id}`} formAction={moderateArticles}>
                        Block
                      </button>
                      {domain && (
                        <button type="submit" name="domain" value={domain} formAction={blockDomain}>
                          Block domain
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </>
        )}
      </form>
    </div>
  );
}
