"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

interface PainterInfo {
  id: string;
  name: string;
}

interface Door {
  size: string;
  colorName: string;
  swCode: string;
  primer: boolean;
}

interface PaintItem {
  swCode: string;
  colorName: string;
  gallons: number;
  primerGallons: number;
}

interface Job {
  id: string;
  customerName: string;
  address: string;
  phone: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: string;
  swOrderNumber: string;
  jobStartTime: string | null;
  doors: Door[];
  paintList: PaintItem[];
}

type JobView = "list" | "detail";

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

function buildPaintList(doors: Door[]): PaintItem[] {
  const map = new Map<string, PaintItem>();
  for (const door of doors) {
    const key = door.swCode;
    const gallons = door.size?.toLowerCase() === "double" ? 2 : 1;
    const primerGallons = door.primer ? (door.size?.toLowerCase() === "double" ? 1 : 1) : 0;
    if (map.has(key)) {
      const existing = map.get(key)!;
      existing.gallons += gallons;
      existing.primerGallons += primerGallons;
    } else {
      map.set(key, { swCode: key, colorName: door.colorName, gallons, primerGallons });
    }
  }
  return [...map.values()];
}

function parseAddress(notes: string): string {
  const m = notes?.match(/Address:\s*(.+?)(\s*\|.*)?$/);
  return m?.[1]?.trim() ?? "";
}

function parsePhone(notes: string): string {
  const m = notes?.match(/Phone:\s*([^\s|]+)/);
  return m?.[1]?.trim() ?? "";
}

function formatDate(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "short", month: "short", day: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatElapsed(startIso: string): string {
  const start = new Date(startIso).getTime();
  const elapsed = Math.floor((Date.now() - start) / 1000);
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

async function uploadPhoto(file: File, token: string): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/painter/upload", {
    method: "POST",
    body: form,
    headers: { "x-painter-token": token },
  });
  if (!res.ok) throw new Error("Photo upload failed");
  const data = await res.json();
  return data.url as string;
}

