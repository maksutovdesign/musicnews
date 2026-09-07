import { prisma } from "@/lib/db";
import { runIngest } from "./run";

const DEFAULT_INTERVAL_MINUTES = 15;

function argValue(name: string) {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function intervalMs() {
  const raw = Number(argValue("interval") ?? DEFAULT_INTERVAL_MINUTES);
  const minutes = Number.isFinite(raw) && raw >= 1 ? raw : DEFAULT_INTERVAL_MINUTES;
  return minutes * 60 * 1000;
}

function timestamp() {
  return new Date().toISOString();
}

let running = false;

async function tick() {
  if (running) {
    console.log(`[${timestamp()}] previous ingest still running, skipping this tick`);
    return;
  }

  running = true;
  console.log(`[${timestamp()}] ingest starting`);
  try {
    const result = await runIngest();
    console.log(
      `[${timestamp()}] ingest finished: ${result.stored} new, ${result.classified} classified`,
    );
  } catch (err) {
    console.error(`[${timestamp()}] ingest failed`);
    console.error(err);
  } finally {
    running = false;
  }
}

async function main() {
  const ms = intervalMs();
  console.log(`Watching RSS feeds every ${Math.round(ms / 60000)} minute(s).`);
  await tick();
  const timer = setInterval(tick, ms);

  const shutdown = async () => {
    clearInterval(timer);
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
