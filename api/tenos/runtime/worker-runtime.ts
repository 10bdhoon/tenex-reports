import type { TenosEventEnvelope } from '../schemas/event-envelope.ts';
import type { MemoryInjectionPlan } from '../memory/injection-rules.ts';
import type { TenosRunState, TenosTaskState } from '../state/task-state.ts';
import type { TenosStateStore } from '../state/state-store.ts';

export interface WorkerExecutionInput {
  event: TenosEventEnvelope;
  task: TenosTaskState;
  run: TenosRunState;
  memoryPlan?: MemoryInjectionPlan;
}

export interface WorkerExecutionResult {
  run: TenosRunState;
  task: TenosTaskState;
  report: {
    summary: string;
    artifacts: string[];
  };
}

export interface TenosWorker {
  id: string;
  canHandle(eventType: string): boolean;
  execute(input: WorkerExecutionInput): Promise<WorkerExecutionResult>;
}

export class TenosWorkerRuntime {
  constructor(
    private readonly store: TenosStateStore,
    private readonly workers: TenosWorker[],
  ) {}

  async dispatch(input: WorkerExecutionInput): Promise<WorkerExecutionResult> {
    const worker = this.workers.find((candidate) => candidate.canHandle(input.event.type));

    if (!worker) {
      throw new Error(`No worker registered for event type: ${input.event.type}`);
    }

    const nextRun: TenosRunState = {
      ...input.run,
      workerId: worker.id,
      status: 'running',
      startedAt: input.run.startedAt ?? new Date().toISOString(),
      attempts: input.run.attempts + 1,
      progress: {
        percent: 5,
        message: 'worker accepted task',
        updatedAt: new Date().toISOString(),
      },
    };

    await this.store.saveRun(nextRun);
    const result = await worker.execute({ ...input, run: nextRun });
    await this.store.saveRun(result.run);
    await this.store.saveTask(result.task);

    return result;
  }
}
