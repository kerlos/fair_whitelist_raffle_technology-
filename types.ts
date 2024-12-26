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

type TotalTokenHolder = {
  address: string;
  total: bigint;
  ar: bigint;
  aistr: bigint;
  alch: bigint;
};


export type { HolderDTO, Holder, TotalTokenHolder };
