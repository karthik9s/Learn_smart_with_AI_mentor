/* ── System Stats ──────────────────────────────────────────
   Single source of truth for cache + provider metrics.
   Imported by aiRouter (cache counters) and /api/stats route.
   ──────────────────────────────────────────────────────── */

const cache = {
  semanticHits: 0,
  hashHits:     0,
  misses:       0,
};

function recordSemanticHit() { cache.semanticHits++; }
function recordHashHit()     { cache.hashHits++;     }
function recordMiss()        { cache.misses++;        }

function getCacheStats() {
  const total    = cache.semanticHits + cache.hashHits + cache.misses;
  const hitRate  = total > 0 ? Math.round(((cache.semanticHits + cache.hashHits) / total) * 100) : 0;
  return { ...cache, total, hitRate };
}

module.exports = { recordSemanticHit, recordHashHit, recordMiss, getCacheStats };
