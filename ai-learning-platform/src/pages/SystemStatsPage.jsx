import { useState, useEffect, useCallback } from "react";
import { Activity, Zap, AlertTriangle, Database, RefreshCw } from "lucide-react";

const BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/api\/?$/, "");

const STATUS_COLOR = {
  active:   { dot: "#10B981", badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  cooldown: { dot: "#F59E0B", badge: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  inactive: { dot: "#EF4444", badge: "bg-red-500/15 text-red-400 border-red-500/30" },
};

function StatCard({ icon, label, value, sub, color = "#A78BFA" }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${color}18`, color }}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{value ?? "—"}</div>
        <div className="text-sm text-slate-400">{label}</div>
        {sub && <div className="text-xs text-slate-600 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function ProviderRow({ p }) {
  const sc = STATUS_COLOR[p.status] ?? STATUS_COLOR.inactive;
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-white/8 bg-white/3 hover:bg-white/5 transition-colors">
      {/* Status dot */}
      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: sc.dot }} />

      {/* Name + status */}
      <div className="w-24 shrink-0">
        <div className="text-sm font-semibold text-white capitalize">{p.provider}</div>
        <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-xs font-medium border ${sc.badge}`}>
          {p.status}{p.cooldown > 0 ? ` (${p.cooldown}s)` : ""}
        </span>
      </div>

      {/* Metrics */}
      <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <div className="text-slate-500 mb-0.5">Calls</div>
          <div className="text-white font-medium">{p.usage}</div>
        </div>
        <div>
          <div className="text-slate-500 mb-0.5">Failures</div>
          <div className={`font-medium ${p.failures > 0 ? "text-amber-400" : "text-white"}`}>{p.failures}</div>
        </div>
        <div>
          <div className="text-slate-500 mb-0.5">Avg latency</div>
          <div className="text-white font-medium">{p.avgResponseTime ? `${p.avgResponseTime}ms` : "—"}</div>
        </div>
        <div>
          <div className="text-slate-500 mb-0.5">Last latency</div>
          <div className="text-white font-medium">{p.lastResponseTime ? `${p.lastResponseTime}ms` : "—"}</div>
        </div>
      </div>

      {/* Last error type */}
      {p.lastErrorType && (
        <div className="text-xs text-red-400 shrink-0 hidden sm:block">{p.lastErrorType}</div>
      )}
    </div>
  );
}

export default function SystemStatsPage() {
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/api/stats`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStats(await res.json());
      setLastRefresh(new Date().toLocaleTimeString());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 15000); // auto-refresh every 15s
    return () => clearInterval(interval);
  }, [fetchStats]);

  const cache     = stats?.cache     ?? {};
  const providers = stats?.providers ?? [];
  const totalCalls = providers.reduce((s, p) => s + p.usage, 0);
  const totalFails = providers.reduce((s, p) => s + p.failures, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity size={20} className="text-violet-400" /> System Stats
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Live AI provider + cache performance
            {lastRefresh && <span className="ml-2 text-slate-600">· refreshed {lastRefresh}</span>}
          </p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 hover:bg-white/10 transition-all disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          ⚠️ Failed to load stats: {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={<Zap size={18} />}          label="Total AI Calls"    value={totalCalls}              color="#A78BFA" />
        <StatCard icon={<AlertTriangle size={18} />} label="Total Failures"    value={totalFails}              color="#F59E0B" />
        <StatCard icon={<Database size={18} />}      label="Cache Hit Rate"    value={`${cache.hitRate ?? 0}%`} color="#10B981"
          sub={`${(cache.semanticHits ?? 0) + (cache.hashHits ?? 0)} hits / ${cache.total ?? 0} total`} />
        <StatCard icon={<Activity size={18} />}      label="Cache Misses"      value={cache.misses ?? 0}        color="#3B82F6" />
      </div>

      {/* Cache breakdown */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Database size={15} className="text-blue-400" /> Cache Performance
        </h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Semantic Hits", value: cache.semanticHits ?? 0, color: "#A78BFA" },
            { label: "Hash Hits",     value: cache.hashHits     ?? 0, color: "#10B981" },
            { label: "Misses (AI)",   value: cache.misses       ?? 0, color: "#3B82F6" },
          ].map(({ label, value, color }) => {
            const total = (cache.total || 1);
            const pct   = Math.round((value / total) * 100);
            return (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-400">{label}</span>
                  <span style={{ color }} className="font-medium">{value}</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: color }} />
                </div>
                <div className="text-xs text-slate-600 mt-1">{pct}%</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Provider table */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Zap size={15} className="text-violet-400" /> Provider Status
        </h3>
        {loading && !stats ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="space-y-2">
            {providers.map(p => <ProviderRow key={p.provider} p={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}
