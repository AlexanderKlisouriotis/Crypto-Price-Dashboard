import { useState } from 'react';

interface TickerFormProps {
  onAdd: (symbol: string) => void;
  isLoading?: boolean;
}

export default function TickerForm({ onAdd, isLoading = false }: TickerFormProps) {
  const [symbol, setSymbol] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedSymbol = symbol.trim().toUpperCase().replace('/', '');
    if (trimmedSymbol && /^[a-zA-Z0-9]{3,10}$/.test(trimmedSymbol)) {
      onAdd(trimmedSymbol);
      setSymbol('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="ticker-form">
      <input
        type="text"
        value={symbol}
        onChange={(e) => setSymbol(e.target.value)}
        placeholder="Enter symbol (e.g., BTCUSD)"
        pattern="[a-zA-Z0-9]{3,10}"
        title="3-10 letters or numbers"
        required
        disabled={isLoading}
      />
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Adding...' : 'Add Ticker'}
      </button>
    </form>
  );
}