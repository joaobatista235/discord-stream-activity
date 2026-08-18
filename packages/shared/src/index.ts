// Public API of @discord-stream/shared
// Import everything from here to ensure consistent types across apps.

export type {
  User,
  ActivitySession,
  StreamRoom,
  RoomStatus,
  Participant,
  ParticipantRole,
} from './types/domain.js';

export {
  // Auth
  TokenExchangeRequestSchema,
  TokenExchangeResponseSchema,
  // Session
  CreateSessionRequestSchema,
  CreateSessionResponseSchema,
  // Room
  RoomStateResponseSchema,
  JoinRoomRequestSchema,
  JoinRoomResponseSchema,
  // Stream
  StartStreamRequestSchema,
  StartStreamResponseSchema,
  StopStreamRequestSchema,
  StopStreamResponseSchema,
  // Error
  ApiErrorSchema,
} from './schemas/api.schemas.js';

export type {
  TokenExchangeRequest,
  TokenExchangeResponse,
  CreateSessionRequest,
  CreateSessionResponse,
  RoomStateResponse,
  JoinRoomRequest,
  JoinRoomResponse,
  StartStreamRequest,
  StartStreamResponse,
  StopStreamRequest,
  StopStreamResponse,
  ApiError,
} from './schemas/api.schemas.js';
