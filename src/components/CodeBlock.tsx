import { useState } from 'react';

export default function CodeBlock({ value, lang }: { value: unknown; lang?: 'json' | 'xml' | 'text' }) {
  const [copied, setCopied] = useState(false);
  const str =
    typeof value === 'string'
      ? value
      : JSON.stringify(value, null, 2);

  const copy = async () => {
    await navigator.clipboard.writeText(str);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="relative">
      <button onClick={copy} className="absolute right-2 top-2 text-xs border rounded px-2 py-1 bg-white">
        {copied ? 'Kopyalandı' : 'Kopyala'}
      </button>
      <pre className="text-sm overflow-auto bg-black/90 text-green-100 rounded-md p-3">
        <code className={`language-${lang ?? 'text'}`}>{str}</code>
      </pre>
    </div>
  );
}
