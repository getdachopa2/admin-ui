// src/components/CodeBlock.tsx
import { useMemo, useState } from 'react';
import { Copy, Wand2 } from 'lucide-react';

function pretty(input: unknown): { text: string; lang: 'json' | 'xml' | 'text' } {
  if (typeof input === 'string') {
    const s = input.trim();
    // XML / SOAP
    if (s.startsWith('<')) {
      try {
        const formatted = formatXml(s);
        return { text: formatted, lang: 'xml' };
      } catch { /* fallthrough */ }
    }
    // JSON
    try {
      const obj = JSON.parse(s);
      return { text: JSON.stringify(obj, null, 2), lang: 'json' };
    } catch { /* plain */ }
    return { text: s, lang: s.startsWith('<') ? 'xml' : 'text' };
  }
  try {
    return { text: JSON.stringify(input, null, 2), lang: 'json' };
  } catch {
    return { text: String(input ?? ''), lang: 'text' };
  }
}

function formatXml(xml: string) {
  const P = />(\s*)</g;
  let formatted = '';
  let pad = 0;
  xml
    .replace(P, '>\n<')
    .split('\n')
    .forEach((node) => {
      if (!node) return;
      let indent = 0;
      if (node.match(/^<\/\w/)) pad--;
      if (node.match(/^<\w[^>]*[^\/]>.*$/)) indent = 1;
      formatted += '  '.repeat(pad) + node + '\n';
      pad += indent;
    });
  return formatted.trim();
}

export default function CodeBlock({
  value,
  className = '',
}: {
  value: unknown;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [rawMode, setRawMode] = useState(false);

  const prepared = useMemo(() => pretty(value), [value]);
  const raw = useMemo(() => {
    if (typeof value === 'string') return value;
    try { return JSON.stringify(value); } catch { return String(value ?? ''); }
  }, [value]);

  const shown = rawMode ? raw : prepared.text;

  const doCopy = async () => {
    await navigator.clipboard.writeText(shown);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className={`rounded-xl border border-base-800 bg-base-900 ${className}`}>
      <div className="flex items-center justify-between border-b border-base-800 px-2 py-1.5">
        <div className="text-[11px] uppercase tracking-wider text-base-500">
          {rawMode ? 'Raw' : prepared.lang.toUpperCase()}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            className="grid h-7 w-7 place-items-center rounded-md text-base-300 hover:bg-base-800"
            onClick={() => setRawMode((s) => !s)}
            title="Beautify / Raw"
          >
            <Wand2 size={16} />
          </button>
          <button
            className="grid h-7 w-7 place-items-center rounded-md text-base-300 hover:bg-base-800"
            onClick={doCopy}
            title="Kopyala"
          >
            <Copy size={16} />
          </button>
          <span className="text-xs text-emerald-400">{copied ? 'Kopyalandı' : ''}</span>
        </div>
      </div>
      <pre className="max-h-[360px] overflow-auto p-3 text-[13px] leading-5 text-base-100">
        <code>{shown}</code>
      </pre>
    </div>
  );
}
