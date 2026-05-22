"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Calculator, X } from "lucide-react";


type Operator = "+" | "-" | "x" | "/";

const DECIMALS = 2;
const numberButtons = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "0", "."];

export function FloatingCalculatorButton() {
  const pathname = usePathname();
  const clusterRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [display, setDisplay] = useState("0");
  const [storedValue, setStoredValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<Operator | null>(null);
  const [shouldResetDisplay, setShouldResetDisplay] = useState(false);
  const [copied, setCopied] = useState(false);

  const shouldHide =
    pathname.startsWith("/quotes/preview") ||
    pathname.startsWith("/quotes/editor") ||
    pathname.startsWith("/proposals/preview") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/onboarding");

  useEffect(() => {
    if (!isOpen) return;
    function handlePointerDown(event: PointerEvent) {
      if (clusterRef.current && !clusterRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableElement(event.target)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key;
      if (/^\d$/.test(key)) { event.preventDefault(); inputNumber(key); return; }
      if (key === ".") { event.preventDefault(); inputNumber("."); return; }
      if (key === "+") { event.preventDefault(); chooseOperator("+"); return; }
      if (key === "-") { event.preventDefault(); chooseOperator("-"); return; }
      if (key === "*") { event.preventDefault(); chooseOperator("x"); return; }
      if (key === "/") { event.preventDefault(); chooseOperator("/"); return; }
      if (key === "Enter" || key === "=") { event.preventDefault(); runEquals(); return; }
      if (key === "Backspace") { event.preventDefault(); backspace(); return; }
      if (key === "Escape") { event.preventDefault(); setIsOpen(false); return; }
      if (key.toLowerCase() === "c") { event.preventDefault(); clearCalculator(); }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [display, isOpen, operator, shouldResetDisplay, storedValue]);

  if (shouldHide) return null;

  function inputNumber(value: string) {
    if (value === "." && display.includes(".") && !shouldResetDisplay) return;
    if (shouldResetDisplay) {
      setDisplay(value === "." ? "0." : value);
      setShouldResetDisplay(false);
      return;
    }
    setDisplay((cur) => cur === "0" && value !== "." ? value : `${cur}${value}`);
  }

  function chooseOperator(nextOperator: Operator) {
    const current = Number(display);
    if (storedValue !== null && operator) {
      const result = calculate(storedValue, current, operator);
      setStoredValue(result);
      setDisplay(fmt(result));
    } else {
      setStoredValue(current);
    }
    setOperator(nextOperator);
    setShouldResetDisplay(true);
  }

  function runEquals() {
    if (storedValue === null || !operator) return;
    const current = Number(display);
    const result = calculate(storedValue, current, operator);
    setDisplay(fmt(result));
    setStoredValue(null);
    setOperator(null);
    setShouldResetDisplay(true);
  }

  function clearCalculator() {
    setDisplay("0");
    setStoredValue(null);
    setOperator(null);
    setShouldResetDisplay(false);
  }

  function backspace() {
    setDisplay((cur) => {
      if (shouldResetDisplay || cur.length === 1) return "0";
      return cur.slice(0, -1);
    });
  }

  function toggleSign() {
    setDisplay((cur) => {
      if (cur === "0") return cur;
      return cur.startsWith("-") ? cur.slice(1) : `-${cur}`;
    });
  }

  async function copyResult() {
    await navigator.clipboard.writeText(display);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div
      ref={clusterRef}
      className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2 sm:bottom-6 sm:right-6"
    >
      {/* Calculator panel */}
      {isOpen && (
        <div className="mb-3 w-72 origin-bottom-right rounded-lg border border-[#d9e2ec] bg-white p-4 shadow-[0_18px_50px_rgba(33,51,67,0.18)] animate-in fade-in zoom-in-95 duration-150">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#fff1ea] text-[#ff5c35]">
                <Calculator className="h-4 w-4" />
              </div>
              <p className="text-sm font-semibold text-[#213343]">Calculator</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition hover:bg-[#f6f8fb] hover:text-[#213343]" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={copyResult}
            title="Click to copy"
            className="mb-3 w-full rounded-md border border-[#d9e2ec] bg-[#f6f8fb] px-3 py-4 text-right transition hover:border-[#b7c7d6]"
          >
            <p className="min-h-7 truncate text-2xl font-semibold tracking-tight text-[#213343]">{display}</p>
            <p className="mt-1 h-4 text-xs text-gray-400">
              {storedValue !== null && operator ? `${fmt(storedValue)} ${operator}` : copied ? "Copied" : "Click to copy"}
            </p>
          </button>

          <div className="grid grid-cols-4 gap-2">
            <CalcKey label="C" onClick={clearCalculator} muted />
            <CalcKey label="+/-" onClick={toggleSign} muted />
            <CalcKey label="⌫" onClick={backspace} muted />
            <CalcKey label="/" onClick={() => chooseOperator("/")} accent />

            {numberButtons.slice(0, 3).map((v) => <CalcKey key={v} label={v} onClick={() => inputNumber(v)} />)}
            <CalcKey label="x" onClick={() => chooseOperator("x")} accent />

            {numberButtons.slice(3, 6).map((v) => <CalcKey key={v} label={v} onClick={() => inputNumber(v)} />)}
            <CalcKey label="-" onClick={() => chooseOperator("-")} accent />

            {numberButtons.slice(6, 9).map((v) => <CalcKey key={v} label={v} onClick={() => inputNumber(v)} />)}
            <CalcKey label="+" onClick={() => chooseOperator("+")} accent />

            <CalcKey label="0" onClick={() => inputNumber("0")} className="col-span-2" />
            <CalcKey label="." onClick={() => inputNumber(".")} />
            <CalcKey label="=" onClick={runEquals} primary />
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Open calculator"
        className="flex h-13 w-13 items-center justify-center rounded-lg border border-[#d9e2ec] bg-[#ff5c35] text-white shadow-[0_10px_30px_rgba(33,51,67,0.16)] transition hover:bg-[#e94820] focus:outline-none focus:ring-4 focus:ring-[#ff5c35]/20"
      >
        <Calculator className="h-5 w-5" />
      </button>
    </div>
  );
}

function CalcKey({ label, onClick, accent = false, muted = false, primary = false, className = "" }: {
  label: string; onClick: () => void; accent?: boolean; muted?: boolean; primary?: boolean; className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`h-11 rounded-md text-sm font-semibold transition ${className} ${
        primary ? "bg-[#ff5c35] text-white hover:bg-[#e94820]"
        : accent ? "bg-[#fff1ea] text-[#ff5c35] hover:bg-[#ffe1d5]"
        : muted ? "bg-[#f6f8fb] text-[#516f90] hover:bg-[#eaf0f6]"
        : "border border-[#d9e2ec] bg-white text-[#213343] hover:bg-[#f6f8fb]"
      }`}
    >
      {label}
    </button>
  );
}

function fmt(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return Number(value.toFixed(DECIMALS)).toString();
}

function calculate(left: number, right: number, op: Operator): number {
  if (op === "+") return left + right;
  if (op === "-") return left - right;
  if (op === "x") return left * right;
  if (right === 0) return 0;
  return left / right;
}

function isEditableElement(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable;
}
