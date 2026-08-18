import { z } from 'zod';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const TokenExchangeRequestSchema = z.object({
  code: z.string().min(1, 'Discord OAuth code is required'),
});

export const TokenExchangeResponseSchema = z.object({
  accessToken: z.string(),
  tokenType: z.string(),
  expiresIn: z.number(),
  scope: z.string(),
});

// ─── Session ──────────────────────────────────────────────────────────────────

export const CreateSessionRequestSchema = z.object({
  channelId: z.string().min(1),
  guildId: z.string().min(1),
  instanceId: z.string().min(1),
});

export const CreateSessionResponseSchema = z.object({
  sessionId: z.string(),
  roomId: z.string(),
  expiresAt: z.string(),
});

// ─── Room ─────────────────────────────────────────────────────────────────────

export const RoomStateResponseSchema = z.object({
  roomId: z.string(),
  status: z.enum(['WAITING', 'LIVE', 'ENDED']),
  streamerId: z.string().nullable(),
  streamerName: z.string().nullable(),
  viewerCount: z.number().int().nonnegative(),
  participants: z.array(
    z.object({
      userId: z.string(),
      displayName: z.string(),
      avatar: z.string().nullable(),
      role: z.enum(['STREAMER', 'VIEWER']),
      joinedAt: z.string(),
    })
  ),
});

export const JoinRoomRequestSchema = z.object({
  sessionId: z.string().min(1),
  role: z.enum(['STREAMER', 'VIEWER']),
});

export const JoinRoomResponseSchema = z.object({
  livekitToken: z.string(),
  livekitUrl: z.string().url(),
  roomId: z.string(),
  role: z.enum(['STREAMER', 'VIEWER']),
});

// ─── Stream ───────────────────────────────────────────────────────────────────

export const StartStreamRequestSchema = z.object({
  sessionId: z.string().min(1),
  roomId: z.string().min(1),
});

export const StartStreamResponseSchema = z.object({
  livekitToken: z.string(),
  livekitUrl: z.string().url(),
  roomId: z.string(),
});

export const StopStreamRequestSchema = z.object({
  sessionId: z.string().min(1),
  roomId: z.string().min(1),
});

export const StopStreamResponseSchema = z.object({
  success: z.boolean(),
  endedAt: z.string(),
});

// ─── Error ────────────────────────────────────────────────────────────────────

export const ApiErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
  statusCode: z.number().int(),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type TokenExchangeRequest = z.infer<typeof TokenExchangeRequestSchema>;
export type TokenExchangeResponse = z.infer<typeof TokenExchangeResponseSchema>;
export type CreateSessionRequest = z.infer<typeof CreateSessionRequestSchema>;
export type CreateSessionResponse = z.infer<typeof CreateSessionResponseSchema>;
export type RoomStateResponse = z.infer<typeof RoomStateResponseSchema>;
export type JoinRoomRequest = z.infer<typeof JoinRoomRequestSchema>;
export type JoinRoomResponse = z.infer<typeof JoinRoomResponseSchema>;
export type StartStreamRequest = z.infer<typeof StartStreamRequestSchema>;
export type StartStreamResponse = z.infer<typeof StartStreamResponseSchema>;
export type StopStreamRequest = z.infer<typeof StopStreamRequestSchema>;
export type StopStreamResponse = z.infer<typeof StopStreamResponseSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
