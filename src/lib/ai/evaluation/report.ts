type Result = {
  id: string;
  name: string;
  category: string;
  pass: boolean;
  reason: string;
  latencyMs?: number;
  skipped?: boolean;
};

export function printReport(results: Result[], avgLatency: number | null, avgRounds: number | null) {
  console.log("\nAI Evaluation — " + results.length + " cases\n");

  const groups: Record<string, Result[]> = {};
  for (const r of results) {
    groups[r.category] = groups[r.category] || [];
    groups[r.category].push(r);
  }

  for (const [cat, arr] of Object.entries(groups)) {
    const pass = arr.filter((r) => r.pass).length;
    console.log(`${cat.padEnd(16)} ${pass}/${arr.length}`);
  }

  const totalPass = results.filter((r) => r.pass).length;
  console.log(`\nOverall: ${totalPass}/${results.length}`);

  const fails = results.filter((r) => !r.pass && !r.skipped);
  if (fails.length > 0) {
    console.log("\nFAIL:");
    for (const f of fails) {
      console.log(` ${f.id} — ${f.name}`);
      console.log(` Reason: ${f.reason}`);
    }
  }

  const skipped = results.filter((r) => r.skipped);
  if (skipped.length > 0) {
    console.log("\nSKIPPED:");
    for (const s of skipped) console.log(` ${s.id} — ${s.name}: ${s.reason}`);
  }

  if (avgLatency !== null) console.log(`\nAvg latency: ${avgLatency}ms`);
  if (avgRounds !== null) console.log(`Avg LLM rounds: ${avgRounds}`);
  console.log(`Exit code: ${fails.length > 0 ? 1 : 0}\n`);
}
