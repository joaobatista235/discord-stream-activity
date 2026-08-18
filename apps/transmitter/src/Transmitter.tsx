import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Room,
  RoomEvent,
  Track,
  createLocalScreenTracks,
  type LocalTrack,
} from 'livekit-client';

// Messages sent to the Discord Activity (opener window)
export type TransmitterMessage =
  | { type: 'TRANSMITTER_READY' }
  | { type: 'STREAM_LIVE'; roomId: string }
  | { type: 'STREAM_STOPPED' }
  | { type: 'STREAM_ERROR'; message: string };

function notifyOpener(msg: TransmitterMessage) {
  try {
    // postMessage to the Activity window that opened this popup
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(msg, '*');
    }
    // Also broadcast to parent in case we're in an iframe (shouldn't happen, but safe)
    if (window.parent !== window) {
      window.parent.postMessage(msg, '*');
    }
  } catch {
    // Cross-origin restrictions — ignore
  }
}

type Status = 'idle' | 'selecting' | 'connecting' | 'live' | 'stopping' | 'stopped' | 'error';

interface Props {
  token: string;
  livekitUrl: string;
  roomId: string;
  streamerName: string;
}

export function Transmitter({ token, livekitUrl, roomId, streamerName }: Props) {
  const roomRef = useRef<Room | null>(null);
  const tracksRef = useRef<LocalTrack[]>([]);
  const previewRef = useRef<HTMLVideoElement>(null);

  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [resolution, setResolution] = useState<string>('');
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef<number>(0);

  // Notify Activity when this window loads
  useEffect(() => {
    notifyOpener({ type: 'TRANSMITTER_READY' });
  }, []);

  // Elapsed timer while live
  useEffect(() => {
    if (status !== 'live') return;
    startTimeRef.current = Date.now();
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [status]);

  // Cleanup on unmount / window close
  useEffect(() => {
    const handleUnload = () => {
      notifyOpener({ type: 'STREAM_STOPPED' });
      tracksRef.current.forEach((t) => t.stop());
      void roomRef.current?.disconnect();
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      tracksRef.current.forEach((t) => t.stop());
      void roomRef.current?.disconnect();
    };
  }, []);

  const startCapture = useCallback(async () => {
    setStatus('selecting');
    setError(null);

    let screenTracks: LocalTrack[];

    try {
      // This works because we're NOT inside a Discord iframe
      screenTracks = await createLocalScreenTracks({
        audio: true,
        resolution: { width: 1920, height: 1080, frameRate: 60 },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Permissão negada para captura de tela.';
      setError(msg);
      setStatus('error');
      notifyOpener({ type: 'STREAM_ERROR', message: msg });
      return;
    }

    setStatus('connecting');

    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;

    room.on(RoomEvent.Disconnected, () => {
      setStatus('stopped');
      notifyOpener({ type: 'STREAM_STOPPED' });
    });

    room.on(RoomEvent.Reconnecting, () => setStatus('connecting'));
    room.on(RoomEvent.Reconnected, () => setStatus('live'));

    try {
      await room.connect(livekitUrl, token);

      tracksRef.current = screenTracks;

      for (const track of screenTracks) {
        await room.localParticipant.publishTrack(track);

        if (track.kind === Track.Kind.Video) {
          // Local preview
          const ms = new MediaStream([track.mediaStreamTrack]);
          if (previewRef.current) {
            previewRef.current.srcObject = ms;
            void previewRef.current.play().catch(() => {});
          }

          const s = track.mediaStreamTrack.getSettings();
          if (s.width && s.height) setResolution(`${s.width}×${s.height}`);

          // If the user clicks "Stop sharing" in the browser native dialog
          track.mediaStreamTrack.addEventListener('ended', () => {
            void handleStop();
          });
        }
      }

      setStatus('live');
      notifyOpener({ type: 'STREAM_LIVE', roomId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao conectar ao servidor de mídia.';
      setError(msg);
      setStatus('error');
      notifyOpener({ type: 'STREAM_ERROR', message: msg });
      screenTracks.forEach((t) => t.stop());
    }
  }, [livekitUrl, token, roomId]);

  const handleStop = useCallback(async () => {
    setStatus('stopping');
    tracksRef.current.forEach((t) => t.stop());
    tracksRef.current = [];
    await roomRef.current?.disconnect();
    setStatus('stopped');
    notifyOpener({ type: 'STREAM_STOPPED' });
  }, []);

  function formatTime(s: number) {
    const h = Math.floor(s / 3600).toString().padStart(2, '0');
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return h !== '00' ? `${h}:${m}:${sec}` : `${m}:${sec}`;
  }

  return (
    <div className="transmitter">
      <header className="tx-header">
        <div className="tx-logo">
          <span className="tx-logo-icon">📡</span>
          <span className="tx-logo-text">Discord Stream</span>
        </div>
        {status === 'live' && (
          <div className="tx-badge live">
            <span className="tx-dot" />
            AO VIVO · {formatTime(elapsed)}
          </div>
        )}
        {status === 'connecting' && (
          <div className="tx-badge connecting">
            <div className="tx-spinner" />
            Conectando...
          </div>
        )}
      </header>

      <main className="tx-main">
        {/* Video preview */}
        {(status === 'live' || status === 'connecting' || status === 'stopping') && (
          <div className="tx-preview-wrap">
            <video
              ref={previewRef}
              className="tx-preview"
              autoPlay
              muted
              playsInline
              aria-label="Preview da sua transmissão"
            />
            {status === 'connecting' && (
              <div className="tx-preview-overlay">
                <div className="tx-spinner large" />
                <span>Conectando ao LiveKit...</span>
              </div>
            )}
            {resolution && status === 'live' && (
              <div className="tx-resolution">{resolution}</div>
            )}
          </div>
        )}

        {/* Idle state */}
        {status === 'idle' && (
          <div className="tx-idle">
            <div className="tx-idle-icon">🖥️</div>
            <h1 className="tx-title">Pronto para transmitir</h1>
            <p className="tx-subtitle">
              Olá, <strong>{streamerName}</strong>! Clique no botão abaixo para selecionar o que
              compartilhar — tela inteira, janela ou aba do navegador.
            </p>
            <p className="tx-room-info">Sala: <code>{roomId.slice(0, 8)}…</code></p>
          </div>
        )}

        {/* Selecting (waiting for browser dialog) */}
        {status === 'selecting' && (
          <div className="tx-idle">
            <div className="tx-idle-icon spinning">🔄</div>
            <h1 className="tx-title">Selecionando fonte...</h1>
            <p className="tx-subtitle">Escolha o que deseja compartilhar na janela do navegador.</p>
          </div>
        )}

        {/* Stopped */}
        {status === 'stopped' && (
          <div className="tx-idle">
            <div className="tx-idle-icon">✅</div>
            <h1 className="tx-title">Transmissão encerrada</h1>
            <p className="tx-subtitle">Você pode fechar esta aba.</p>
            <button className="tx-btn secondary" onClick={() => window.close()}>
              Fechar
            </button>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="tx-idle">
            <div className="tx-idle-icon">⚠️</div>
            <h1 className="tx-title">Erro na transmissão</h1>
            <p className="tx-error-msg">{error}</p>
            <button className="tx-btn primary" onClick={() => { setStatus('idle'); setError(null); }}>
              Tentar novamente
            </button>
          </div>
        )}
      </main>

      <footer className="tx-footer">
        {status === 'idle' && (
          <button id="start-capture-btn" className="tx-btn primary large" onClick={() => void startCapture()}>
            🎥 Iniciar captura de tela
          </button>
        )}

        {(status === 'live' || status === 'connecting') && (
          <>
            <p className="tx-warning">
              ⚠️ Tudo que aparecer na fonte selecionada pode ser visto pelos espectadores.
            </p>
            <button
              id="stop-stream-btn"
              className="tx-btn danger"
              onClick={() => void handleStop()}
              disabled={status === 'connecting'}
            >
              ⏹ Encerrar transmissão
            </button>
          </>
        )}

        {status === 'stopping' && (
          <button className="tx-btn danger" disabled>
            Encerrando...
          </button>
        )}
      </footer>
    </div>
  );
}
