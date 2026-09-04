/**
 * library/queue.yml — topics waiting to be produced. Hand-edit it, or let autopilot fill it.
 *   node scripts/queue.mjs list
 *   node scripts/queue.mjs pop            → prints the first pending entry as JSON, marks it "running"
 *   node scripts/queue.mjs done <id>      → marks it done
 *   node scripts/queue.mjs add --topic "..." --type story   (or --template counting --hero duck)
 * Entries: { id, status: pending|running|done, topic|template, type, hero, place, minutes, addedAt }
 */
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { parseArgs } from "./lib/common.mjs";
import { LIBRARY_DIR } from "./lib/catalog.mjs";

export const QUEUE_FILE = path.join(LIBRARY_DIR, "queue.yml");

export function readQueue() {
  if (!fs.existsSync(QUEUE_FILE)) return { items: [] };
  const q = YAML.parse(fs.readFileSync(QUEUE_FILE, "utf8")) || {};
  q.items = Array.isArray(q.items) ? q.items : [];
  return q;
}

export function writeQueue(q) {
  fs.mkdirSync(LIBRARY_DIR, { recursive: true });
  fs.writeFileSync(QUEUE_FILE, "# Topics waiting to be produced. status: pending | running | done\n" + YAML.stringify(q));
}

function output(entry) {
  const flat = { id: entry.id ?? "", topic: entry.topic ?? "", template: entry.template ?? "", type: entry.type ?? "rhyme", hero: entry.hero ?? "", place: entry.place ?? "", minutes: String(entry.minutes ?? "5.5"), empty: "false" };
  console.log(JSON.stringify(flat));
  if (process.env.GITHUB_OUTPUT) for (const [k, v] of Object.entries(flat)) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`);
}

function main() {
  const [cmd, arg] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const args = parseArgs();
  const q = readQueue();
  switch (cmd) {
    case "list":
      for (const it of q.items) console.log(`${(it.status ?? "pending").padEnd(8)} ${it.id ?? "-"}  ${it.topic ?? `template:${it.template} hero:${it.hero ?? "auto"}`}`);
      break;
    case "pop": {
      const next = q.items.find((it) => (it.status ?? "pending") === "pending");
      if (!next) {
        console.log(JSON.stringify({ empty: "true" }));
        if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, "empty=true\n");
        return;
      }
      next.status = "running";
      next.startedAt = new Date().toISOString();
      writeQueue(q);
      output(next);
      break;
    }
    case "done": {
      const it = q.items.find((x) => x.id === arg);
      if (it) {
        it.status = "done";
        it.doneAt = new Date().toISOString();
        writeQueue(q);
      }
      break;
    }
    case "add": {
      const id = `q${Date.now().toString(36)}`;
      q.items.push({ id, status: "pending", addedAt: new Date().toISOString().slice(0, 10), ...(args.topic ? { topic: args.topic } : {}), ...(args.template ? { template: args.template } : {}), type: args.type ?? (args.template ? "rhyme" : "rhyme"), ...(args.hero ? { hero: args.hero } : {}), ...(args.place ? { place: args.place } : {}), minutes: Number(args.minutes ?? 5.5) });
      writeQueue(q);
      console.log(`[queue] added ${id}`);
      break;
    }
    default:
      console.log("usage: queue.mjs list | pop | done <id> | add --topic ... | add --template ...");
  }
}

main();
