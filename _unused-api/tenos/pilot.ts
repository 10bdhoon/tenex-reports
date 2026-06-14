import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'crypto';

type MemoryCandidate = {
  id: string;
  source: 'memory-file' | 'memory-db' | 'session-log' | 'manual-note';
  summary: string;
  body: string;
  tags?: string[];
  score?: number;
  updatedAt?: string;
};

type MemoryPriority = 'critical' | 'high' | 'normal' | 'low';

type MemoryInjectionRule = {
  name: string;
  description: string;
  maxItems: number;
  minScore?: number;
  requiredTags?: string[];
  priority: MemoryPriority;
};

type MemoryInjectionPlan = {
  selected: MemoryCandidate[];
  dropped: MemoryCandidate[];
  appliedRules: string[];
  totalTokensEstimate: number;
};

type TenosTaskStatus = 'draft' | 'queued' | 'running' | 'blocked' | 'completed' | 'failed' | 'cancelled';
type TenosRunStatus = 'idle' | 'booting' | 'running' | 'waiting_input' | 'retrying' | 'completed' | 'failed';
type TenosEventType = 'task.requested' | 'task.queued' | 'task.started' | 'task.progressed' | 'task.completed' | 'task.failed' | 'report.requested' | 'report.generated' | 'memory.attached' | 'system.notice';
type TenosActorRole = 'user' | 'assistant' | 'worker' | 'system' | 'scheduler';

type TenosActor = {
  id: string;
  role: TenosActorRole;
  label?: string;
};

type TenosEventContext = {
  sessionId?: string;
  threadId?: string;
  source?: string;
  correlationId?: string;
  causationId?: string;
  tags?: string[];
};

type TenosEventEnvelope<TPayload = Record<string, unknown>> = {
  id: string;
  type: TenosEventType;
  version: 1;
  createdAt: string;
  actor: TenosActor;
  context: TenosEventContext;
  payload: TPayload;
};

type TenosTaskState = {
  taskId: string;
  title: string;
  status: TenosTaskStatus;
  priority: 'critical' | 'high' | 'normal' | 'low';
  owner?: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  inputEventId?: string;
  latestRunId?: string;
  memoryRefs: string[];
  tags: string[];
  metadata: Record<string, unknown>;
};

type TenosRunState = {
  runId: string;
  taskId: string;
  status: TenosRunStatus;
  workerId?: string;
  startedAt?: string;
  endedAt?: string;
  attempts: number;
  lastError?: {
    code?: string;
    message: string;
    retriable?: boolean;
  };
  progress: {
    percent?: number;
    message?: string;
    updatedAt?: string;
  };
  output?: {
    summary?: string;
    artifacts?: string[];
    reportId?: string;
  };
};

