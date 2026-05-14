export type MemoryPriority = 'critical' | 'high' | 'normal' | 'low';

export interface MemoryCandidate {
  id: string;
  source: 'memory-file' | 'memory-db' | 'session-log' | 'manual-note';
  summary: string;
  body: string;
  tags?: string[];
  score?: number;
  updatedAt?: string;
}

export interface MemoryInjectionRule {
  name: string;
  description: string;
  maxItems: number;
  minScore?: number;
  requiredTags?: string[];
  priority: MemoryPriority;
}

export interface MemoryInjectionPlan {
  selected: MemoryCandidate[];
  dropped: MemoryCandidate[];
  appliedRules: string[];
  totalTokensEstimate: number;
}

export const DEFAULT_MEMORY_RULES: MemoryInjectionRule[] = [
  {
    name: 'critical-decisions',
    description: 'Include non-negotiable decisions and current operating constraints first.',
    maxItems: 5,
    requiredTags: ['decision'],
    priority: 'critical',
  },
  {
    name: 'recent-execution-context',
    description: 'Keep the most relevant recent execution history for continuity.',
    maxItems: 8,
    minScore: 0.6,
    priority: 'high',
  },
  {
    name: 'reference-context',
    description: 'Fill remaining room with supporting context only if budget allows.',
    maxItems: 5,
    minScore: 0.75,
    priority: 'normal',
  },
];

export function applyMemoryInjectionRules(
  candidates: MemoryCandidate[],
  rules: MemoryInjectionRule[] = DEFAULT_MEMORY_RULES,
): MemoryInjectionPlan {
  const selected: MemoryCandidate[] = [];
  const dropped: MemoryCandidate[] = [];
  const seen = new Set<string>();
  const appliedRules: string[] = [];

  const ranked = [...candidates].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  for (const rule of rules) {
    let count = 0;

    for (const candidate of ranked) {
      if (seen.has(candidate.id)) continue;
      if (count >= rule.maxItems) continue;
      if (rule.minScore !== undefined && (candidate.score ?? 0) < rule.minScore) continue;
      if (
        rule.requiredTags?.length &&
        !rule.requiredTags.every((tag) => candidate.tags?.includes(tag))
      ) {
        continue;
      }

      selected.push(candidate);
      seen.add(candidate.id);
      count += 1;
    }

    appliedRules.push(rule.name);
  }

  for (const candidate of ranked) {
    if (!seen.has(candidate.id)) dropped.push(candidate);
  }

  const totalTokensEstimate = selected.reduce((sum, candidate) => {
    return sum + Math.ceil((candidate.summary.length + candidate.body.length) / 4);
  }, 0);

  return {
    selected,
    dropped,
    appliedRules,
    totalTokensEstimate,
  };
}
