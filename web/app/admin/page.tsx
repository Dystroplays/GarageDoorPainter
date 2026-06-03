"use client";

import { useEffect, useState } from "react";

interface Door {
  size: string;
  colorName: string;
  swCode: string;
  primer: boolean;
}

interface Job {
  id: string;
  customerName: string;
  address: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: string;
  swOrderNumber: string;
  jobStartTime: string | null;
  painterName: string;
  depositPaid: boolean;
  doors: Door[];
}

function parseDoors(fields: Record<string, unknown>): Door[] {
  const doors: Door[] = [];
  for (let i = 1; i <= 5; i++) {
    const size = fields[`Door ${i} Size`] as string | undefined;
    if (!size) break;
    doors.push({
      size,
      colorName: (fields[`Door ${i} Color Name`] as string) ?? "",
      swCode: (fields[`Door ${i} Color SW Code`] as string) ?? "",
      primer: !!(fields[`Door ${i} Primer`]),
    });
  }
  return doors;
}

function parseAddress(notes: string): string {
  return notes?.match(/Address:\s*(.+?)(\s*\|.*)?$/)?.[1]?.trim() ?? "";
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "short", month: "short", day: "numeric", year: "numeric",
    });
  } catch { return iso; }
}

function formatElapsed(startIso: string): string {
  const elapsed = Math.floor((Date.now() - new Date(startIso).getTime()) / 1000);
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  // Per-job action state
  const [orderInputs, setOrderInputs] = useState<Record<string, string>>({});
  const [rescheduleInputs, setRescheduleInputs] = useState<Record<string, { start: string; end: string }>>({});
  const [cancelReasons, setCancelReasons] = useState<Record<string, string>>({});
  const [actionStatus, setActionStatus] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<Record<string, string>>({});
  const [working, setWorking] = useState<Record<string, boolean>>({});

  async function login() {
    setLoggingIn(true);
    setLoginError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) { setLoginError("Incorrect password"); return; }
      setAuthed(true);
    } finally {
      setLoggingIn(false);
    }
  }

  async function loadJobs() {
    setLoadingJobs(true);
    try {
      const res = await fetch("/api/admin/jobs");
      if (res.status === 401) { setAuthed(false); return; }
      const data = await res.json();
      setJobs(data.jobs ?? []);
    } finally {
      setLoadingJobs(false);
    }
  }

  useEffect(() => {
    if (authed) loadJobs();
  }, [authed]);

  async function setOrderNumber(jobId: string) {
    const num = orderInputs[jobId]?.trim();
    if (!num) return;
    setWorking((p) => ({ ...p, [jobId]: true }));
    setActionError((p) => ({ ...p, [jobId]: "" }));
    try {
      const res = await fetch("/api/admin/set-order-number", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: jobId, orderNumber: num }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, swOrderNumber: num } : j));
      setActionStatus((p) => ({ ...p, [jobId]: `Order #${num} saved — painter notified` }));
    } catch (e) {
      setActionError((p) => ({ ...p, [jobId]: e instanceof Error ? e.message : "Failed" }));
    } finally {
      setWorking((p) => ({ ...p, [jobId]: false }));
    }
  }

  async function rescheduleJob(jobId: string) {
    const dates = rescheduleInputs[jobId];
    if (!dates?.start || !dates?.end) return;
    setWorking((p) => ({ ...p, [jobId]: true }));
    setActionError((p) => ({ ...p, [jobId]: "" }));
    try {
      const res = await fetch("/api/admin/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: jobId, newStartDate: dates.start, newEndDate: dates.end }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, scheduledStart: dates.start, scheduledEnd: dates.end } : j));
      setActionStatus((p) => ({ ...p, [jobId]: "Rescheduled — painter and customer notified" }));
    } catch (e) {
      setActionError((p) => ({ ...p, [jobId]: e instanceof Error ? e.message : "Failed" }));
    } finally {
      setWorking((p) => ({ ...p, [jobId]: false }));
    }
  }

  async function cancelJob(jobId: string) {
    if (!confirm("Cancel this job? This will refund the deposit and notify the customer and painter.")) return;
    const reason = cancelReasons[jobId] ?? "";
    setWorking((p) => ({ ...p, [jobId]: true }));
    setActionError((p) => ({ ...p, [jobId]: "" }));
    try {
      const res = await fetch("/api/admin/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: jobId, reason: reason || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
      setActionStatus((p) => ({ ...p, [jobId]: `Cancelled${data.refundIssued ? " — deposit refunded" : ""}` }));
    } catch (e) {
      setActionError((p) => ({ ...p, [jobId]: e instanceof Error ? e.message : "Failed" }));
    } finally {
      setWorking((p) => ({ ...p, [jobId]: false }));
    }
  }

  // --- Login gate ---
  if (!authed) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="font-display text-2xl font-bold text-bolt-black uppercase mb-1">Bolt Painting</div>
            <div className="text-gray-500 text-sm">Admin Portal</div>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
            placeholder="Admin password"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-bolt-yellow mb-3"
          />
          {loginError && <p className="text-red-500 text-sm mb-3">{loginError}</p>}
          <button
            onClick={login}
            disabled={loggingIn || !password}
            className="w-full bg-bolt-yellow disabled:opacity-50 text-black font-bold py-3 rounded-xl transition-colors"
          >
            {loggingIn ? "Signing in…" : "Sign In"}
          </button>
        </div>
      </div>
    );
  }

  // --- Admin view ---
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-black text-white px-6 py-5 flex items-center justify-between">
        <div>
          <div className="font-display text-xl font-bold uppercase text-bolt-yellow">Bolt Painting</div>
          <div className="text-gray-400 text-xs mt-0.5">Admin — Active Jobs</div>
        </div>
        <div className="flex gap-3 items-center">
          <button
            onClick={loadJobs}
            disabled={loadingJobs}
            className="text-gray-400 hover:text-white text-sm transition-colors"
          >
            {loadingJobs ? "Loading…" : "↻ Refresh"}
          </button>
          <a
            href="https://airtable.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-bolt-yellow text-sm hover:underline"
          >
            Airtable →
          </a>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {loadingJobs && jobs.length === 0 && (
          <div className="text-center text-gray-400 py-12">Loading jobs…</div>
        )}

        {!loadingJobs && jobs.length === 0 && (
          <div className="text-center text-gray-400 py-12">
            <div className="text-4xl mb-3">📋</div>
            <p className="font-medium">No active jobs.</p>
            <p className="text-sm mt-1">Scheduled and In Progress jobs will appear here.</p>
          </div>
        )}

        {jobs.map((job) => {
          const isExpanded = expandedJobId === job.id;
          const isInProgress = job.status === "In Progress";
          const isWorking_ = working[job.id];

          return (
            <div
              key={job.id}
              className={`bg-white rounded-2xl border transition-all ${
                isInProgress ? "border-bolt-yellow" : "border-gray-200"
              }`}
            >
              {/* Job header */}
              <button
                onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                className="w-full text-left p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        isInProgress ? "bg-bolt-yellow text-black" : "bg-gray-100 text-gray-600"
                      }`}>
                        {job.status}
                        {isInProgress && job.jobStartTime && ` · ${formatElapsed(job.jobStartTime)}`}
                      </span>
                    </div>
                    <div className="font-bold text-bolt-black">{job.customerName}</div>
                    <div className="text-gray-500 text-sm truncate">{job.address || "—"}</div>
                    <div className="text-gray-400 text-xs mt-1">
                      {formatDate(job.scheduledStart)}
                      {job.painterName ? ` · ${job.painterName}` : ""}
                      {job.swOrderNumber ? ` · Order #${job.swOrderNumber}` : ""}
                    </div>
                  </div>
                  <svg
                    className={`w-5 h-5 text-gray-400 flex-shrink-0 mt-1 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>

              {/* Expanded actions */}
              {isExpanded && (
                <div className="px-5 pb-5 space-y-4 border-t border-gray-100 pt-4">

                  {/* Doors summary */}
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Doors</div>
                    <div className="space-y-1">
                      {job.doors.map((d, i) => (
                        <div key={i} className="text-sm text-gray-600">
                          Door {i + 1}: {d.colorName} ({d.swCode}) · {d.size}-car{d.primer ? " + primer" : ""}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* SW Order Number */}
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">SW Order Number</div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={orderInputs[job.id] ?? job.swOrderNumber}
                        onChange={(e) => setOrderInputs((p) => ({ ...p, [job.id]: e.target.value }))}
                        placeholder="e.g. 1234567"
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-bolt-yellow"
                      />
                      <button
                        onClick={() => setOrderNumber(job.id)}
                        disabled={isWorking_ || !orderInputs[job.id]?.trim()}
                        className="bg-bolt-yellow disabled:opacity-50 text-black font-semibold text-sm px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
                      >
                        {isWorking_ ? "Saving…" : "Save + Notify"}
                      </button>
                    </div>
                  </div>

                  {/* Reschedule */}
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Reschedule</div>
                    <div className="flex gap-2 flex-wrap">
                      <input
                        type="date"
                        value={rescheduleInputs[job.id]?.start ?? ""}
                        onChange={(e) => setRescheduleInputs((p) => ({ ...p, [job.id]: { ...p[job.id], start: e.target.value } }))}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-bolt-yellow"
                      />
                      <input
                        type="date"
                        value={rescheduleInputs[job.id]?.end ?? ""}
                        onChange={(e) => setRescheduleInputs((p) => ({ ...p, [job.id]: { ...p[job.id], end: e.target.value } }))}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-bolt-yellow"
                      />
                      <button
                        onClick={() => rescheduleJob(job.id)}
                        disabled={isWorking_ || !rescheduleInputs[job.id]?.start || !rescheduleInputs[job.id]?.end}
                        className="bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 font-semibold text-sm px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
                      >
                        {isWorking_ ? "Saving…" : "Reschedule + Notify"}
                      </button>
                    </div>
                  </div>

                  {/* Cancel */}
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Cancel Job</div>
                    <div className="flex gap-2 flex-wrap">
                      <input
                        type="text"
                        value={cancelReasons[job.id] ?? ""}
                        onChange={(e) => setCancelReasons((p) => ({ ...p, [job.id]: e.target.value }))}
                        placeholder="Reason (optional)"
                        className="flex-1 min-w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-300"
                      />
                      <button
                        onClick={() => cancelJob(job.id)}
                        disabled={isWorking_}
                        className="bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-600 font-semibold text-sm px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
                      >
                        {isWorking_ ? "Cancelling…" : "Cancel Job"}
                      </button>
                    </div>
                    {job.depositPaid && (
                      <p className="text-xs text-gray-400 mt-1">Deposit will be automatically refunded.</p>
                    )}
                  </div>

                  {/* Feedback */}
                  {actionStatus[job.id] && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-green-800 text-sm font-medium">
                      {actionStatus[job.id]}
                    </div>
                  )}
                  {actionError[job.id] && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm font-medium">
                      {actionError[job.id]}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
