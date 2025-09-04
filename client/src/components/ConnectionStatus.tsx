interface ConnectionStatusProps {
  isConnected: boolean;
  error: string | null;
}

export default function ConnectionStatus({ isConnected, error }: ConnectionStatusProps) {
  return (
    <div className="status">
      <div>
        Backend Status: <span className={isConnected ? 'connected' : 'disconnected'}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
      {error && <div className="error">{error}</div>}
      {!isConnected && (
        <div className="warning">
          Make sure the backend server is running on http://localhost:8080
        </div>
      )}
    </div>
  );
}