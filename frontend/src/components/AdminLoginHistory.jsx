/**
 * Super Admin only — per-user login history (geo, device, time, count).
 */
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Globe2,
  History,
  Loader2,
  Monitor,
  RefreshCw,
  Search,
  Smartphone,
} from "lucide-react";
import { AdminAPI } from "../lib/api.js";
import { roleLabel } from "../lib/roles.js";

function fmtWhen(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DeviceBadge({ kind }) {
  const mobile = String(kind || "").toLowerCase() === "mobile";
  const Icon = mobile ? Smartphone : Monitor;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
        mobile
          ? "border-cyan-400/25 bg-cyan-500/10 text-cyan-200"
          : "border-indigo-400/25 bg-indigo-500/10 text-indigo-200"
      }`}
    >
      <Icon className="h-3 w-3" />
      {mobile ? "Mobile" : "Web"}
    </span>
  );
}

export default function AdminLoginHistory({ toast, initialUserId = null }) {
  const say = toast || (() => {});
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [events, setEvents] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const loadUsers = useCallback(
    async (q = query) => {
      setLoading(true);
      try {
        const res = await AdminAPI.loginHistory({ q });
        setUsers(res.users || []);
      } catch (err) {
        say("error", err?.message || "Failed to load login history.");
        setUsers([]);
      } finally {
        setLoading(false);
      }
    },
    [query]
  );

  const openUser = useCallback(
    async (userId, nextPage = 1) => {
      if (!userId) return;
      setDetailLoading(true);
      try {
        const res = await AdminAPI.loginHistory({
          userId,
          page: nextPage,
          limit: 40,
        });
        setDetail(res.user || null);
        setEvents(res.events || []);
        setPage(res.page || 1);
        setPages(res.pages || 1);
        setTotal(res.total || 0);
      } catch (err) {
        say("error", err?.message || "Failed to load this user's logins.");
      } finally {
        setDetailLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadUsers("");
  }, []);

  useEffect(() => {
    if (initialUserId) openUser(initialUserId, 1);
  }, [initialUserId, openUser]);

  useEffect(() => {
    const t = setTimeout(() => loadUsers(query), 280);
    return () => clearTimeout(t);
  }, [query, loadUsers]);

  if (detail) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setDetail(null);
              setEvents([]);
              loadUsers(query);
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-300"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All users
          </button>
          <button
            type="button"
            onClick={() => openUser(detail.id, page)}
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-300"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#0c1222] p-4">
          <div className="text-lg font-semibold text-white">
            {detail.fullName || detail.username}
          </div>
          <div className="mt-0.5 text-xs text-slate-500">
            @{detail.username} · {detail.email} · {roleLabel(detail.role)}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">
                Times logged in
              </div>
              <div className="mt-0.5 text-xl font-bold tabular-nums text-cyan-300">
                {detail.loginCount || total}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">
                Last login
              </div>
              <div className="mt-0.5 text-sm font-semibold text-white">
                {fmtWhen(detail.lastLoginAt)}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">
                Last device
              </div>
              <div className="mt-1">
                <DeviceBadge kind={detail.lastLoginDevice} />
              </div>
            </div>
          </div>
        </div>

        {detailLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-cyan-300" />
          </div>
        ) : events.length ? (
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <div className="border-b border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {total} session{total === 1 ? "" : "s"}
            </div>
            <ul className="divide-y divide-white/5">
              {events.map((ev) => (
                <li key={ev.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {fmtWhen(ev.createdAt)}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                        <DeviceBadge kind={ev.kind} />
                        <span>
                          {ev.os || "—"} · {ev.browser || "—"}
                        </span>
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <div className="inline-flex items-center gap-1 font-semibold text-slate-200">
                        <Globe2 className="h-3.5 w-3.5 text-cyan-300" />
                        {ev.locationLabel || "Unknown"}
                      </div>
                      {ev.isp ? (
                        <div className="mt-0.5 text-[11px] text-slate-500">{ev.isp}</div>
                      ) : null}
                      <div className="mt-0.5 font-mono text-[11px] text-slate-500">
                        {ev.ip || "—"}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            {pages > 1 ? (
              <div className="flex items-center justify-between border-t border-white/10 px-4 py-2 text-xs text-slate-400">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => openUser(detail.id, page - 1)}
                  className="disabled:opacity-40"
                >
                  Previous
                </button>
                <span>
                  Page {page} / {pages}
                </span>
                <button
                  type="button"
                  disabled={page >= pages}
                  onClick={() => openUser(detail.id, page + 1)}
                  className="disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="rounded-xl border border-white/10 px-4 py-8 text-center text-sm text-slate-500">
            No recorded sessions yet. New sign-ins will show geo, device, and time
            here.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <History className="h-4 w-4 text-[#00C2B3]" />
            Login History
          </h2>
          <p className="text-xs text-slate-500">
            Super Admin only. Count, time, mobile/web, and geo for every sign-in.
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadUsers(query)}
          className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-300"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
        <Search className="h-3.5 w-3.5 text-slate-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name / email / username / UID"
          className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-300" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <div className="hidden grid-cols-12 gap-2 border-b border-white/10 bg-white/[0.03] px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 md:grid">
            <div className="col-span-4">User</div>
            <div className="col-span-1">Logins</div>
            <div className="col-span-2">Last time</div>
            <div className="col-span-1">Device</div>
            <div className="col-span-3">Location</div>
            <div className="col-span-1" />
          </div>
          <ul className="divide-y divide-white/5">
            {users.map((u) => (
              <li
                key={u.id}
                className="grid gap-2 px-4 py-3 md:grid-cols-12 md:items-center"
              >
                <div className="md:col-span-4">
                  <div className="truncate font-semibold text-white">
                    {u.fullName || u.username}
                  </div>
                  <div className="truncate text-[11px] text-slate-500">
                    @{u.username} · {u.email}
                  </div>
                </div>
                <div className="text-sm font-bold tabular-nums text-cyan-300 md:col-span-1">
                  {u.loginCount || 0}
                </div>
                <div className="text-xs text-slate-300 md:col-span-2">
                  {fmtWhen(u.lastLoginAt)}
                </div>
                <div className="md:col-span-1">
                  <DeviceBadge kind={u.lastDevice} />
                </div>
                <div className="min-w-0 text-xs text-slate-300 md:col-span-3">
                  <div className="truncate">{u.lastLocation || "—"}</div>
                  <div className="truncate font-mono text-[10px] text-slate-500">
                    {u.lastIp || ""}
                  </div>
                </div>
                <div className="md:col-span-1 md:text-right">
                  <button
                    type="button"
                    onClick={() => openUser(u.id, 1)}
                    className="rounded-lg border border-cyan-400/25 bg-cyan-500/10 px-2 py-1 text-[11px] font-semibold text-cyan-200"
                  >
                    View
                  </button>
                </div>
              </li>
            ))}
            {!users.length ? (
              <li className="px-4 py-10 text-center text-sm text-slate-500">
                No users match this search.
              </li>
            ) : null}
          </ul>
        </div>
      )}
    </div>
  );
}
