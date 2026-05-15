import { randomUUID } from 'crypto';

export type TenosEventType =
  | 'task.requested'
  | 'task.queued'
  | 'task.started'
  | 'task.progressed'
  | 'task.completed'
  | 'task.failed'
  | 'report.requested'
  | 'report.generated'
  | 'memory.attached'
  | 'system.notice';

export type TenosActorRole =
  | 'user'
  | 'assistant'
  | 'worker'
  | 'system'
  | 'scheduler';

export interface TenosActor {
  id: string;
  role: TenosActorRole;
  label?: string;
}

export interface TenosEventContext {
  sessionId?: string;
  threadId?: string;
  source?: string;
  correlationId?: string;
  causationId?: string;
  tags?: string[];
}

export interface TenosEventEnvelope<TPayload = Record<string, unknown>> {
  id: string;
  type: TenosEventType;
  version: 1;
  createdAt: string;
  actor: TenosActor;
  context: TenosEventContext;
  payload: TPayload;
}

export interface CreateTenosEventInput<TPayload = Record<string, unknown>> {
  type: TenosEventType;
  actor: TenosActor;
  payload: TPayload;
  context?: Partial<TenosEventContext>;
  id?: string;
  createdAt?: string;
}

export function createTenosEvent<TPayload = Record<string, unknown>>(
  input: CreateTenosEventInput<TPayload>,
): TenosEventEnvelope<TPayload> {
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

export function isTenosEventEnvelope(value: unknown): value is TenosEventEnvelope {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Partial<TenosEventEnvelope>;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.type === 'string' &&
    candidate.version === 1 &&
    typeof candidate.createdAt === 'string' &&
    !!candidate.actor &&
    typeof candidate.actor.id === 'string' &&
    typeof candidate.actor.role === 'string' &&
    !!candidate.context &&
    typeof candidate.context === 'object' &&
    'payload' in candidate
  );
}
