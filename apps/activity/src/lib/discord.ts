import { DiscordSDK } from '@discord/embedded-app-sdk';

const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;

if (!clientId) {
  throw new Error('VITE_DISCORD_CLIENT_ID is not set. Check your .env file.');
}

export const discordSdk = new DiscordSDK(clientId);

export type { DiscordSDK };
