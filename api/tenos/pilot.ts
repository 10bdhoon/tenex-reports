import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyMemoryInjectionRules } from './memory/injection-rules';
import { routeInputEvent } from './router/input-router';
import { TenosWorkerRuntime, type TenosWorker } from './runtime/worker-runtime';
import { createTenosEvent } from './schemas/event-envelope';
import { InMemoryTenosStateStore } from './state/state-store';
import { createRunState, createTaskState } from './state/task-state';

const store = new InMemoryTenosStateStore();

const pilotWorker: TenosWorker = {
  id: 'pilot-worker',
  canHandle(eventType) {
    return eventType === 'task.requested';
  },
  async execute(input) {
    const completedAt = new Date().toISOString();

    return {
      task: {
        ...input.task,
        status: 'completed',
        startedAt: input.task.startedAt ?? input.run.startedAt ?? completedAt,
        completedAt,
        updatedAt: completedAt,
        latestRunId: input.run.runId,
      },
      run: {
        ...input.run,
        status: 'completed',
        endedAt: completedAt,
        progress: {
          percent: 100,
          message: 'pilot execution completed',
          updatedAt: completedAt,
        },
        output: {
          summary: `Processed task: ${input.task.title}`,
          artifacts: [`report:${input.task.taskId}`],
          reportId: `report:${input.task.taskId}`,
        },
      },
      report: {
        summary: `Processed task: ${input.task.title}`,
        artifacts: [`report:${input.task.taskId}`],
      },
    };
  },
};

const runtime = new TenosWorkerRuntime(store, [pilotWorker]);

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
  const result = await runtime.dispatch({
    event,
    task: {
      ...task,
      memoryRefs: memoryPlan.selected.map((item) => item.id),
    },
    run,
    memoryPlan,
  });

  return res.status(200).json({
    ok: true,
    event,
    memoryPlan,
    task: result.task,
    run: result.run,
    report: result.report,
  });
}
