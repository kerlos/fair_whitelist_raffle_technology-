import { Database } from "bun:sqlite";
import type { HolderDTO, TotalTokenHolder } from "./types";
import { writeFileSync } from "fs";
import weightedRandom from "./random";

const db = new Database("db.sqlite");

const LP_ADDRESSES = [
  "0x197ecb5c176ad4f6e77894913a94c5145416f148",
  "0x3fdd9a4b3ca4a99e3dfe931e3973c2ac37b45be9",
  "0xf5677b22454dee978b2eb908d6a17923f5658a79",
];
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
    holders
      .filter((holder) => !LP_ADDRESSES.includes(holder.address))
      .push({
        address: holder.address,
        ar: convertToBigint(holder.ar),
        aistr: convertToBigint(holder.aistr),
        alch: convertToBigint(holder.alch),
        total,
      });
  });

  page++;
}

function weightedRandomSelection(
  holders: TotalTokenHolder[],
  numWinners: number
): TotalTokenHolder[] {
  const totalTokens = holders.reduce(
    (sum, holder) => sum + holder.total,
    BigInt(0)
  );
  const weights = holders.map(
    (holder) => Number(holder.total) / Number(totalTokens)
  );
  const winners: TotalTokenHolder[] = [];

  for (let i = 0; i < numWinners; i++) {
    const { item, index } = weightedRandom(holders, weights);
    winners.push(item);
    holders.splice(index, 1);
    weights.splice(index, 1);
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

const output = [
  ["Address", "Total", "AR", "AISTR", "ALCH"],
  ...winnersTable.map((winner) => [
    winner.address,
    winner.total,
    winner.ar,
    winner.aistr,
    winner.alch,
  ]),
]
  .map((row) => row.join(","))
  .join("\n");

writeFileSync("output.csv", output);

console.log("Winners have been saved to output.csv");
