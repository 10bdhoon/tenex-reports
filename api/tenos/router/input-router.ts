import type { TenosEventEnvelope } from '../schemas/event-envelope';
import { createRunState, createTaskState, type TenosRunState, type TenosTaskState } from '../state/task-state';

export interface RouterResult {
  task: TenosTaskState;
  run: TenosRunState;
}

export function routeInputEvent(event: TenosEventEnvelope<{ title?: string; priority?: TenosTaskState['priority'] }>): RouterResult {
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
    runId: crypto.randomUUID(),
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
