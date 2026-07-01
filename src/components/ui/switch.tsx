'use client';

import React from 'react';

interface BillingSwitchProps {
  isAnnual: boolean;
  onChange: (isAnnual: boolean) => void;
}

export function BillingSwitch({ isAnnual, onChange }: BillingSwitchProps) {
  return (
    <div className="flex items-center justify-center py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl shadow-sm mb-14">
      <div className="bg-zinc-200/60 dark:bg-zinc-900 p-1.5 rounded-full flex items-center space-x-3 border border-zinc-250 dark:border-zinc-800/80">
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-full transition-all duration-300 cursor-pointer ${
            !isAnnual 
              ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' 
              : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
          }`}
        >
          Mensal
        </button>
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-full transition-all duration-300 cursor-pointer ${
            isAnnual 
              ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' 
              : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
          }`}
        >
          Anual
        </button>
        <span className="text-[9px] px-2.5 py-1 rounded-full font-extrabold tracking-wide uppercase bg-brand text-white shadow-[0_2px_8px_rgba(0,28,255,0.25)] whitespace-nowrap shrink-0">
          2 MESES GRÁTIS
        </span>
      </div>
    </div>
  );
}
