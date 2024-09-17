import { Connection, PublicKey } from '@solana/web3.js';

const rpcUrl = 'http://ny.rpc.onyxnodes.com:8899/';
const connection = new Connection(rpcUrl, 'confirmed');

export async function getTokenInfo(address: string) {
  try {
    // Create a PublicKey instance for the token address
    const tokenPublicKey = new PublicKey(address);

    // Fetch token supply information
    const tokenSupplyResponse = await connection.getTokenSupply(tokenPublicKey);

    // Extract the supply amount from the response
    const currentSupply = tokenSupplyResponse.value.amount;

    return currentSupply;
  } catch (error) {
    console.error("Error fetching token info:", error);
    return null;
  }
}