const DEFAULT_MEMORY_RULES: MemoryInjectionRule[] = [
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

class InMemoryTenosStateStore {
  private tasks = new Map<string, TenosTaskState>();
  private runs = new Map<string, TenosRunState>();

  async saveTask(task: TenosTaskState): Promise<void> {
    this.tasks.set(task.taskId, task);
  }

  async saveRun(run: TenosRunState): Promise<void> {
    this.runs.set(run.runId, run);
  }
}

function applyMemoryInjectionRules(
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
      if (rule.requiredTags?.length && !rule.requiredTags.every((tag) => candidate.tags?.includes(tag))) continue;
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

  return { selected, dropped, appliedRules, totalTokensEstimate };
}

function createTenosEvent<TPayload = Record<string, unknown>>(input: {
  type: TenosEventType;
  actor: TenosActor;
  payload: TPayload;
  context?: Partial<TenosEventContext>;
  id?: string;
  createdAt?: string;
}): TenosEventEnvelope<TPayload> {
  return {
    id: input.id ?? randomUUID(),
    type: input.type,
    version: 1,
    createdAt: input.createdAt ?? new Date().toISOString(),
    actor: input.actor,
    context: {
      sessionId: input.context?.sessionId,
      threadId: input.context?.threadId,
      source: input.context?.source,
      correlationId: input.context?.correlationId,
      causationId: input.context?.causationId,
      tags: input.context?.tags ?? [],
    },
    payload: input.payload,
  };
}

function createTaskState(
  input: Pick<TenosTaskState, 'taskId' | 'title'> & Partial<Omit<TenosTaskState, 'taskId' | 'title'>>,
): TenosTaskState {
  const now = new Date().toISOString();
  return {
    taskId: input.taskId,
    title: input.title,
    status: input.status ?? 'draft',
    priority: input.priority ?? 'normal',
    owner: input.owner,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    inputEventId: input.inputEventId,
    latestRunId: input.latestRunId,
    memoryRefs: input.memoryRefs ?? [],
    tags: input.tags ?? [],
    metadata: input.metadata ?? {},
  };
}

function createRunState(
  input: Pick<TenosRunState, 'runId' | 'taskId'> & Partial<Omit<TenosRunState, 'runId' | 'taskId'>>,
): TenosRunState {
  return {
    runId: input.runId,
    taskId: input.taskId,
    status: input.status ?? 'idle',
    workerId: input.workerId,
    startedAt: input.startedAt,
    endedAt: input.endedAt,
    attempts: input.attempts ?? 0,
    lastError: input.lastError,
    progress: input.progress ?? {},
    output: input.output,
  };
}

function routeInputEvent(event: TenosEventEnvelope<{ title?: string; priority?: TenosTaskState['priority'] }>) {
  const taskId = event.context.correlationId ?? event.id;

  const task = createTaskState({
    taskId,
    title: event.payload.title ?? `Task for ${event.type}`,
    status: 'queued',
    priority: event.payload.priority ?? 'normal',
    inputEventId: event.id,
    tags: event.context.tags ?? [],
  });

  const run = createRunState({
    runId: randomUUID(),
    taskId: task.taskId,
    status: 'booting',
    progress: {
      percent: 0,
      message: 'task routed',
      updatedAt: new Date().toISOString(),
    },
  });

  return { task, run };
}

const store = new InMemoryTenosStateStore();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const title = typeof req.body?.title === 'string' ? req.body.title : 'Untitled TENOS task';
  const priority = req.body?.priority === 'critical' || req.body?.priority === 'high' || req.body?.priority === 'low'
    ? req.body.priority
    : 'normal';
  const memoryCandidates = Array.isArray(req.body?.memoryCandidates) ? req.body.memoryCandidates : [];

  const event = createTenosEvent({
    type: 'task.requested',
    actor: {
      id: 'pilot-api',
      role: 'system',
      label: 'TENOS Pilot API',
    },
    context: {
      source: 'api/tenos/pilot',
      tags: ['pilot', 'tenos'],
    },
    payload: {
      title,
      priority,
    },
  });

  const routed = routeInputEvent(event);
  const task = createTaskState({
    ...routed.task,
    startedAt: new Date().toISOString(),
  });
  const run = createRunState({
    ...routed.run,
    status: 'running',
    startedAt: new Date().toISOString(),
  });

  await store.saveTask(task);
  await store.saveRun(run);

  const memoryPlan = applyMemoryInjectionRules(memoryCandidates);
  const completedAt = new Date().toISOString();

  const finalTask: TenosTaskState = {
    ...task,
    status: 'completed',
    startedAt: task.startedAt ?? run.startedAt ?? completedAt,
    completedAt,
    updatedAt: completedAt,
    latestRunId: run.runId,
    memoryRefs: memoryPlan.selected.map((item) => item.id),
  };

  const finalRun: TenosRunState = {
    ...run,
    workerId: 'pilot-worker',
    status: 'completed',
    endedAt: completedAt,
    attempts: (run.attempts ?? 0) + 1,
    progress: {
      percent: 100,
      message: 'pilot execution completed',
      updatedAt: completedAt,
    },
    output: {
      summary: `Processed task: ${finalTask.title}`,
      artifacts: [`report:${finalTask.taskId}`],
      reportId: `report:${finalTask.taskId}`,
    },
  };

  await store.saveTask(finalTask);
  await store.saveRun(finalRun);

  return res.status(200).json({
    ok: true,
    event,
    memoryPlan,
    task: finalTask,
    run: finalRun,
    report: {
      summary: `Processed task: ${finalTask.title}`,
      artifacts: [`report:${finalTask.taskId}`],
    },
  });
}
