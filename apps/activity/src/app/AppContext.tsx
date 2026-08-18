import { createContext, useContext, useReducer, useCallback, type ReactNode } from 'react';
import type { SessionResult, ActiveRoom } from '../services/api.client';

export type AppStatus = 'INITIALIZING' | 'LOBBY' | 'WATCHING' | 'ERROR';

export interface AppUser {
  discordUserId: string;
  displayName: string;
  avatar: string | null;
  accessToken: string;
}

export interface MyStream {
  roomId: string;
  livekitToken: string;
}

export interface WatchingStream {
  roomId: string;
  livekitToken: string;
  livekitUrl: string;
  streamerName: string;
}

export interface AppState {
  status: AppStatus;
  user: AppUser | null;
  session: SessionResult | null;
  myStream: MyStream | null;
  watching: WatchingStream | null;
  activeRooms: ActiveRoom[];
  error: string | null;
}

type Action =
  | { type: 'AUTH_SUCCESS'; payload: AppUser }
  | { type: 'SESSION_CREATED'; payload: SessionResult }
  | { type: 'MY_STREAM_STARTED'; payload: MyStream }
  | { type: 'MY_STREAM_STOPPED' }
  | { type: 'JOINED_AS_VIEWER'; payload: WatchingStream }
  | { type: 'LEFT_VIEWER' }
  | { type: 'ACTIVE_ROOMS_UPDATED'; payload: ActiveRoom[] }
  | { type: 'SET_ERROR'; payload: string };

const initialState: AppState = {
  status: 'INITIALIZING',
  user: null,
  session: null,
  myStream: null,
  watching: null,
  activeRooms: [],
  error: null,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'AUTH_SUCCESS':
      return { ...state, user: action.payload };

    case 'SESSION_CREATED':
      return { ...state, session: action.payload, status: 'LOBBY' };

    case 'MY_STREAM_STARTED':
      return { ...state, myStream: action.payload };

    case 'MY_STREAM_STOPPED':
      return { ...state, myStream: null };

    case 'JOINED_AS_VIEWER':
      return { ...state, watching: action.payload, status: 'WATCHING' };

    case 'LEFT_VIEWER':
      return { ...state, watching: null, status: 'LOBBY' };

    case 'ACTIVE_ROOMS_UPDATED':
      return { ...state, activeRooms: action.payload };

    case 'SET_ERROR':
      return { ...state, status: 'ERROR', error: action.payload };

    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function useAppDispatch() {
  const { dispatch } = useApp();
  return useCallback(dispatch, [dispatch]);
}
