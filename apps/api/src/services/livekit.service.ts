import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { env } from '../config/env.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LiveKitTokenOptions {
  roomName: string;
  participantIdentity: string;
  participantName: string;
  canPublish: boolean;
  canSubscribe: boolean;
}

// ─── LiveKit Service ──────────────────────────────────────────────────────────

export class LiveKitService {
  private readonly roomService: RoomServiceClient;

  constructor() {
    this.roomService = new RoomServiceClient(
      env.LIVEKIT_URL.replace('ws://', 'http://').replace('wss://', 'https://'),
      env.LIVEKIT_API_KEY,
      env.LIVEKIT_API_SECRET
    );
  }

  /**
   * Generate a short-lived participant token for connecting to a LiveKit room.
   * Tokens are generated server-side — API secrets are never exposed to clients.
   */
  async generateToken(options: LiveKitTokenOptions): Promise<string> {
    const at = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
      identity: options.participantIdentity,
      name: options.participantName,
      ttl: env.LIVEKIT_TOKEN_TTL,
    });

    at.addGrant({
      roomJoin: true,
      room: options.roomName,
      canPublish: options.canPublish,
      canSubscribe: options.canSubscribe,
      canPublishData: true,
    });

    return await at.toJwt();
  }

  /**
   * Ensure a LiveKit room exists. LiveKit creates rooms on first join,
   * but explicit creation allows setting metadata/constraints upfront.
   */
  async ensureRoom(roomName: string): Promise<void> {
    try {
      await this.roomService.createRoom({ name: roomName });
    } catch {
      // Room may already exist — not an error
    }
  }

  /**
   * Delete a room and disconnect all participants.
   */
  async deleteRoom(roomName: string): Promise<void> {
    try {
      await this.roomService.deleteRoom(roomName);
    } catch {
      // Room may not exist — not an error
    }
  }

  /**
   * List participants in a room.
   */
  async listParticipants(roomName: string) {
    return this.roomService.listParticipants(roomName);
  }
}

export const livekitService = new LiveKitService();
