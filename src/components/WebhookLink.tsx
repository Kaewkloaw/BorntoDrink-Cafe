"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

const PATH = "/api/slip2go/webhook?token=";
const btn = "h-9 shrink-0 rounded-lg border border-choco/15 bg-white px-3.5 text-sm font-medium transition hover:border-choco-900 disabled:opacity-40";
const ghost = "h-9 rounded-lg px-3 text-sm text-muted hover:text-choco-900";

/** A centered pop-up with a dimmed backdrop. Esc or a click outside closes it. */
function Modal({ title, step, onClose, children }: { title: string; step: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-choco-900/50 p-4 backdrop-blur-[2px]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-[#fff3d6] text-xl text-[#9a6a00]" aria-hidden="true">!</div>
        <p className="mt-3 text-center text-xs font-medium uppercase tracking-wider text-muted">{step}</p>
        <h3 className="mt-1 text-center text-lg font-semibold">{title}</h3>
        {children}
      </div>
    </div>
  );
}

/** accept either the whole address or just the token */
function tokenFrom(text: string) {
  const t = text.trim();
  try {
    return new URL(t).searchParams.get("token") ?? "";
  } catch {
    return t;
  }
}

/** The Queue API result address. Locked; changing it takes two confirmations (a warning, then typing CHANGE). */
export function WebhookLink({ origin, token }: { origin: string; token: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [step, setStep] = useState<"locked" | "warn" | "type" | "open">("locked");
  const [typed, setTyped] = useState("");
  const [text, setText] = useState(`${origin}${PATH}${token}`);
  const [err, setErr] = useState("");

  const url = `${origin}${PATH}${token}`;
  const cancel = () => {
    setText(url);
    setTyped("");
    setErr("");
    setStep("locked");
  };
  const generate = () =>
    setText(`${origin}${PATH}${Array.from(crypto.getRandomValues(new Uint8Array(16)), (x) => x.toString(16).padStart(2, "0")).join("")}`);

  const save = () =>
    start(async () => {
      setErr("");
      const res = await fetch("/api/admin/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookToken: tokenFrom(text) }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return setErr(json.error ?? "Couldn't save.");
      setTyped("");
      setStep("locked");
      router.refresh();
    });

  return (
    <div className="mt-1.5">
      {step === "open" ? (
        <input
          aria-label="Result address"
          className="h-10 w-full rounded-lg border border-choco/15 bg-white px-3 font-mono text-xs outline-none transition focus:border-choco-900 focus:ring-2 focus:ring-choco-900/10"
          value={text}
          spellCheck={false}
          onChange={(e) => setText(e.target.value)}
        />
      ) : (
        <code className="block break-all rounded-md border border-choco/10 bg-choco/[0.03] p-2 text-xs text-muted">{url}</code>
      )}

      {step === "locked" && (
        <button type="button" className={`${btn} mt-2`} onClick={() => setStep("warn")}>
          Change…
        </button>
      )}

      {step === "warn" && (
        <Modal title="Change the result address?" step="Step 1 of 2" onClose={cancel}>
          <p className="mt-2 text-center text-sm leading-relaxed text-muted">
            The old address stops working right away. Queue API results are rejected (403) until you paste the new address into Slip2Go.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button type="button" className={`${btn} h-10`} onClick={cancel}>Cancel</button>
            <button type="button" className="h-10 rounded-lg bg-choco-900 text-sm font-semibold text-white transition hover:opacity-90" onClick={() => setStep("type")}>
              Continue
            </button>
          </div>
        </Modal>
      )}

      {step === "type" && (
        <Modal title="Type CHANGE to confirm" step="Step 2 of 2" onClose={cancel}>
          <p className="mt-2 text-center text-sm leading-relaxed text-muted">This unlocks the address so you can edit or generate a new one.</p>
          <input
            autoFocus
            className="mt-4 h-11 w-full rounded-lg border border-choco/20 bg-white px-3 text-center text-sm font-semibold uppercase tracking-widest outline-none focus:border-choco-900 focus:ring-2 focus:ring-choco-900/10"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && typed.trim().toUpperCase() === "CHANGE" && setStep("open")}
            placeholder="CHANGE"
            aria-label="Type CHANGE"
          />
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button type="button" className={`${btn} h-10`} onClick={cancel}>Cancel</button>
            <button
              type="button"
              className="h-10 rounded-lg bg-[#c0391b] text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
              disabled={typed.trim().toUpperCase() !== "CHANGE"}
              onClick={() => setStep("open")}
            >
              Unlock
            </button>
          </div>
        </Modal>
      )}

      {step === "open" && (
        <>
          <p className="mt-2 text-xs text-muted">Edit the address (only the part after <code>token=</code> is kept), or generate a new one. Then paste it into Slip2Go.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className={btn} onClick={generate}>Generate</button>
            <button type="button" className={`${btn} bg-choco-900 text-white hover:opacity-90`} disabled={pending || !tokenFrom(text)} onClick={save}>
              {pending ? "Saving…" : "Save"}
            </button>
            <button type="button" className={ghost} onClick={cancel}>Cancel</button>
          </div>
        </>
      )}
      {err && <p role="alert" className="mt-2 text-xs text-red-700">{err}</p>}
    </div>
  );
}
