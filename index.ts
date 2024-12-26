import { Database } from "bun:sqlite";
import type { HolderDTO, TotalTokenHolder } from "./types";

const db = new Database("db.sqlite");

const tableExists = db
  .query("SELECT name FROM sqlite_master WHERE type='table' AND name='holders'")
  .get() as { name: string } | undefined;
if (!tableExists) {
  console.log(
    "Table 'holders' does not exist, please run 'bun run fetch.ts' first."
  );
  process.exit(1);
}

const dataCount = db.query("SELECT COUNT(*) as count FROM holders").get() as {
  count: number;
};

if (dataCount.count === 0) {
  console.log("No data found, please run 'bun run fetch.ts' first.");
  process.exit(1);
}

let page = 0;
let pageSize = 1000;

const holders: TotalTokenHolder[] = [];

function convertToBigint(value: string): bigint {
  if (value === "") return BigInt(0);
  return BigInt(value);
}

while (true) {
  const qsResult = db
    .query(`SELECT * FROM holders LIMIT ? OFFSET ?`)
    .all(pageSize, page * pageSize) as HolderDTO[];
  if (qsResult.length === 0) {
    break;
  }
  //console.log(`Page ${page + 1}:`, holders);
  qsResult.map((holder) => {
    const total =
      convertToBigint(holder.ar) +
      convertToBigint(holder.aistr) +
      convertToBigint(holder.alch);
    holders.push({
      address: holder.address,
      ar: convertToBigint(holder.ar),
      aistr: convertToBigint(holder.aistr),
      alch: convertToBigint(holder.alch),
      total,
    });
  });

  page++;
}

function weightedRandomSelection(holders: TotalTokenHolder[], numWinners: number): TotalTokenHolder[] {
  const totalTokens = holders.reduce((sum, holder) => sum + holder.total, BigInt(0));
  const winners: TotalTokenHolder[] = [];

  for (let i = 0; i < numWinners; i++) {
    let randomValue = BigInt(Math.floor(Math.random() * Number(totalTokens)));
    for (const holder of holders) {
      if (randomValue < holder.total) {
        winners.push(holder);
        break;
      }
      randomValue -= holder.total;
    }
  }

  return winners;
}

const numWinners = 100;
const winners = weightedRandomSelection(holders, numWinners);
function formatBigint(value: bigint): string {
  return (value / BigInt(10 ** 18)).toString();
}
const winnersTable = winners.map((winner) => ({
  address: winner.address,
  total: formatBigint(winner.total),
  ar: formatBigint(winner.ar),
  aistr: formatBigint(winner.aistr),
  alch: formatBigint(winner.alch),
}));

console.log("Winning addresses and their total holdings:");
console.table(winnersTable);
