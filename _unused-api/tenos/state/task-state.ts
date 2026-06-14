export type TenosTaskStatus =
  | 'draft'
  | 'queued'
  | 'running'
  | 'blocked'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type TenosRunStatus =
  | 'idle'
  | 'booting'
  | 'running'
  | 'waiting_input'
  | 'retrying'
  | 'completed'
  | 'failed';

export interface TenosTaskState {
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
}

export interface TenosRunState {
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
}

export function createTaskState(
  input: Pick<TenosTaskState, 'taskId' | 'title'> &
    Partial<Omit<TenosTaskState, 'taskId' | 'title'>>,
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

export function createRunState(
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
