"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

export interface PaymentValues {
  promptpayId: string;
  accountName: string;
  accountNumber: string;
  bankCode: string;
  qrImage: string;
  windowSeconds: number;
  slip2goSecretKey: string;
  apiUrl: string;
  clockSkewSeconds: number;
}

/** Shrink an uploaded QR picture so it stays small enough to store (max 800px, PNG). */
async function shrink(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, 800 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * s);
  c.height = Math.round(bmp.height * s);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL("image/png");
}

const UNITS = { sec: 1, min: 60, hour: 3600 } as const;
type Unit = keyof typeof UNITS;
/** the largest unit that shows the saved time as a whole number */
const bestUnit = (s: number): Unit => (s > 0 && s % 3600 === 0 ? "hour" : s > 0 && s % 60 === 0 ? "min" : "sec");

const TABS = [
  { key: "receiving", label: "Receiving account" },
  { key: "rules", label: "Rules & time" },
  { key: "slip2go", label: "Slip2Go connection" },
] as const;

const field =
  "h-10 min-w-0 rounded-lg border border-choco/15 bg-white px-3 text-sm font-medium text-choco-900 outline-none transition placeholder:font-normal placeholder:text-muted/60 hover:border-choco/30 focus:border-choco-900 focus:ring-2 focus:ring-choco-900/10";
/** native select without the browser's own arrow, so it matches the inputs */
const selectField = `${field} cursor-pointer appearance-none text-center [text-align-last:center] bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b5344' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")] bg-[length:16px] bg-[position:right_0.65rem_center] bg-no-repeat px-9`;

function Row({ k, hint, children }: { k: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-x-6">
      <dt className="shrink-0 text-muted">
        {k}
        {hint && <span className="block text-xs">{hint}</span>}
      </dt>
      <dd className="flex min-w-0 items-center gap-2 sm:justify-end">{children}</dd>
    </div>
  );
}

/** a password-style box with an eye button to show / hide the value */
function SecretInput({ label, value, onChange, placeholder, readOnly }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; readOnly?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative w-full sm:w-72">
      <input
        aria-label={label}
        className={`${field} w-full pr-10 font-mono`}
        type={show ? "text" : "password"}
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder ?? "Secret key"}
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        onClick={() => setShow((x) => !x)}
        aria-label={show ? `Hide ${label}` : `Show ${label}`}
        aria-pressed={show}
        className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted hover:text-choco-900"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
          {!show && <path d="M4 4l16 16" />}
        </svg>
      </button>
    </div>
  );
}

