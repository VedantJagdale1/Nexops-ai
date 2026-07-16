import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TaskCommentsPanel } from './task-comments-panel';

import type { TaskCommentDto, TaskDto } from '@nexops/shared';

const { createTaskCommentMock, listTaskCommentsMock, socketEmitMock } = vi.hoisted(() => ({
  createTaskCommentMock: vi.fn(),
  listTaskCommentsMock: vi.fn(),
  socketEmitMock: vi.fn(),
}));

vi.mock('./delivery-api', () => ({
  createTaskComment: createTaskCommentMock,
  listTaskComments: listTaskCommentsMock,
}));

vi.mock('../../lib/socket-client', () => ({
  getRealtimeSocket: () => ({ connected: true, emit: socketEmitMock }),
}));

const task = {
  id: 'task-1',
  projectId: 'project-1',
  title: 'Verify real-time board updates',
  status: 'in_progress',
  priority: 'high',
  assigneeIds: [],
  reporterId: 'user-1',
  loggedMinutes: 0,
  labels: [],
  checklist: [],
  position: 0,
  createdAt: '2026-07-16T07:00:00.000Z',
  updatedAt: '2026-07-16T07:00:00.000Z',
} satisfies TaskDto;

const comment = {
  id: 'comment-1',
  taskId: task.id,
  projectId: task.projectId,
  author: { id: 'user-1', name: 'Maya Shah', role: 'project_manager' },
  content: 'The second browser updated without a refresh.',
  createdAt: '2026-07-16T07:05:00.000Z',
} satisfies TaskCommentDto;

function renderPanel(): void {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <TaskCommentsPanel
        task={task}
        canComment
        typingUsers={[{ id: 'user-2', name: 'Arjun Rao', role: 'developer' }]}
      />
    </QueryClientProvider>,
  );
}

describe('TaskCommentsPanel', () => {
  beforeEach(() => {
    createTaskCommentMock.mockReset();
    listTaskCommentsMock.mockReset();
    socketEmitMock.mockReset();
    listTaskCommentsMock.mockResolvedValue([comment]);
    createTaskCommentMock.mockResolvedValue({
      ...comment,
      id: 'comment-2',
      content: 'Ready to merge.',
    });
  });

  it('renders persisted comments and a live typing indicator', async () => {
    renderPanel();

    expect(await screen.findByText(comment.content)).toBeVisible();
    expect(screen.getByText('Arjun Rao is writing a comment…')).toBeVisible();
  });

  it('posts a comment and broadcasts typing state for the current task', async () => {
    renderPanel();
    const input = screen.getByLabelText(/add comment/i);
    await userEvent.type(input, 'Ready to merge.');
    await userEvent.click(screen.getByRole('button', { name: /post comment/i }));

    expect(createTaskCommentMock).toHaveBeenCalledWith(task.id, { content: 'Ready to merge.' });
    expect(socketEmitMock).toHaveBeenCalledWith('task:typing', {
      projectId: task.projectId,
      taskId: task.id,
      isTyping: true,
    });
  });
});
