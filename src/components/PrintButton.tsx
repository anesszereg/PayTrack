"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print mt-4 w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
    >
      Print / Save as PDF
    </button>
  );
}
