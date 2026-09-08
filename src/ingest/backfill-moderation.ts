import { prisma } from "@/lib/db";
import { blockExistingArticles, blockRules, domainFromUrl } from "@/lib/moderation";

async function main() {
  let updatedDomains = 0;

  for (;;) {
    const articles = await prisma.article.findMany({
      where: { sourceDomain: null },
      select: { id: true, url: true },
      take: 200,
    });
    if (articles.length === 0) break;

    await prisma.$transaction(
      articles.map((article) =>
        prisma.article.update({
          where: { id: article.id },
          data: { sourceDomain: domainFromUrl(article.url) ?? "unknown" },
        }),
      ),
    );
    updatedDomains += articles.length;
  }

  const googleReview = await prisma.article.updateMany({
    where: {
      moderationStatus: "published",
      source: { quality: "google" },
    },
    data: { moderationStatus: "review" },
  });

  let blocked = 0;
  for (const rule of await blockRules()) {
    const result = await blockExistingArticles(rule);
    blocked += result.count;
  }

  console.log(
    `✓ moderation backfill done. ${updatedDomains} domains, ${googleReview.count} Google items moved to review, ${blocked} blocked by rules.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
