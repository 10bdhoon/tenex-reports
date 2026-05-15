import type { TenosRunState, TenosTaskState } from './task-state.js';

export interface TenosStateStore {
  getTask(taskId: string): Promise<TenosTaskState | null>;
  saveTask(task: TenosTaskState): Promise<void>;
  listTasks(): Promise<TenosTaskState[]>;
  getRun(runId: string): Promise<TenosRunState | null>;
  saveRun(run: TenosRunState): Promise<void>;
  listRunsByTask(taskId: string): Promise<TenosRunState[]>;
}

export class InMemoryTenosStateStore implements TenosStateStore {
  private tasks = new Map<string, TenosTaskState>();
  private runs = new Map<string, TenosRunState>();

  async getTask(taskId: string): Promise<TenosTaskState | null> {
    return this.tasks.get(taskId) ?? null;
  }

  async saveTask(task: TenosTaskState): Promise<void> {
    this.tasks.set(task.taskId, task);
  }

  async listTasks(): Promise<TenosTaskState[]> {
    return [...this.tasks.values()];
  }

  async getRun(runId: string): Promise<TenosRunState | null> {
    return this.runs.get(runId) ?? null;
  }

  async saveRun(run: TenosRunState): Promise<void> {
    this.runs.set(run.runId, run);
  }

  async listRunsByTask(taskId: string): Promise<TenosRunState[]> {
    return [...this.runs.values()].filter((run) => run.taskId === taskId);
  }
}
