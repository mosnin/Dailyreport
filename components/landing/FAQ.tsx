"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

export function FAQ({ items }: { items: FAQItem[] }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="divide-y divide-neutral-200 dark:divide-white/8">
      {items.map(({ question, answer }, i) => (
        <div key={i} className="py-5">
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between text-left gap-6 group"
          >
            <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
              {question}
            </span>
            {open === i ? (
              <Minus className="w-4 h-4 shrink-0 text-sky-500" />
            ) : (
              <Plus className="w-4 h-4 shrink-0 text-neutral-400 group-hover:text-sky-500 transition-colors" />
            )}
          </button>
          {open === i && (
            <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
              {answer}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
