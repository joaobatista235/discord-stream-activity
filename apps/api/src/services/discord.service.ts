import { env } from '../config/env.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  global_name: string | null;
  avatar: string | null;
}

export interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

// ─── Discord Service ──────────────────────────────────────────────────────────

export class DiscordService {
  private readonly baseUrl = 'https://discord.com/api/v10';

  /**
   * Exchange a Discord OAuth2 code for an access token.
   * This implements the server-side token exchange for the Embedded App SDK.
   */
  async exchangeCode(code: string): Promise<DiscordTokenResponse> {
    const params = new URLSearchParams({
      client_id: env.DISCORD_CLIENT_ID,
      client_secret: env.DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
    });

    const response = await fetch(`${this.baseUrl}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Discord token exchange failed (${response.status}): ${body}`);
    }

    return response.json() as Promise<DiscordTokenResponse>;
  }

  /**
   * Fetch the authenticated user's profile using their access token.
   */
  async getUser(accessToken: string): Promise<DiscordUser> {
    const response = await fetch(`${this.baseUrl}/users/@me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Discord user (${response.status})`);
    }

    return response.json() as Promise<DiscordUser>;
  }

  /**
   * Build the CDN URL for a user's avatar.
   */
  getAvatarUrl(userId: string, avatarHash: string | null): string | null {
    if (!avatarHash) return null;
    return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.webp?size=128`;
  }
}

export const discordService = new DiscordService();
