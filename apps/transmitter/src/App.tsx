import { Transmitter } from './Transmitter';

export function App() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const livekitUrl = params.get('url');
  const room = params.get('room');
  const streamerName = params.get('name') ?? 'Streamer';

  if (!token || !livekitUrl || !room) {
    return (
      <div className="error-page">
        <div className="error-card">
          <span className="error-icon">⚠️</span>
          <h1>Parâmetros inválidos</h1>
          <p>Esta página deve ser aberta pelo Discord Stream Activity.</p>
          <p className="error-detail">Parâmetros obrigatórios: <code>token</code>, <code>url</code>, <code>room</code></p>
        </div>
      </div>
    );
  }

  return (
    <Transmitter
      token={token}
      livekitUrl={livekitUrl}
      roomId={room}
      streamerName={streamerName}
    />
  );
}
