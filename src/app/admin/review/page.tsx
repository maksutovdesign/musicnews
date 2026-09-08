import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { appPath } from "@/lib/paths";
import { blockExistingArticles, blockRules, domainFromUrl } from "@/lib/moderation";

export const dynamic = "force-dynamic";

function stringField(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

async function publishArticle(formData: FormData) {
  "use server";
  const id = stringField(formData, "id");
  if (!id) return;
  await prisma.article.update({
    where: { id },
    data: { moderationStatus: "published", moderationReason: null },
  });
  revalidatePath("/admin/review");
  revalidatePath("/");
}

async function blockArticle(formData: FormData) {
  "use server";
  const id = stringField(formData, "id");
  const reason = stringField(formData, "reason") || "Blocked in review queue";
  if (!id) return;
  await prisma.article.update({
    where: { id },
    data: { moderationStatus: "blocked", moderationReason: reason },
  });
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
  const [articles, rules, counts] = await Promise.all([
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

      <div className="review-list">
        {articles.length === 0 ? (
          <div className="empty">No articles waiting for review.</div>
        ) : (
          articles.map((article) => {
            const domain = article.sourceDomain ?? domainFromUrl(article.url);
            return (
              <article key={article.id} className="review-item">
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
                    <form action={publishArticle}>
                      <input type="hidden" name="id" value={article.id} />
                      <button type="submit">Publish</button>
                    </form>
                    <form action={blockArticle}>
                      <input type="hidden" name="id" value={article.id} />
                      <input type="hidden" name="reason" value="Blocked in review queue" />
                      <button type="submit">Block</button>
                    </form>
                    {domain && (
                      <form action={blockDomain}>
                        <input type="hidden" name="domain" value={domain} />
                        <button type="submit">Block domain</button>
                      </form>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
