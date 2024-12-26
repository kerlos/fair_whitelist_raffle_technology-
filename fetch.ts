import { ChainName, GoldRushClient } from "@covalenthq/client-sdk";
import { Database } from "bun:sqlite";

const db = new Database("db.sqlite");

const createTableQuery = `
  CREATE TABLE IF NOT EXISTS holders (
    address TEXT PRIMARY KEY,
    ar TEXT DEFAULT '',
    aistr TEXT DEFAULT '',
    alch TEXT DEFAULT ''
  )
`;

db.run(createTableQuery);


if (!Bun.env.GOLDRUSH_API_KEY) {
  throw new Error("GOLDRUSH_API_KEY is not set");
}

const client = new GoldRushClient(Bun.env.GOLDRUSH_API_KEY);

const tokenAddresses = {
  AR: "0x3e43cB385A6925986e7ea0f0dcdAEc06673d4e10",
  AISTR: "0x20ef84969f6d81Ff74AE4591c331858b20AD82CD",
  ALCH: "0x2b0772BEa2757624287ffc7feB92D03aeAE6F12D",
};

// or manually set the block number
const blockNumber: number | string = "latest";

type TokenHolderAmount = {
  address: string;
  amount: bigint;
};

type HolderDTO = {
  address: string;
  ar: string;
  aistr: string;
  alch: string;
};

type Holder = {
  address: string;
  ar?: bigint;
  aistr?: bigint;
  alch?: bigint;
};

async function upsertHolders(holders: Holder[], tokenName: string) {
  for (const holder of holders) {
    //console.log('adding', holder.address, tokenName);
    const tokenAmount = tokenName === 'ar' ? holder.ar : tokenName === 'aistr' ? holder.aistr : holder.alch;
    if(!tokenAmount) {
      //console.warn(`No token amount found for ${tokenName} for address ${holder.address}`);
      continue;
    }
    const existingHolder = db.query("SELECT * FROM holders WHERE address = ?").get(holder.address) as HolderDTO | undefined;
    if (existingHolder) {
      db.run(`UPDATE holders SET ${tokenName.toLowerCase()} = ? WHERE address = ?`, [tokenAmount.toString(), holder.address]);
    } else {
      db.run(`INSERT INTO holders (address, ${tokenName}) VALUES (?, ?)`, [holder.address, tokenAmount.toString()]);  
    }
  }
}

async function getTokenHolders(
  blockNumber: number | string,
  tokenAddress: string,
  tokenName: string
): Promise<TokenHolderAmount[]> {
  let page = 0;
  let pageSize = 1000;
  let hasMore = true;
  console.log('fetching', tokenName);
  const holders: TokenHolderAmount[] = [];
  do {
    const resp =
      await client.BalanceService.getTokenHoldersV2ForTokenAddressByPage(
        ChainName.BASE_MAINNET,
        tokenAddress,
        { blockHeight: blockNumber, pageSize, pageNumber: page }
      );
    page++;
    hasMore = resp.data?.pagination?.has_more ?? false;
    if (resp.data?.items) {
      //console.log(`Found ${resp.data.items.length} holders for ${tokenName}`);
      const holders = resp.data.items.filter((item) => item.address !== null && item.balance !== null)
      .map((item) => ({
        address: item.address!,
        [`${tokenName.toLowerCase()}`]: item.balance!,
      }));
      await upsertHolders(holders, tokenName);
    }
  } while (hasMore);
  return holders;
}

// function weightedRandomSelection(
//   holders: Holder[],
//   numWinners: number
// ): Holder[] {
//   const totalTokens = holders.reduce(
//     (sum, holder) => sum + holder.totalTokens,
//     0
//   );
//   const winners: Holder[] = [];

//   for (let i = 0; i < numWinners; i++) {
//     let randomValue = Math.random() * totalTokens;
//     for (const holder of holders) {
//       if (randomValue < holder.totalTokens) {
//         winners.push(holder);
//         break;
//       }
//       randomValue -= holder.totalTokens;
//     }
//   }

//   return winners;
// }

// async function selectWinners(
//   blockNumber: bigint,
//   numWinners: number = 100
// ): Promise<Holder[]> {
//   const holders = await getTokenHolders(blockNumber);
//   return weightedRandomSelection(holders, numWinners);
// }

// selectWinners(blockNumber).then((winners) => {
//   console.log("Winning addresses and their holdings:", winners);
// });

await getTokenHolders(blockNumber, tokenAddresses.AR, 'ar')
await getTokenHolders(blockNumber, tokenAddresses.AISTR, 'aistr')
await getTokenHolders(blockNumber, tokenAddresses.ALCH, 'alch')

console.log('done')
