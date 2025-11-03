import React, { useEffect, useMemo, useRef, useState } from 'react';
import { searchClients, ClientHit } from '@/services/os';

type Props = {
  value?: string | null;                 // cliente_id
  onChange: (id: string | null, label?: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export default function ClientAutocomplete({ value, onChange, placeholder, disabled, className }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<ClientHit[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  // fecha dropdown ao clicar fora
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // debounce
  useEffect(() => {
    const t = setTimeout(async () => {
      const q = query.trim();
      if (q.length < 2) { setHits([]); return; }
      setLoading(true);
      const res = await searchClients(q, 20);
      setHits(res);
      setLoading(false);
      setOpen(true);
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const selectedLabel = useMemo(() => {
    const found = hits.find(h => h.id === value);
    return found?.label;
  }, [hits, value]);

  return (
    <div className={`relative ${className || ''}`} ref={ref}>
      <input
        className="w-full border rounded px-3 py-2"
        placeholder={placeholder ?? 'Nome/CPF/CNPJ (MVP texto ou ID)'}
        value={query || selectedLabel || ''}
        onChange={e => { setQuery(e.target.value); onChange(null); }}
        onFocus={() => { if (query.length >= 2 && hits.length) setOpen(true); }}
        disabled={disabled}
      />
      {loading && <div className="absolute right-2 top-2 text-xs text-gray-500">…</div>}
      {open && hits.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white border rounded shadow-lg max-h-56 overflow-auto">
          {hits.map(h => (
            <div
              key={h.id}
              className="px-3 py-2 cursor-pointer hover:bg-gray-50"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(h.id, h.label);
                setQuery(h.label);
                setOpen(false);
              }}
            >
              {h.label}
            </div>
          ))}
        </div>
      )}
      {open && !loading && hits.length === 0 && query.length >= 2 && (
        <div className="absolute z-10 mt-1 w-full bg-white border rounded shadow px-3 py-2 text-sm text-gray-500">
          Sem resultados
        </div>
      )}
    </div>
  );
}
