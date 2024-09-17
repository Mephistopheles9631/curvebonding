import Client, {
  CommitmentLevel,
  SubscribeRequestAccountsDataSlice,
  SubscribeRequestFilterAccounts,
  SubscribeRequestFilterBlocks,
  SubscribeRequestFilterBlocksMeta,
  SubscribeRequestFilterEntry,
  SubscribeRequestFilterSlots,
  SubscribeRequestFilterTransactions,
} from "@triton-one/yellowstone-grpc";
import { SubscribeRequestPing } from "@triton-one/yellowstone-grpc/dist/grpc/geyser";
import { Connection, PublicKey, VersionedTransactionResponse } from "@solana/web3.js";
import { tOutPut } from "./utils/transactionOutput";
import { publicKey } from "@solana/buffer-layout-utils";
import { getTokenInfo } from "./utils/tokenInfo";
import { getTokenBalance } from "./utils/token";
import filterTokensAndSendMessage from "./utils/telegrambot";  // Importing the function

const pumpfun = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';
const api = 'K0WYl519_EToNYlW'
const connection = new Connection(`http://ny.rpc.onyxnodes.com:8899/`, 'confirmed');

interface SubscribeRequest {
  accounts: { [key: string]: SubscribeRequestFilterAccounts };
  slots: { [key: string]: SubscribeRequestFilterSlots };
  transactions: { [key: string]: SubscribeRequestFilterTransactions };
  transactionsStatus: { [key: string]: SubscribeRequestFilterTransactions };
  blocks: { [key: string]: SubscribeRequestFilterBlocks };
  blocksMeta: { [key: string]: SubscribeRequestFilterBlocksMeta };
  entry: { [key: string]: SubscribeRequestFilterEntry };
  commitment?: CommitmentLevel | undefined;
  accountsDataSlice: SubscribeRequestAccountsDataSlice[];
  ping?: SubscribeRequestPing | undefined;
}

async function handleStream(client: Client, args: SubscribeRequest) {
  console.log("Subscribing to stream...");
  const stream = await client.subscribe();

  const streamClosed = new Promise<void>((resolve, reject) => {
    stream.on("error", (error) => {
      console.log("Stream error:", error);
      reject(error);
      stream.end();
    });
    stream.on("end", () => {
      console.log("Stream ended.");
      resolve();
    });
    stream.on("close", () => {
      console.log("Stream closed.");
      resolve();
    });
  });

  stream.on("data", async (data) => {
    try {
      console.log("Data received:", data);
      const result = await tOutPut(data);
      console.log("Transaction output processed:", result);

      const bondingDetails = await getBondingCurveAddress(result.meta.postTokenBalances);
      console.log("Bonding curve details:", bondingDetails);

      const Ca = result.meta.postTokenBalances[0].mint;
      const tokenInfo = await getTokenInfo(Ca);
      console.log("Token info fetched:", tokenInfo);

      const bondingCurve = bondingDetails.bondingCurve ? bondingDetails.bondingCurve.toString() : "";
      const tokenBalances = await getTokenBalance(bondingCurve);
      console.log("Token balances fetched:", tokenBalances);
      const tokenInfoAsNumber = parseFloat(tokenInfo);

      const PoolValue = bondingDetails.solBalance / 1000000000;
      const marketInfo = calculateInfo(PoolValue, tokenBalances, tokenInfoAsNumber);
      console.log("Market info calculated:", marketInfo);

      const tokenData = {
        tokenName: Ca,
        poolValue: PoolValue,
        price: marketInfo.price,
        marketCap: marketInfo.marketPrice,
        currentSupply: tokenInfoAsNumber
      };

      // Send token data to the filter and Telegram function
      filterTokensAndSendMessage([tokenData]);

      if (tokenInfo !== undefined) {
        if (PoolValue >= 84) {
          console.log(`
            BONDING CURVE COMPLETED
            Latest Pool
            Ca : ${Ca}
            Bonding Curve Address : ${bondingCurve}
            Pool Value SOL : ${Number(PoolValue).toFixed(2)} SOL
            Pool Value : ${tokenBalances}
            Price : $${marketInfo.price}
            MarketCap : ${marketInfo.marketPrice}
            current Supply : ${tokenInfo}
          `);
        } else {
          console.log(`
            Latest Pool
            Ca : ${Ca}
            Bonding Curve Address : ${bondingCurve}
            Pool Value SOL : ${Number(PoolValue).toFixed(2)} SOL
            Pool Value : ${tokenBalances}
            Price : $${marketInfo.price}
            MarketCap : ${marketInfo.marketPrice}
            current Supply : ${tokenInfo}
          `);
        }
      } else {
        console.log("Token info is undefined.");
      }
    } catch (error) {
      console.log("Error processing data:", error);
    }
  });

  await new Promise<void>((resolve, reject) => {
    stream.write(args, (err: any) => {
      if (err === null || err === undefined) {
        console.log("Subscribe request sent successfully.");
        resolve();
      } else {
        console.error("Error sending subscribe request:", err);
        reject(err);
      }
    });
  }).catch((reason) => {
    console.error("Error occurred:", reason);
    throw reason;
  });

  await streamClosed;
}

async function subscribeCommand(client: Client, args: SubscribeRequest) {
  while (true) {
    try {
      console.log("Starting stream...");
      await handleStream(client, args);
    } catch (error) {
      console.error("Stream error, restarting in 1 second...", error);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

const client = new Client(
  'http://ny.rpc.onyxnodes.com:10000/',
  undefined,
  undefined,
);

const req = {
  accounts: {},
  slots: {},
  transactions: {
    bondingCurve: {
      vote: false,
      failed: false,
      signature: undefined,
      accountInclude: [pumpfun],
      accountExclude: [],
      accountRequired: [],
    },
  },
  transactionsStatus: {},
  entry: {},
  blocks: {},
  blocksMeta: {},
  accountsDataSlice: [],
  ping: undefined,
  commitment: CommitmentLevel.CONFIRMED,
};

subscribeCommand(client, req);

async function getBondingCurveAddress(transaction: any[]) {
  let bondingCurve;
  let solBalance;
  console.log("Getting bonding curve address...");
  const eachOwners = transaction?.flatMap((inner) => inner.owner);
  for (const owner in eachOwners) {
    const address = new PublicKey(eachOwners[owner]);
    const systemOwner = await connection.getAccountInfo(address);
    console.log("Account info fetched for:", address.toString());
    if (systemOwner.owner.toString() === pumpfun) {
      bondingCurve = address;
      solBalance = systemOwner.lamports;
      console.log("Bonding curve found:", bondingCurve.toString());
      return { bondingCurve, solBalance };
    }
  }
  console.log("No bonding curve found.");
  return { bondingCurve, solBalance };
}

function calculateInfo(solBal: number, tokenBal: number, currentSupply: number) {
  console.log("Calculating market info...");
  const $sol: number = solBal * 134.7;
  const tokenBought: number = currentSupply - tokenBal;
  const tokenBoughtPrice: number = $sol / tokenBought;
  const tokenValue = tokenBoughtPrice * currentSupply;
  const price = tokenValue / tokenBal;
  const marketPrice = price * currentSupply;
  console.log("Market info:", { price, marketPrice });
  return {
    price,
    marketPrice,
  };
}
