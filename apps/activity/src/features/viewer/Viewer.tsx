import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Room,
  RoomEvent,
  Track,
  type RemoteParticipant,
  type RemoteTrackPublication,
} from 'livekit-client';
import { useApp } from '../../app/AppContext';
import { getRoomState } from '../../services/api.client';
import './Viewer.css';

type ViewerStatus = 'connecting' | 'watching' | 'reconnecting' | 'ended' | 'error';

export function Viewer() {
  const { state, dispatch } = useApp();
  const { watching, myStream } = state;

  const roomRef = useRef<Room | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [status, setStatus] = useState<ViewerStatus>('connecting');
  const [streamerName, setStreamerName] = useState<string>(watching?.streamerName ?? '');
  const [viewerCount, setViewerCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!watching) return;
    let mounted = true;

    async function connect() {
      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;

      const attachVideo = (
        publication: RemoteTrackPublication,
        participant: RemoteParticipant
      ) => {
        if (publication.kind !== Track.Kind.Video) return;
        const track = publication.videoTrack;
        if (track && videoRef.current) {
          track.attach(videoRef.current);
        }
        if (mounted) {
          setStreamerName(participant.name ?? participant.identity);
          setStatus('watching');
        }
      };

      room.on(RoomEvent.TrackSubscribed, (_, publication, participant) => {
        attachVideo(publication as RemoteTrackPublication, participant);
      });

      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        if (track.kind === Track.Kind.Video && videoRef.current) {
          videoRef.current.srcObject = null;
        }
        if (mounted) setStatus('ended');
      });

      room.on(RoomEvent.ParticipantConnected, () => {
        if (mounted) setViewerCount(room.remoteParticipants.size);
      });

      room.on(RoomEvent.ParticipantDisconnected, () => {
        if (mounted) setViewerCount(room.remoteParticipants.size);
      });

      room.on(RoomEvent.Reconnecting, () => {
        if (mounted) setStatus('reconnecting');
      });

      room.on(RoomEvent.Reconnected, () => {
        if (mounted) setStatus('watching');
      });

      room.on(RoomEvent.Disconnected, () => {
        if (mounted) setStatus('ended');
      });

      try {
        if(!watching) return;
        
        await room.connect(watching.livekitUrl, watching.livekitToken);
        if (!mounted) return;

        setViewerCount(room.remoteParticipants.size);

        for (const [, participant] of room.remoteParticipants) {
          for (const [, publication] of participant.trackPublications) {
            if (publication.isSubscribed && publication.videoTrack) {
              attachVideo(publication as RemoteTrackPublication, participant);
            }
          }
        }
      } catch {
        if (!mounted) return;
        setError('Não foi possível conectar à transmissão.');
        setStatus('error');
      }
    }

    void connect();
    return () => {
      mounted = false;
      void roomRef.current?.disconnect();
    };
  }, [watching]);

  const handleRetry = useCallback(async () => {
    if (!watching?.roomId) return;
    setStatus('connecting');
    setError(null);

    try {
      const roomState = await getRoomState(watching.roomId);
      if (roomState.status !== 'LIVE') {
        dispatch({ type: 'LEFT_VIEWER' });
      }
    } catch {
      dispatch({ type: 'LEFT_VIEWER' });
    }
  }, [watching?.roomId, dispatch]);

  const handleLeave = useCallback(() => {
    void roomRef.current?.disconnect();
    dispatch({ type: 'LEFT_VIEWER' });
  }, [dispatch]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  return (
    <div 
      className={`viewer animate-fadeIn ${isFullscreen ? 'viewer-fullscreen' : ''}`} 
      ref={containerRef} 
      style={{ paddingBottom: myStream && !isFullscreen ? '80px' : 0 }}
    >
      {/* Header */}
      <header className="viewer-header">
        <div className="viewer-header-left">
          {status !== 'error' && status !== 'ended' && (
            <>
              <div className="live-badge"><span className="dot" aria-hidden="true" /> AO VIVO</div>
              {streamerName && <span className="viewer-streamer-name">{streamerName}</span>}
            </>
          )}
          {status === 'connecting' && (
            <span className="viewer-status-text connecting">Conectando...</span>
          )}
          {status === 'reconnecting' && (
            <span className="viewer-status-text reconnecting">
              <div className="spinner" style={{width:14,height:14}} />
              Reconectando...
            </span>
          )}
          {status === 'ended' && (
            <span className="viewer-status-text ended">Transmissão encerrada</span>
          )}
        </div>

        <div className="viewer-header-right">
          {status === 'watching' && (
            <span className="viewer-count">👥 {viewerCount}</span>
          )}
        </div>
      </header>

      {/* Video */}
      <main className="viewer-main">
        {(status === 'error' || status === 'ended') ? (
          <div className="viewer-ended">
            {status === 'ended' ? (
              <>
                <div className="viewer-ended-icon">📺</div>
                <h2>Transmissão encerrada</h2>
                <p>{streamerName ? `${streamerName} encerrou a transmissão.` : 'A transmissão foi encerrada.'}</p>
                <div style={{display:'flex',gap:'var(--space-3)'}}>
                  <button className="btn btn-ghost" onClick={handleLeave}>Voltar ao lobby</button>
                  <button className="btn btn-primary" onClick={handleRetry}>Tentar novamente</button>
                </div>
              </>
            ) : (
              <>
                <div className="viewer-ended-icon">⚠️</div>
                <h2>Erro de conexão</h2>
                <p>{error}</p>
                <button className="btn btn-primary" onClick={handleRetry}>
                  Tentar novamente
                </button>
                <button className="btn btn-ghost" onClick={handleLeave} style={{marginTop: 8}}>
                  Sair
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="video-wrapper viewer-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              aria-label="Transmissão ao vivo"
            />
            {(status === 'connecting' || status === 'reconnecting') && (
              <div className="viewer-video-overlay">
                <div className="spinner" />
                <span>
                  {status === 'reconnecting' 
                    ? 'Reconectando...' 
                    : 'Aguardando o transmissor compartilhar a tela...'}
                </span>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Controls */}
      {status !== 'error' && status !== 'ended' && (
        <footer className="viewer-footer" style={{ bottom: myStream && !isFullscreen ? '80px' : 0 }}>
          <button id="leave-stream-btn" className="btn btn-ghost" onClick={handleLeave}>
            ← Sair
          </button>
          <button
            id="fullscreen-btn"
            className="btn btn-ghost"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Sair do modo tela cheia' : 'Tela cheia'}
          >
            {isFullscreen ? '⛶ Sair da tela cheia' : '⛶ Tela cheia'}
          </button>
        </footer>
      )}
    </div>
  );
}
