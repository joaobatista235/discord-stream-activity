import { useState, useCallback, useRef } from 'react';
import { useApp } from '../../app/AppContext';
import { stopStream } from '../../services/api.client';
import './StreamingBanner.css';

const TRANSMITTER_URL = import.meta.env.VITE_TRANSMITTER_URL ?? 'http://localhost:5174';
const LIVEKIT_DIRECT_URL = import.meta.env.VITE_LIVEKIT_DIRECT_URL ?? '';

export function StreamingBanner() {
  const { state, dispatch } = useApp();
  const { user, myStream } = state;

  const [copied, setCopied] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const urlInputRef = useRef<HTMLInputElement>(null);

  if (!myStream || !user) return null;

  const transmitterUrl = (() => {
    const url = new URL(`${TRANSMITTER_URL}/`);
    url.searchParams.set('token', myStream.livekitToken);
    url.searchParams.set('url', LIVEKIT_DIRECT_URL);
    url.searchParams.set('room', myStream.roomId);
    url.searchParams.set('name', user.displayName);
    return url.toString();
  })();

  const copyUrl = useCallback(() => {
    const doCopy = () => {
      if (urlInputRef.current) {
        urlInputRef.current.select();
        urlInputRef.current.setSelectionRange(0, 99999);
        try {
          document.execCommand('copy');
          setCopied(true);
          setTimeout(() => setCopied(false), 3000);
        } catch { /* ignore */ }
      }
    };

    navigator.clipboard?.writeText(transmitterUrl)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 3000); })
      .catch(doCopy) ?? doCopy();
  }, [transmitterUrl]);

  const handleStop = useCallback(async () => {
    setIsStopping(true);
    try {
      await stopStream({
        roomId: myStream.roomId,
        accessToken: user.accessToken,
      });
    } catch {
      // Ignorar erros no stop (pode já ter encerrado)
    } finally {
      dispatch({ type: 'MY_STREAM_STOPPED' });
      setIsStopping(false);
    }
  }, [myStream.roomId, user.accessToken, dispatch]);

  return (
    <div className="streaming-banner">
      <div className="streaming-banner-info">
        <div className="live-badge"><span className="dot" aria-hidden="true" /> AO VIVO</div>
        <span className="streaming-banner-title">Sua transmissão está ativa</span>
      </div>

      <div className="streaming-banner-url-box">
        <input
          ref={urlInputRef}
          type="text"
          readOnly
          value={transmitterUrl}
          className="streaming-banner-url-input"
          aria-label="URL do transmissor"
          onClick={(e) => (e.target as HTMLInputElement).select()}
        />
        <button
          className={`btn btn-sm ${copied ? 'btn-success' : 'btn-primary'}`}
          onClick={copyUrl}
        >
          {copied ? '✓ Copiado' : '📋 Copiar'}
        </button>
      </div>

      <button
        className="btn btn-sm btn-danger streaming-banner-stop"
        onClick={handleStop}
        disabled={isStopping}
      >
        {isStopping ? '...' : '⏹ Encerrar'}
      </button>
    </div>
  );
}
