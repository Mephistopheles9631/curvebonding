var myHeaders = new Headers();
var requestOptions: any = {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  redirect: 'follow',
  body: JSON.stringify({
    "jsonrpc": "2.0",
    "id": 1,
    "method": "getTokenAccountsByOwner",
    "params": [
      "your-wallet-address", // replace this with your wallet address
      {
        "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" // SPL token program ID
      },
      {
        "encoding": "jsonParsed"
      }
    ]
  })
};

export async function getTokenBalance(address: string) {
  // Updating the request with the correct address
  requestOptions.body = JSON.stringify({
    "jsonrpc": "2.0",
    "id": 1,
    "method": "getTokenAccountsByOwner",
    "params": [
      address, // Replace with the provided address
      {
        "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" // SPL token program ID
      },
      {
        "encoding": "jsonParsed"
      }
    ]
  });

  const info = await fetch(`http://ny.rpc.onyxnodes.com:8899/`, requestOptions);
  const infoJson = await info.json();
  
  // Assuming we're interested in the first token account's balance
  const result = infoJson?.result?.value[0]?.account?.data?.parsed?.info?.tokenAmount?.uiAmount;
  
  return result || 0; // Return 0 if no balance is found
}
