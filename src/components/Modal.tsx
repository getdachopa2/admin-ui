import React from 'react';

export default function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="w-full max-w-5xl overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-800 p-4">
          <div className="text-lg font-semibold">{title}</div>
          <button className="btn-outline" onClick={onClose}>Kapat</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
