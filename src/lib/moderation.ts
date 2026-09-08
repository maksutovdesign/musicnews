import { prisma } from "@/lib/db";

export function domainFromUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

export async function blockRules() {
  return prisma.blockRule.findMany({ orderBy: [{ type: "asc" }, { value: "asc" }] });
}

export function matchesBlockRules(
  article: { title: string; url: string; summary: string | null; content: string | null },
  rules: Awaited<ReturnType<typeof blockRules>>,
) {
  const domain = domainFromUrl(article.url);
  const text = [article.title, article.summary, article.content]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  for (const rule of rules) {
    const value = rule.value.toLowerCase();
    if (rule.type === "domain" && domain === value) return rule;
    if (rule.type === "keyword" && text.includes(value)) return rule;
  }

  return null;
}

export function publicArticleWhere() {
  return {
    moderationStatus: { not: "blocked" },
  };
}

export async function blockExistingArticles(rule: { type: string; value: string; reason?: string | null }) {
  const value = rule.value.toLowerCase();
  if (rule.type === "domain") {
    return prisma.article.updateMany({
      where: { sourceDomain: value },
      data: {
        moderationStatus: "blocked",
        moderationReason: rule.reason ?? `Blocked domain: ${value}`,
      },
    });
  }

  return prisma.article.updateMany({
    where: {
      OR: [
        { title: { contains: value } },
        { summary: { contains: value } },
        { content: { contains: value } },
      ],
    },
    data: {
      moderationStatus: "blocked",
      moderationReason: rule.reason ?? `Blocked keyword: ${value}`,
    },
  });
}
