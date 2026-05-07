"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Calculator, Clock3, DollarSign, X } from "lucide-react";

type Operator = "+" | "-" | "x" | "/";
type HistoryItem = {
  id: string;
  expression: string;
  result: string;
};

const numberButtons = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "0", "."];

export function FloatingCalculatorButton() {
  const pathname = usePathname();
  const calculatorRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [display, setDisplay] = useState("0");
  const [storedValue, setStoredValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<Operator | null>(null);
  const [shouldResetDisplay, setShouldResetDisplay] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isMoneyMode, setIsMoneyMode] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const shouldHide = pathname.startsWith("/quotes/preview");

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        calculatorRef.current &&
        !calculatorRef.current.contains(event.target as Node)
      ) {
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

      if (/^\d$/.test(key)) {
        event.preventDefault();
        inputNumber(key);
        return;
      }

      if (key === ".") {
        event.preventDefault();
        inputNumber(".");
        return;
      }

      if (key === "+") {
        event.preventDefault();
        chooseOperator("+");
        return;
      }

      if (key === "-") {
        event.preventDefault();
        chooseOperator("-");
        return;
      }

      if (key === "*") {
        event.preventDefault();
        chooseOperator("x");
        return;
      }

      if (key === "/") {
        event.preventDefault();
        chooseOperator("/");
        return;
      }

      if (key === "Enter" || key === "=") {
        event.preventDefault();
        runEquals();
        return;
      }

      if (key === "Backspace") {
        event.preventDefault();
        backspace();
        return;
      }

      if (key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
        return;
      }

      if (key.toLowerCase() === "c") {
        event.preventDefault();
        clearCalculator();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [display, isOpen, operator, shouldResetDisplay, storedValue]);

  if (shouldHide) {
    return null;
  }

  function inputNumber(value: string) {
    if (value === "." && display.includes(".") && !shouldResetDisplay) return;

    if (shouldResetDisplay) {
      setDisplay(value === "." ? "0." : value);
      setShouldResetDisplay(false);
      return;
    }

    setDisplay((current) => {
      if (current === "0" && value !== ".") return value;
      return `${current}${value}`;
    });
  }

  function chooseOperator(nextOperator: Operator) {
    const currentValue = Number(display);

    if (storedValue !== null && operator) {
      const result = calculate(storedValue, currentValue, operator);
      setStoredValue(result);
      setDisplay(formatCalculatorNumber(result));
    } else {
      setStoredValue(currentValue);
    }

    setOperator(nextOperator);
    setShouldResetDisplay(true);
  }

  function runEquals() {
    if (storedValue === null || !operator) return;

    const currentValue = Number(display);
    const result = calculate(storedValue, currentValue, operator);
    const formattedResult = formatCalculatorNumber(result);

    setDisplay(formattedResult);
    addHistory(
      `${formatCalculatorNumber(storedValue)} ${operator} ${formatCalculatorNumber(currentValue)}`,
      formattedResult
    );
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
    setDisplay((current) => {
      if (shouldResetDisplay || current.length === 1) return "0";
      return current.slice(0, -1);
    });
  }

  function toggleSign() {
    setDisplay((current) => {
      if (current === "0") return current;
      return current.startsWith("-") ? current.slice(1) : `-${current}`;
    });
  }

  function addHistory(expression: string, result: string) {
    setHistory((current) => [
      { id: crypto.randomUUID(), expression, result },
      ...current.slice(0, 4),
    ]);
  }

  async function copyResult() {
    await navigator.clipboard.writeText(display);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  const formattedDisplay = isMoneyMode
    ? formatCalculatorCurrency(Number(display))
    : display;

  return (
    <div
      ref={calculatorRef}
      className="fixed bottom-5 right-5 z-40 sm:bottom-6 sm:right-6"
    >
      {isOpen ? (
        <div className="relative mb-3">
          {isHistoryOpen ? (
            <div className="absolute bottom-0 right-[calc(100%+12px)] hidden w-64 origin-bottom-right rounded-lg border border-[#d9e2ec] bg-white p-3 shadow-[0_18px_50px_rgba(33,51,67,0.16)] animate-in fade-in slide-in-from-right-2 duration-150 sm:block">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  History
                </p>
                <button
                  onClick={() => setHistory([])}
                  className="text-xs text-gray-400 transition hover:text-[#213343]"
                >
                  Clear
                </button>
              </div>

              {history.length > 0 ? (
                <div className="space-y-1.5">
                  {history.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setDisplay(item.result)}
                      className="grid w-full grid-cols-[1fr_auto] gap-3 rounded-md px-2 py-1.5 text-left text-xs transition hover:bg-[#f6f8fb]"
                    >
                      <span className="truncate text-gray-400">
                        {item.expression}
                      </span>
                      <span className="font-medium text-[#213343]">
                        {displayValue(Number(item.result), isMoneyMode)}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="rounded-md bg-[#f6f8fb] px-3 py-4 text-center text-xs text-gray-400">
                  No calculations yet
                </p>
              )}

            </div>
          ) : null}

          <div className="w-72 origin-bottom-right rounded-lg border border-[#d9e2ec] bg-white p-4 shadow-[0_18px_50px_rgba(33,51,67,0.18)] animate-in fade-in zoom-in-95 duration-150">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#fff1ea] text-[#ff5c35]">
                  <Calculator className="h-4 w-4" />
                </div>
                <p className="text-sm font-semibold text-[#213343]">
                  Calculator
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsMoneyMode((current) => !current)}
                  className={`flex h-8 w-8 items-center justify-center rounded-md transition hover:bg-[#f6f8fb] ${
                    isMoneyMode
                      ? "text-[#ff5c35]"
                      : "text-gray-400 hover:text-[#213343]"
                  }`}
                  aria-label="Toggle money format"
                  title="Toggle money format"
                >
                  <DollarSign className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setIsHistoryOpen((current) => !current)}
                  className={`flex h-8 w-8 items-center justify-center rounded-md transition hover:bg-[#f6f8fb] ${
                    isHistoryOpen
                      ? "text-[#ff5c35]"
                      : "text-gray-400 hover:text-[#213343]"
                  }`}
                  aria-label="Toggle calculator history"
                >
                  <Clock3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition hover:bg-[#f6f8fb] hover:text-[#213343]"
                  aria-label="Close calculator"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <button
              onClick={copyResult}
              title="Click to copy result"
              className="mb-3 w-full rounded-md border border-[#d9e2ec] bg-[#f6f8fb] px-3 py-4 text-right transition hover:border-[#b7c7d6]"
            >
              <p className="min-h-7 truncate text-2xl font-semibold tracking-tight text-[#213343]">
                {formattedDisplay}
              </p>
              <p className="mt-1 h-4 text-xs text-gray-400">
                {storedValue !== null && operator
                  ? `${displayValue(storedValue, isMoneyMode)} ${operator}`
                  : copied
                    ? "Copied"
                    : "Click number to copy"}
              </p>
            </button>

            <div className="grid grid-cols-4 gap-2">
              <CalculatorKey label="C" onClick={clearCalculator} muted />
              <CalculatorKey label="+/-" onClick={toggleSign} muted />
              <CalculatorKey label="⌫" onClick={backspace} muted />
              <CalculatorKey label="/" onClick={() => chooseOperator("/")} accent />

              {numberButtons.slice(0, 3).map((value) => (
                <CalculatorKey
                  key={value}
                  label={value}
                  onClick={() => inputNumber(value)}
                />
              ))}
              <CalculatorKey label="x" onClick={() => chooseOperator("x")} accent />

              {numberButtons.slice(3, 6).map((value) => (
                <CalculatorKey
                  key={value}
                  label={value}
                  onClick={() => inputNumber(value)}
                />
              ))}
              <CalculatorKey label="-" onClick={() => chooseOperator("-")} accent />

              {numberButtons.slice(6, 9).map((value) => (
                <CalculatorKey
                  key={value}
                  label={value}
                  onClick={() => inputNumber(value)}
                />
              ))}
              <CalculatorKey label="+" onClick={() => chooseOperator("+")} accent />

              <CalculatorKey
                label="0"
                onClick={() => inputNumber("0")}
                className="col-span-2"
              />
              <CalculatorKey label="." onClick={() => inputNumber(".")} />
              <CalculatorKey label="=" onClick={runEquals} primary />
            </div>
          </div>
        </div>
      ) : null}

      <button
        onClick={() => setIsOpen((current) => !current)}
        aria-label="Open calculator"
        title="Open calculator"
        className="ml-auto flex h-13 w-13 items-center justify-center rounded-lg border border-[#d9e2ec] bg-[#ff5c35] text-white shadow-[0_10px_30px_rgba(33,51,67,0.16)] transition hover:bg-[#e94820] focus:outline-none focus:ring-4 focus:ring-[#ff5c35]/20"
      >
        <Calculator className="h-5 w-5" />
      </button>
    </div>
  );
}

