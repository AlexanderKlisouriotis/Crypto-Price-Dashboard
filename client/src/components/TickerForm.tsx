import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';

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
    <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '400px' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          placeholder="Add ticker..."
          pattern="[a-zA-Z0-9]{3,10}"
          title="3-10 letters or numbers"
          required
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '12px 16px',
            fontSize: '1rem',
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: '6px',
            color: 'var(--foreground)',
            outline: 'none',
            transition: 'all 0.2s ease',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'var(--primary)';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(88, 166, 255, 0.3)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--card-border)';
            e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
          }}
        />
        <button
          type="submit"
          disabled={isLoading}
          style={{
            position: 'absolute',
            right: '8px',
            background: 'var(--primary)',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'opacity 0.2s',
            opacity: symbol ? 1 : 0.8
          }}
        >
          {isLoading ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <Search size={18} />
          )}
        </button>
      </div>
    </form>
  );
}

