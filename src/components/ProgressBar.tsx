export function IndeterminateBar() {
  return (
    <div className="w-full h-2 bg-gray-200 rounded overflow-hidden">
      <div className="h-full w-1/3 bg-primary animate-[indeterminate_1.4s_infinite]" style={{ animation: 'indeterminate 1.4s infinite' }} />
      <style>{`
        @keyframes indeterminate {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(50%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}

export function SolidProgress({ value }: { value: number }) {
  return (
    <div className="w-full h-2 bg-gray-200 rounded">
      <div className="h-2 bg-primary rounded" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}