function CalculatorKey({
  label,
  onClick,
  accent = false,
  muted = false,
  primary = false,
  className = "",
}: {
  label: string;
  onClick: () => void;
  accent?: boolean;
  muted?: boolean;
  primary?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`h-11 rounded-md text-sm font-semibold transition ${className} ${
        primary
          ? "bg-[#ff5c35] text-white hover:bg-[#e94820]"
          : accent
            ? "bg-[#fff1ea] text-[#ff5c35] hover:bg-[#ffe1d5]"
            : muted
              ? "bg-[#f6f8fb] text-[#516f90] hover:bg-[#eaf0f6]"
              : "border border-[#d9e2ec] bg-white text-[#213343] hover:bg-[#f6f8fb]"
      }`}
    >
      {label}
    </button>
  );
}

function calculate(left: number, right: number, operator: Operator) {
  if (operator === "+") return left + right;
  if (operator === "-") return left - right;
  if (operator === "x") return left * right;
  if (right === 0) return 0;
  return left / right;
}

function formatCalculatorNumber(value: number) {
  if (!Number.isFinite(value)) return "0";
  return Number(value.toFixed(8)).toString();
}

function formatCalculatorCurrency(value: number) {
  if (!Number.isFinite(value)) return "$0";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function displayValue(value: number, isMoneyMode: boolean) {
  return isMoneyMode
    ? formatCalculatorCurrency(value)
    : formatCalculatorNumber(value);
}

function isEditableElement(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  const tagName = target.tagName.toLowerCase();
  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    target.isContentEditable
  );
}
