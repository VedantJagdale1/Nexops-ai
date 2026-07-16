import { describe, expect, it } from 'vitest';

import { mergeTaskComment, optimisticallyMoveTask, reconcileRealtimeTask } from './kanban-state';

import type { TaskCommentDto, TaskDto } from '@nexops/shared';

const base = {
  projectId: 'project',
  priority: 'medium' as const,
  assigneeIds: [],
  reporterId: 'reporter',
  loggedMinutes: 0,
  labels: [],
  checklist: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};
const tasks: TaskDto[] = [
  { ...base, id: 'one', title: 'One', status: 'todo', position: 0 },
  { ...base, id: 'two', title: 'Two', status: 'in_progress', position: 0 },
  { ...base, id: 'three', title: 'Three', status: 'in_progress', position: 1 },
];

describe('optimisticallyMoveTask', () => {
  it('moves a task across columns and normalises target positions without mutating the source', () => {
    const result = optimisticallyMoveTask(tasks, 'one', 'in_progress', 1);
    expect(result.find((task) => task.id === 'one')).toMatchObject({
      status: 'in_progress',
      position: 1,
    });
    expect(
      result
        .filter((task) => task.status === 'in_progress')
        .sort((first, second) => first.position - second.position)
        .map((task) => task.id),
    ).toEqual(['two', 'one', 'three']);
    expect(tasks[0]?.status).toBe('todo');
  });

  it('reconciles a task received from another client and normalises both columns', () => {
    const incoming = {
      ...tasks[0]!,
      status: 'in_progress' as const,
      position: 1,
      updatedAt: '2026-01-01T00:05:00.000Z',
    };
    const result = reconcileRealtimeTask(tasks, incoming);

    expect(
      result
        .filter((task) => task.status === 'in_progress')
        .sort((first, second) => first.position - second.position)
        .map((task) => task.id),
    ).toEqual(['two', 'one', 'three']);
    expect(result.filter((task) => task.status === 'todo')).toHaveLength(0);
  });

  it('deduplicates comments received through the REST response and Socket.IO broadcast', () => {
    const comment = {
      id: 'comment-one',
      taskId: 'one',
      projectId: 'project',
      author: { id: 'developer', name: 'Dev User', role: 'developer' },
      content: 'Ready for review.',
      createdAt: '2026-01-01T00:10:00.000Z',
    } satisfies TaskCommentDto;

    expect(mergeTaskComment(mergeTaskComment([], comment), comment)).toEqual([comment]);
  });
});
