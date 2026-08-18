import { useState, useCallback, useEffect } from 'react';
import { useApp } from '../../app/AppContext';
import { startStream, joinRoom, getActiveStreams } from '../../services/api.client';
import './Lobby.css';

export function Lobby() {
  const { state, dispatch } = useApp();
  const [isStartingStream, setIsStartingStream] = useState(false);
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { user, session, activeRooms, myStream } = state;

  // Poll for active streams in the channel every 3s
  useEffect(() => {
    if (!session?.channelId || !session?.guildId) return;
    const interval = setInterval(async () => {
      try {
        const rooms = await getActiveStreams(session.channelId, session.guildId);
        dispatch({ type: 'ACTIVE_ROOMS_UPDATED', payload: rooms });
      } catch { /* ignore polling errors */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [session?.channelId, session?.guildId, dispatch]);

  const handleStartStream = useCallback(async () => {
    if (!user || !session) return;
    setError(null);
    setIsStartingStream(true);

    try {
      const result = await startStream({
        sessionId: session.sessionId,
        accessToken: user.accessToken,
      });

      dispatch({
        type: 'MY_STREAM_STARTED',
        payload: { roomId: result.roomId, livekitToken: result.livekitToken },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível iniciar a transmissão.';
      setError(message);
    } finally {
      setIsStartingStream(false);
    }
  }, [user, session, dispatch]);

  const handleWatchStream = useCallback(async (roomId: string) => {
    if (!user) return;
    setError(null);
    setJoiningRoomId(roomId);

    try {
      const result = await joinRoom({
        roomId,
        accessToken: user.accessToken,
      });

      dispatch({
        type: 'JOINED_AS_VIEWER',
        payload: {
          roomId: result.roomId,
          livekitToken: result.livekitToken,
          livekitUrl: result.livekitUrl,
          streamerName: result.streamerName,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível entrar como espectador.';
      setError(message);
    } finally {
      setJoiningRoomId(null);
    }
  }, [user, dispatch]);

  return (
    <div className="lobby animate-fadeIn">
      {/* Header */}
      <header className="lobby-header">
        <div className="lobby-brand">
          <svg width="28" height="28" viewBox="0 0 40 40" fill="none" aria-hidden="true">
            <rect width="40" height="40" rx="10" fill="var(--color-brand)" />
            <path d="M17 14l10 6-10 6V14z" fill="white" />
          </svg>
          <span className="lobby-brand-name">Stream Activity</span>
        </div>

        {user && (
          <div className="lobby-user">
            <div className="avatar" style={{ width: 28, height: 28 }}>
              {user.avatar
                ? <img src={user.avatar} alt={user.displayName} />
                : <span>{user.displayName[0]?.toUpperCase()}</span>
              }
            </div>
            <span className="lobby-username">{user.displayName}</span>
          </div>
        )}
      </header>

      {/* Main */}
      <main className="lobby-main" style={{ paddingBottom: myStream ? '80px' : 0 }}>
        {activeRooms.length > 0 ? (
          <div className="lobby-streams-grid">
            <h2 className="lobby-title">Transmissões ao vivo no canal</h2>
            <div className="streams-list">
              {activeRooms.map((room) => {
                const isMyStream = room.roomId === myStream?.roomId;

                return (
                  <div key={room.roomId} className="stream-card">
                    <div className="stream-card-content">
                      <div className="stream-card-header">
                        <div className="live-badge"><span className="dot" aria-hidden="true" /> AO VIVO</div>
                        <span className="stream-card-viewers">👥 {room.viewerCount}</span>
                      </div>
                      <div className="stream-card-body">
                        <h3>{isMyStream ? 'Sua Transmissão' : `${room.streamerName} está transmitindo`}</h3>
                        <p>{isMyStream ? 'Você está ao vivo neste momento.' : 'Clique para assistir à tela.'}</p>
                      </div>
                    </div>
                    <div className="stream-card-actions">
                      {isMyStream ? (
                        <span className="stream-card-badge-self">Você</span>
                      ) : (
                        <button
                          className="btn btn-primary"
                          onClick={() => handleWatchStream(room.roomId)}
                          disabled={joiningRoomId === room.roomId}
                        >
                          {joiningRoomId === room.roomId ? 'Conectando...' : 'Assistir'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {!myStream && (
              <div className="lobby-actions-bottom">
                <button
                  className="btn btn-ghost"
                  onClick={handleStartStream}
                  disabled={isStartingStream}
                >
                  {isStartingStream ? 'Iniciando...' : '🎥 Iniciar minha transmissão'}
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Waiting state */
          <div className="lobby-waiting-state">
            <div className="lobby-idle-icon" aria-hidden="true">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8M12 17v4" />
              </svg>
            </div>

            <div className="lobby-idle-text">
              <h1 className="lobby-title">Nenhuma transmissão ativa</h1>
              <p className="lobby-subtitle">
                Seja o primeiro a compartilhar sua tela com o grupo.
              </p>
            </div>

            {!myStream && (
              <button
                id="start-stream-btn"
                className="btn btn-primary btn-lg"
                onClick={handleStartStream}
                disabled={isStartingStream}
              >
                {isStartingStream
                  ? <><div className="spinner" style={{width:18,height:18}} /> Iniciando...</>
                  : '🎥 Transmitir'
                }
              </button>
            )}
          </div>
        )}

        {error && (
          <div className="lobby-error" role="alert">
            <span>⚠️</span> {error}
          </div>
        )}
      </main>
    </div>
  );
}
