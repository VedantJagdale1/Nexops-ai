import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquareText, Send } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getApiErrorMessage } from '../../lib/api-client';
import { getRealtimeSocket } from '../../lib/socket-client';

import { createTaskComment, listTaskComments } from './delivery-api';
import { mergeTaskComment } from './kanban-state';

import type { ChatParticipantDto, TaskCommentDto, TaskDto } from '@nexops/shared';

interface TaskCommentsPanelProps {
  task: TaskDto;
  canComment: boolean;
  typingUsers: ChatParticipantDto[];
}

export function TaskCommentsPanel({
  task,
  canComment,
  typingUsers,
}: TaskCommentsPanelProps): JSX.Element {
  const cache = useQueryClient();
  const [content, setContent] = useState('');
  const typingTimer = useRef<ReturnType<typeof setTimeout>>();
  const queryKey = ['task-comments', task.id] as const;
  const comments = useQuery({ queryKey, queryFn: () => listTaskComments(task.id) });
  const mutation = useMutation({
    mutationFn: (message: string) => createTaskComment(task.id, { content: message }),
    onSuccess: (comment) => {
      cache.setQueryData<TaskCommentDto[]>(queryKey, (current) =>
        mergeTaskComment(current, comment),
      );
      setContent('');
      emitTyping(false);
    },
  });

  const emitTyping = useCallback(
    (isTyping: boolean): void => {
      const socket = getRealtimeSocket();
      if (!socket.connected) return;
      socket.emit('task:typing', { projectId: task.projectId, taskId: task.id, isTyping });
    },
    [task.id, task.projectId],
  );

  useEffect(
    () => () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
      emitTyping(false);
    },
    [emitTyping],
  );

  const typingLabel = useMemo(() => {
    const names = typingUsers.map((user) => user.name);
    if (names.length === 0) return null;
    if (names.length === 1) return `${names[0]} is writing a comment…`;
    if (names.length === 2) return `${names.join(' and ')} are writing comments…`;
    return `${names.slice(0, 2).join(', ')} and ${names.length - 2} others are writing…`;
  }, [typingUsers]);

  const handleContent = (value: string): void => {
    setContent(value);
    emitTyping(Boolean(value.trim()));
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => emitTyping(false), 1_500);
  };

  const submit = async (): Promise<void> => {
    const message = content.trim();
    if (!message || mutation.isPending) return;
    await mutation.mutateAsync(message);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 font-medium capitalize text-slate-600 dark:bg-white/5 dark:text-slate-300">
          {task.status.replace('_', ' ')}
        </span>
        <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 font-medium capitalize text-slate-600 dark:bg-white/5 dark:text-slate-300">
          {task.priority} priority
        </span>
      </div>

      <section aria-labelledby="task-discussion-heading">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3
              id="task-discussion-heading"
              className="flex items-center gap-2 text-sm font-semibold"
            >
              <MessageSquareText className="text-brand-600 size-4" /> Discussion
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Comments appear live for everyone on this board.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500 dark:bg-white/5">
            {comments.data?.length ?? 0}
          </span>
        </div>

        <div
          aria-live="polite"
          className="max-h-72 space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-white/10 dark:bg-white/[0.025]"
        >
          {comments.isLoading ? (
            <div className="space-y-2">
              <div className="h-14 animate-pulse rounded-lg bg-slate-200 dark:bg-white/5" />
              <div className="h-14 animate-pulse rounded-lg bg-slate-200 dark:bg-white/5" />
            </div>
          ) : comments.isError ? (
            <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-200">
              {getApiErrorMessage(comments.error)}
            </div>
          ) : comments.data?.length ? (
            comments.data.map((comment) => <CommentItem key={comment.id} comment={comment} />)
          ) : (
            <div className="grid min-h-28 place-items-center text-center">
              <div>
                <MessageSquareText className="mx-auto size-5 text-slate-300" />
                <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                  Start the discussion
                </p>
                <p className="mt-1 text-xs text-slate-400">Share an update or ask for review.</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {canComment ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <label
            htmlFor="task-comment"
            className="text-xs font-semibold text-slate-600 dark:text-slate-300"
          >
            Add comment
          </label>
          <textarea
            id="task-comment"
            value={content}
            onChange={(event) => handleContent(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                event.preventDefault();
                void submit();
              }
            }}
            maxLength={10_000}
            rows={3}
            placeholder="Write an update for the team…"
            className="focus:border-brand-400 focus:ring-brand-100 dark:focus:ring-brand-950 mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:ring-2 dark:border-white/10 dark:bg-slate-950"
          />
          <div className="mt-2 flex min-h-8 items-center justify-between gap-3">
            <span aria-live="polite" className="text-brand-700 dark:text-brand-300 text-xs">
              {typingLabel ?? 'Ctrl/⌘ + Enter to post'}
            </span>
            <button
              type="submit"
              disabled={!content.trim() || mutation.isPending}
              className="bg-brand-600 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="size-3.5" /> {mutation.isPending ? 'Posting…' : 'Post comment'}
            </button>
          </div>
          {mutation.isError ? (
            <p role="alert" className="mt-2 text-xs text-rose-600 dark:text-rose-300">
              {getApiErrorMessage(mutation.error)}
            </p>
          ) : null}
        </form>
      ) : (
        <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500 dark:bg-white/[0.025]">
          You can view this discussion, but your role cannot add task comments.
        </p>
      )}
    </div>
  );
}

function CommentItem({ comment }: { comment: TaskCommentDto }): JSX.Element {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-900">
      <div className="flex items-center gap-2">
        <div className="bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-200 grid size-7 shrink-0 place-items-center rounded-full text-[10px] font-bold">
          {comment.author.name
            .split(' ')
            .slice(0, 2)
            .map((part) => part[0])
            .join('')
            .toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold">{comment.author.name}</p>
          <p className="text-[10px] capitalize text-slate-400">
            {comment.author.role.replace('_', ' ')} ·{' '}
            {new Date(comment.createdAt).toLocaleString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
        </div>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-5 text-slate-700 dark:text-slate-200">
        {comment.content}
      </p>
    </article>
  );
}
