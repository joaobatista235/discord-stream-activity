// Domain types for Discord Stream Activity
// These are plain TypeScript interfaces — source of truth for the whole app.

// ─── User ────────────────────────────────────────────────────────────────────

export interface User {
  discordUserId: string;
  displayName: string;
  avatar: string | null;
}

// ─── Activity Session ─────────────────────────────────────────────────────────

export interface ActivitySession {
  activitySessionId: string;
  discordChannelId: string;
  discordGuildId: string;
  createdAt: string; // ISO 8601
  expiresAt: string; // ISO 8601
}

// ─── Stream Room ──────────────────────────────────────────────────────────────

export type RoomStatus = 'WAITING' | 'LIVE' | 'ENDED';

export interface StreamRoom {
  roomId: string;
  activitySessionId: string;
  streamerId: string | null;
  streamerName: string | null;
  status: RoomStatus;
  viewerCount: number;
  createdAt: string;
  endedAt: string | null;
}

// ─── Participant ──────────────────────────────────────────────────────────────

export type ParticipantRole = 'STREAMER' | 'VIEWER';

export interface Participant {
  userId: string;
  displayName: string;
  avatar: string | null;
  roomId: string;
  role: ParticipantRole;
  joinedAt: string;
}
