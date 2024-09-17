import TelegramBot from 'node-telegram-bot-api';

// Your Telegram bot token
const TELEGRAM_BOT_TOKEN = '6973784932:AAFAwDL-s7ycQs22QryFt4KVZULh7oYONQI';
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

// The chat ID to send the message to (you can get this from your Telegram bot's chat or group)
const CHAT_ID = '-1002301536212';

// Maximum bonding curve SOL value
const MAX_SOL = 84;

// Set to store spotted tokens to avoid duplicates
const spottedTokens = new Set<string>();

// Function to filter tokens by bonding curve percentage and send the message
export default function filterTokensAndSendMessage(tokens: any[]) {
  const filteredTokens = tokens.filter((token) => {
    const poolValue = token.poolValue;  // Assuming poolValue is part of the token object
    const percentage = (poolValue / MAX_SOL) * 100; // Calculate percentage

    // Filter for 78% - 95% range and check if it's already spotted
    return percentage >= 78 && percentage <= 95 && !spottedTokens.has(token.tokenName);
  });

  if (filteredTokens.length > 0) {
    const message = filteredTokens.map((token) => {
      const percentage = ((token.poolValue / MAX_SOL) * 100).toFixed(2); // Calculate and format percentage
      
      // Add the token to the spotted set so it won't be reported again
      spottedTokens.add(token.tokenName);

      return `Token: ${token.tokenName}\nPool Value: ${token.poolValue} SOL\nPrice: $${token.price}\nCompletion: ${percentage}% of bonding curve\n`;
    }).join('\n');

    // Send the message to the Telegram bot
    bot.sendMessage(CHAT_ID, `Token Bonding Curve:\n\n${message}`);
    console.log('Message sent to Telegram');
  } else {
    console.log('No tokens found within the specified bonding curve range.');
  }
}

// Optional: Function to remove tokens from the set once they exceed 95%
export function removeSpottedTokens(tokens: any[]) {
  tokens.forEach((token) => {
    const poolValue = token.poolValue;
    const percentage = (poolValue / MAX_SOL) * 100;

    // If the token exceeds 95%, remove it from the set so it can be spotted again if needed
    if (percentage > 95 && spottedTokens.has(token.tokenName)) {
      spottedTokens.delete(token.tokenName);
      console.log(`Token ${token.tokenName} removed from spotted list.`);
    }
  });
}
