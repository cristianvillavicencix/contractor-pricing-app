"use client";

import { useState } from "react";
import { Wand2, X } from "lucide-react";
import { TRADE_WIZARDS, type Answers, type Question } from "@/lib/scope-builder";

export function ScopeWizard({
  trade,
  onGenerate,
}: {
  trade: string;
  onGenerate: (text: string) => void;
}) {
  const wizard = TRADE_WIZARDS[trade];
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<Answers>(() => {
    if (!wizard) return {};
    return Object.fromEntries(wizard.questions.map((q) => [q.id, q.default]));
  });

  if (!wizard) return null;

  function setAnswer(id: string, value: Answers[string]) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function generate() {
    const text = wizard.generate(answers);
    onGenerate(text);
    setOpen(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-[#d9e2ec] py-2.5 text-sm font-medium text-gray-600 transition hover:border-[#111111] hover:text-[#111111]"
      >
        <Wand2 className="h-3.5 w-3.5" />
        Build scope · {trade} wizard
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#213343]/30 px-4 py-6 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-[#d9e2ec] bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#d9e2ec] px-6 py-4">
              <div className="flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-[#ff5c35]" />
                <h3 className="font-semibold tracking-tight">{trade} Scope Builder</h3>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-gray-400 transition hover:bg-[#f6f8fb] hover:text-black"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Questions — scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <p className="mb-5 text-sm text-gray-500">
                Answer the questions below and we&apos;ll generate a professional scope of work.
              </p>
              <div className="space-y-4">
                {wizard.questions.map((q) => (
                  <QuestionField
                    key={q.id}
                    question={q}
                    value={answers[q.id]}
                    onChange={(v) => setAnswer(q.id, v)}
                  />
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 border-t border-[#d9e2ec] px-6 py-4">
              <button
                onClick={generate}
                className="flex flex-1 items-center justify-center gap-2 rounded-md bg-[#111111] py-3 text-sm font-medium text-white transition hover:bg-[#333333]"
              >
                <Wand2 className="h-3.5 w-3.5" />
                Generate Scope
              </button>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md border border-[#d9e2ec] px-5 py-3 text-sm font-medium transition hover:bg-[#f6f8fb]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function QuestionField({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: Answers[string];
  onChange: (v: Answers[string]) => void;
}) {
  if (question.type === "select") {
    return (
      <label className="block text-sm font-medium text-gray-700">
        {question.label}
        <select
          value={String(value ?? question.default)}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1.5 w-full rounded-md border border-[#d9e2ec] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#111111]"
        >
          {question.options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </label>
    );
  }

  if (question.type === "number") {
    return (
      <label className="block text-sm font-medium text-gray-700">
        {question.label}
        <div className="relative mt-1.5">
          <input
            type="number"
            min={question.min ?? 0}
            value={Number(value ?? question.default) || ""}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full rounded-md border border-[#d9e2ec] py-2.5 pl-3 pr-12 text-sm outline-none focus:border-[#111111]"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">
            {question.unit}
          </span>
        </div>
      </label>
    );
  }

  // checkbox
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-md border border-[#d9e2ec] px-4 py-3 text-sm text-gray-700 transition hover:bg-[#f6f8fb]">
      {question.label}
      <input
        type="checkbox"
        checked={Boolean(value ?? question.default)}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[#111111]"
      />
    </label>
  );
}