/** The "Payment checks" table: the fixed rules, plus the account / name / QR / time limit, each editable in place. */
export function PaymentChecks({ initial, banks }: { initial: PaymentValues; banks: Record<string, string> }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const [unit, setUnit] = useState<Unit>(() => bestUnit(initial.windowSeconds));
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("receiving");
  const fileRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof PaymentValues>(k: K, val: PaymentValues[K]) => {
    setV((o) => ({ ...o, [k]: val }));
    setMsg(null);
  };
  const dirty = JSON.stringify(v) !== JSON.stringify(initial);

  async function pick(f: File | undefined) {
    if (!f) return;
    if (!/^image\/(png|jpe?g|webp)$/.test(f.type)) return setMsg({ ok: false, text: "Please choose a PNG or JPG." });
    try {
      set("qrImage", await shrink(f));
    } catch {
      setMsg({ ok: false, text: "Couldn't read that image." });
    }
  }

  const save = () =>
    start(async () => {
      setMsg(null);
      const res = await fetch("/api/admin/payment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...v, webhookToken: undefined }) });
      const json = await res.json().catch(() => ({}));
      setMsg(res.ok ? { ok: true, text: "Saved" } : { ok: false, text: json.error ?? "Couldn't save." });
      if (res.ok) router.refresh();
    });

  const w = v.windowSeconds;
  const human = w <= 0 ? "no limit" : `${w >= 60 ? `${Math.floor(w / 60)} min ` : ""}${w % 60 ? `${w % 60} s` : ""}`.trim();

  return (
    <>
      <div role="tablist" aria-label="Payment settings" className="mb-1 flex gap-5 overflow-x-auto text-sm">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px shrink-0 border-b-2 pb-2.5 transition ${tab === t.key ? "border-choco-900 font-semibold" : "border-transparent text-muted hover:text-choco-900"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {/* all tabs share one grid cell, so the box keeps the height of the tallest tab and never jumps */}
      <div className="grid">
      <dl aria-hidden={tab !== "receiving"} className={`col-start-1 row-start-1 ${tab === "receiving" ? "" : "pointer-events-none invisible"} divide-y divide-choco/10 border-t border-choco/10 text-sm`}>
        <Row k="Receiving account" hint="Only slips paid to this account are accepted">
          <select aria-label="Bank" className={`${selectField} w-48 shrink-0`} value={v.bankCode} onChange={(e) => set("bankCode", e.target.value)}>
            <option value="">Any bank</option>
            {Object.entries(banks).map(([code, name]) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </select>
          <input aria-label="Account number" className={`${field} flex-1 text-center tabular-nums sm:w-40 sm:flex-none`} inputMode="numeric" placeholder="Account number" value={v.accountNumber} onChange={(e) => set("accountNumber", e.target.value)} />
        </Row>
        <Row k="Receiver name" hint="Matched with the shortened name on the slip. Empty = not checked">
          <input aria-label="Receiver name" className={`${field} flex-1 sm:w-72 sm:flex-none`} placeholder="Account holder name" value={v.accountName} onChange={(e) => set("accountName", e.target.value)} />
        </Row>
        <Row k="PromptPay ID" hint="Phone or national ID. Draws the QR with the amount">
          <input aria-label="PromptPay ID" className={`${field} flex-1 text-center tabular-nums sm:w-40 sm:flex-none`} inputMode="numeric" placeholder="0812345678" value={v.promptpayId} onChange={(e) => set("promptpayId", e.target.value)} />
        </Row>
        <Row k="QR image" hint="Shown instead of the generated QR (no amount inside)">
          {v.qrImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={v.qrImage} alt="Payment QR" className="h-10 w-10 rounded-lg border border-choco/10 bg-white object-contain" />
          )}
          <button type="button" onClick={() => fileRef.current?.click()} className="h-10 rounded-lg border border-choco/15 bg-white px-4 text-sm font-medium transition hover:border-choco-900">
            {v.qrImage ? "Replace" : "Upload"}
          </button>
          {v.qrImage && (
            <button type="button" onClick={() => set("qrImage", "")} className="h-10 rounded-lg px-3 text-sm text-muted transition hover:bg-red-50 hover:text-red-700">Remove</button>
          )}
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        </Row>
      </dl>
      <dl aria-hidden={tab !== "rules"} className={`col-start-1 row-start-1 ${tab === "rules" ? "" : "pointer-events-none invisible"} divide-y divide-choco/10 border-t border-choco/10 text-sm`}>
        <Row k="Amount"><span className="font-medium">Must equal the order total</span></Row>
        <Row k="Reused slips"><span className="font-medium">Blocked</span></Row>
        <Row k="Time limit" hint={`After showing the QR · ${human}. 0 = no limit · max 24 hours`}>
          <input
            aria-label="Time limit"
            className={`${field} w-28 text-center tabular-nums`}
            type="number"
            min={0}
            step="any"
            value={v.windowSeconds / UNITS[unit]}
            onChange={(e) => set("windowSeconds", Math.min(86400, Math.max(0, Math.round((Number(e.target.value) || 0) * UNITS[unit]))))}
          />
          <select aria-label="Time unit" className={`${selectField} w-32`} value={unit} onChange={(e) => setUnit(e.target.value as Unit)}>
            <option value="sec">seconds</option>
            <option value="min">minutes</option>
            <option value="hour">hours</option>
          </select>
        </Row>
        <Row k="Clock tolerance" hint="Allowance for clock difference between the bank and this server">
          <input
            aria-label="Clock tolerance in seconds"
            className={`${field} w-28 text-center tabular-nums`}
            type="number"
            min={0}
            max={600}
            value={v.clockSkewSeconds}
            onChange={(e) => set("clockSkewSeconds", Math.min(600, Math.max(0, Math.floor(Number(e.target.value) || 0))))}
          />
          <span className="text-muted">sec</span>
        </Row>
      </dl>
      <dl aria-hidden={tab !== "slip2go"} className={`col-start-1 row-start-1 ${tab === "slip2go" ? "" : "pointer-events-none invisible"} divide-y divide-choco/10 border-t border-choco/10 text-sm`}>
        <Row k="Slip2Go secret key" hint="Used to check slips. Keep it private">
          <SecretInput label="Slip2Go secret key" value={v.slip2goSecretKey} onChange={(x) => set("slip2goSecretKey", x)} />
        </Row>
        <Row k="Slip2Go API address" hint="Leave as is unless Slip2Go tells you otherwise">
          <input aria-label="Slip2Go API address" className={`${field} w-full sm:w-72`} spellCheck={false} placeholder="https://connect.slip2go.com" value={v.apiUrl} onChange={(e) => set("apiUrl", e.target.value)} />
        </Row>
      </dl>
      </div>
      <div className="mt-4 flex items-center justify-end gap-3">
        {msg && <span role="status" className={`text-sm ${msg.ok ? "text-sage" : "text-red-700"}`}>{msg.text}</span>}
        <button onClick={save} disabled={pending || !dirty} className="rounded-full bg-choco-900 px-6 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40">
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </>
  );
}