export default function PainterPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [painter, setPainter] = useState<PainterInfo | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [authError, setAuthError] = useState(false);
  const [loading, setLoading] = useState(true);

  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [view, setView] = useState<JobView>("list");

  const [actionStatus, setActionStatus] = useState<string>("");
  const [actionError, setActionError] = useState<string>("");
  const [isWorking, setIsWorking] = useState(false);

  const [elapsed, setElapsed] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);

  // Load jobs on mount
  useEffect(() => {
    if (!token) { setAuthError(true); setLoading(false); return; }
    fetch(`/api/painter/jobs?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setAuthError(true); return; }
        setPainter(data.painter);
        const mapped: Job[] = (data.jobs ?? []).map((j: { id: string; fields: Record<string, unknown> }) => {
          const f = j.fields;
          const notes = (f["Notes"] as string) ?? "";
          const doors = parseDoors(f);
          return {
            id: j.id,
            customerName: ((f["Name"] as string) ?? "").split("—")[0].trim(),
            address: parseAddress(notes),
            phone: parsePhone(notes),
            scheduledStart: (f["Scheduled Start"] as string) ?? "",
            scheduledEnd: (f["Scheduled End"] as string) ?? "",
            status: (f["Status"] as string) ?? "",
            swOrderNumber: (f["SW Order Number"] as string) ?? "",
            jobStartTime: (f["Job Start Time"] as string) ?? null,
            doors,
            paintList: buildPaintList(doors),
          };
        });
        setJobs(mapped);
      })
      .catch(() => setAuthError(true))
      .finally(() => setLoading(false));
  }, [token]);

  // Live timer for in-progress jobs
  const activeJob = jobs.find((j) => j.id === activeJobId);
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (activeJob?.status === "In Progress" && activeJob.jobStartTime) {
      timerRef.current = setInterval(() => {
        setElapsed(formatElapsed(activeJob.jobStartTime!));
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeJob?.status, activeJob?.jobStartTime]);

  async function handleStartJob(job: Job) {
    if (!beforeInputRef.current) return;
    beforeInputRef.current.click();
  }

  async function processBeforePhotos(files: FileList) {
    if (!activeJob || !token) return;
    setIsWorking(true);
    setActionError("");
    setActionStatus("Uploading before photos…");
    try {
      const urls = await Promise.all(Array.from(files).map((f) => uploadPhoto(f, token)));
      setActionStatus("Starting job…");
      const res = await fetch("/api/painter/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, bookingId: activeJob.id, beforePhotoUrls: urls }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start job");
      // Update local state
      const now = new Date().toISOString();
      setJobs((prev) => prev.map((j) => j.id === activeJob.id ? { ...j, status: "In Progress", jobStartTime: now } : j));
      setActionStatus("Job started!");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to start job");
    } finally {
      setIsWorking(false);
    }
  }

  async function handleCompleteJob(job: Job) {
    if (!afterInputRef.current) return;
    afterInputRef.current.click();
  }

  async function processAfterPhotos(files: FileList) {
    if (!activeJob || !token) return;
    setIsWorking(true);
    setActionError("");
    setActionStatus("Uploading after photos…");
    try {
      const urls = await Promise.all(Array.from(files).map((f) => uploadPhoto(f, token)));
      setActionStatus("Completing job and charging balance…");
      const res = await fetch("/api/painter/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, bookingId: activeJob.id, afterPhotoUrls: urls }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to complete job");
      setJobs((prev) => prev.map((j) => j.id === activeJob.id ? { ...j, status: "Completed" } : j));
      setActionStatus("Job complete! Balance charged, customer notified.");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to complete job");
    } finally {
      setIsWorking(false);
    }
  }

  const today = new Date().toISOString().split("T")[0];
  const todayJobs = jobs.filter((j) => j.scheduledStart === today && j.status !== "Completed");
  const upcomingJobs = jobs.filter((j) => j.scheduledStart > today && j.status !== "Completed");
  const completedJobs = jobs.filter((j) => j.status === "Completed");

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500 text-lg">Loading…</div>
      </div>
    );
  }

  if (authError || !token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="font-bold text-xl text-bolt-black mb-2">Invalid or missing link</h2>
          <p className="text-gray-500 text-sm">Use the link provided by your manager to access your jobs.</p>
        </div>
      </div>
    );
  }

  // --- Detail view ---
  if (view === "detail" && activeJob) {
    return (
      <div className="min-h-screen bg-gray-50 font-body">
        {/* Hidden file inputs */}
        <input
          ref={beforeInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && processBeforePhotos(e.target.files)}
        />
        <input
          ref={afterInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && processAfterPhotos(e.target.files)}
        />

        {/* Header */}
        <div className="bg-black text-white px-4 pt-12 pb-6">
          <button
            onClick={() => { setView("list"); setActionStatus(""); setActionError(""); }}
            className="text-bolt-yellow text-sm mb-3 flex items-center gap-1"
          >
            ← Back to jobs
          </button>
          <h1 className="font-display text-2xl font-bold uppercase">{activeJob.customerName}</h1>
          <p className="text-gray-400 text-sm mt-1">{formatDate(activeJob.scheduledStart)}</p>
        </div>

        <div className="px-4 py-6 space-y-4">

          {/* Status + Timer */}
          <div className={`rounded-2xl p-5 ${
            activeJob.status === "In Progress" ? "bg-bolt-yellow" :
            activeJob.status === "Completed" ? "bg-green-50 border border-green-200" :
            "bg-white border border-gray-200"
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-black/50 mb-1">Status</div>
                <div className="font-bold text-lg text-black">{activeJob.status}</div>
              </div>
              {activeJob.status === "In Progress" && activeJob.jobStartTime && (
                <div className="text-right">
                  <div className="text-xs font-semibold uppercase tracking-wider text-black/50 mb-1">Elapsed</div>
                  <div className="font-mono font-bold text-2xl text-black">{elapsed}</div>
                </div>
              )}
            </div>
          </div>

          {/* Address */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Address</div>
            <div className="font-medium text-bolt-black mb-3">{activeJob.address || "—"}</div>
            {activeJob.address && (
              <a
                href={`https://maps.apple.com/?q=${encodeURIComponent(activeJob.address)}`}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-bolt-yellow bg-black rounded-full px-4 py-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Open in Maps
              </a>
            )}
          </div>

          {/* SW Order Number */}
          <div className={`rounded-2xl p-5 border ${
            activeJob.swOrderNumber ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"
          }`}>
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">SW Order Number</div>
            {activeJob.swOrderNumber ? (
              <div className="font-mono font-bold text-2xl text-green-800">{activeJob.swOrderNumber}</div>
            ) : (
              <div className="font-medium text-amber-700 text-sm">Order not placed yet — check back soon.</div>
            )}
          </div>

          {/* Paint Pick List */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Paint Pick List</div>
            <div className="space-y-2">
              {activeJob.paintList.map((item) => (
                <div key={item.swCode} className="flex items-start justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <div className="font-semibold text-bolt-black text-sm">{item.colorName}</div>
                    <div className="text-gray-500 text-xs">{item.swCode}</div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-medium text-bolt-black">{item.gallons} gal paint</div>
                    {item.primerGallons > 0 && (
                      <div className="text-amber-600 text-xs">{item.primerGallons} gal primer</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Door Details */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Door Details</div>
            <div className="space-y-3">
              {activeJob.doors.map((door, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                  <div className="text-sm font-semibold text-gray-400 w-14 flex-shrink-0">Door {i + 1}</div>
                  <div className="flex-1">
                    <div className="font-medium text-bolt-black text-sm">{door.colorName}</div>
                    <div className="text-gray-500 text-xs">{door.swCode} · {door.size}-car{door.primer ? " · primer" : ""}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action feedback */}
          {actionStatus && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-800 text-sm font-medium">
              {actionStatus}
            </div>
          )}
          {actionError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm font-medium">
              {actionError}
            </div>
          )}

          {/* Actions */}
          {activeJob.status === "Scheduled" && (
            <button
              onClick={() => handleStartJob(activeJob)}
              disabled={isWorking}
              className="w-full bg-bolt-yellow hover:bg-yellow-400 disabled:opacity-50 text-black font-bold text-lg py-5 rounded-2xl transition-colors flex items-center justify-center gap-2"
            >
              {isWorking ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              Start Job + Upload Before Photos
            </button>
          )}

          {activeJob.status === "In Progress" && (
            <button
              onClick={() => handleCompleteJob(activeJob)}
              disabled={isWorking}
              className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold text-lg py-5 rounded-2xl transition-colors flex items-center justify-center gap-2"
            >
              {isWorking ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              Complete Job + Upload After Photos
            </button>
          )}

          {activeJob.status === "Completed" && (
            <div className="w-full bg-gray-100 text-gray-500 font-semibold text-lg py-5 rounded-2xl text-center">
              ✓ Job Completed
            </div>
          )}

          {/* Phone contact */}
          {activeJob.phone && (
            <a
              href={`tel:${activeJob.phone}`}
              className="w-full flex items-center justify-center gap-2 border border-gray-200 rounded-2xl py-4 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 7V5z" />
              </svg>
              Call Customer
            </a>
          )}

        </div>
      </div>
    );
  }

  // --- List view ---
  return (
    <div className="min-h-screen bg-gray-50 font-body">
      {/* Header */}
      <div className="bg-black text-white px-4 pt-12 pb-6">
        <div className="text-bolt-yellow text-xs font-semibold uppercase tracking-wider mb-1">Bolt Painting</div>
        <h1 className="font-display text-3xl font-bold uppercase">My Jobs</h1>
        {painter && <p className="text-gray-400 text-sm mt-1">Welcome back, {painter.name}</p>}
      </div>

      <div className="px-4 py-6 space-y-6">

        {/* Today */}
        {todayJobs.length > 0 && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Today</div>
            <div className="space-y-3">
              {todayJobs.map((job) => (
                <JobCard key={job.id} job={job} onTap={() => { setActiveJobId(job.id); setView("detail"); setActionStatus(""); setActionError(""); }} />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming */}
        {upcomingJobs.length > 0 && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Upcoming</div>
            <div className="space-y-3">
              {upcomingJobs.map((job) => (
                <JobCard key={job.id} job={job} onTap={() => { setActiveJobId(job.id); setView("detail"); setActionStatus(""); setActionError(""); }} />
              ))}
            </div>
          </div>
        )}

        {/* Completed */}
        {completedJobs.length > 0 && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Recently Completed</div>
            <div className="space-y-3">
              {completedJobs.map((job) => (
                <JobCard key={job.id} job={job} onTap={() => { setActiveJobId(job.id); setView("detail"); setActionStatus(""); setActionError(""); }} />
              ))}
            </div>
          </div>
        )}

        {jobs.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📋</div>
            <p className="text-gray-500 font-medium">No jobs assigned yet.</p>
            <p className="text-gray-400 text-sm mt-1">Check back after your manager schedules work.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function JobCard({ job, onTap }: { job: Job; onTap: () => void }) {
  const isToday = job.scheduledStart === new Date().toISOString().split("T")[0];
  const isActive = job.status === "In Progress";
  const isDone = job.status === "Completed";

  return (
    <button
      onClick={onTap}
      className={`w-full text-left rounded-2xl p-4 border transition-all ${
        isActive ? "bg-bolt-yellow border-bolt-yellow" :
        isDone ? "bg-gray-50 border-gray-200" :
        "bg-white border-gray-200 hover:border-bolt-yellow/50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              isActive ? "bg-black text-bolt-yellow" :
              isDone ? "bg-green-100 text-green-700" :
              isToday ? "bg-bolt-yellow/20 text-bolt-black" :
              "bg-gray-100 text-gray-500"
            }`}>
              {isActive ? "In Progress" : isDone ? "Done" : isToday ? "Today" : formatDate(job.scheduledStart)}
            </span>
          </div>
          <div className="font-bold text-bolt-black truncate">{job.customerName}</div>
          <div className="text-gray-500 text-sm truncate mt-0.5">{job.address || "Address pending"}</div>
          <div className="text-gray-400 text-xs mt-1">
            {job.doors.length} door{job.doors.length !== 1 ? "s" : ""}
            {job.swOrderNumber ? " · Order #" + job.swOrderNumber : ""}
          </div>
        </div>
        <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}
