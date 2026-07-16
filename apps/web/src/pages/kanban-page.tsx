import {
  DndContext,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { roleHasPermission, taskStatuses } from '@nexops/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  CheckSquare2,
  Clock3,
  GripVertical,
  MessageSquareText,
  Plus,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { ErrorPanel } from '../components/error-panel';
import { Modal } from '../components/modal';
import { createTask, listTasks, moveTask } from '../features/delivery/delivery-api';
import { optimisticallyMoveTask } from '../features/delivery/kanban-state';
import { TaskCommentsPanel } from '../features/delivery/task-comments-panel';
import { TaskForm } from '../features/delivery/task-form';
import { getApiErrorMessage } from '../lib/api-client';
import { getRealtimeSocket } from '../lib/socket-client';
import { useAuthStore } from '../stores/auth-store';

import { useProject } from './project-context';

import type { DragEndEvent } from '@dnd-kit/core';
import type { ChatParticipantDto, TaskDto, TaskInput, TaskTypingDto } from '@nexops/shared';

const columns: Array<{ id: TaskDto['status']; label: string; dot: string }> = [
  { id: 'backlog', label: 'Backlog', dot: 'bg-slate-400' },
  { id: 'todo', label: 'To Do', dot: 'bg-blue-500' },
  { id: 'in_progress', label: 'In Progress', dot: 'bg-amber-500' },
  { id: 'in_review', label: 'In Review', dot: 'bg-violet-500' },
  { id: 'completed', label: 'Completed', dot: 'bg-emerald-500' },
];
const priorityTone = {
  low: 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300',
  medium: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  high: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  critical: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
};

export function KanbanPage(): JSX.Element {
  const project = useProject();
  const user = useAuthStore((state) => state.user);
  const cache = useQueryClient();
  const [modal, setModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskDto>();
  const [presence, setPresence] = useState<ChatParticipantDto[]>([]);
  const [typingByTask, setTypingByTask] = useState<Map<string, Map<string, ChatParticipantDto>>>(
    new Map(),
  );
  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'live' | 'offline'>(
    'connecting',
  );
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const queryKey = ['tasks', project.id] as const;
  const query = useQuery({ queryKey, queryFn: () => listTasks(project.id) });
  useEffect(() => {
    const socket = getRealtimeSocket();
    const joinProject = () => {
      setRealtimeStatus('connecting');
      socket.emit('project:join', { projectId: project.id }, (response) => {
        if (response.success) {
          setPresence(response.data.users);
          setRealtimeStatus('live');
        } else {
          setRealtimeStatus('offline');
        }
      });
    };
    const handlePresence = (update: { projectId: string; users: ChatParticipantDto[] }) => {
      if (update.projectId !== project.id) return;
      setPresence(update.users);
      const onlineIds = new Set(update.users.map((participant) => participant.id));
      setTypingByTask((current) => {
        const next = new Map<string, Map<string, ChatParticipantDto>>();
        for (const [taskId, users] of current) {
          const online = new Map(Array.from(users).filter(([userId]) => onlineIds.has(userId)));
          if (online.size > 0) next.set(taskId, online);
        }
        return next;
      });
    };
    const handleTyping = (update: TaskTypingDto) => {
      if (update.projectId !== project.id) return;
      setTypingByTask((current) => {
        const next = new Map(current);
        const users = new Map(next.get(update.taskId) ?? []);
        if (update.isTyping) users.set(update.user.id, update.user);
        else users.delete(update.user.id);
        if (users.size > 0) next.set(update.taskId, users);
        else next.delete(update.taskId);
        return next;
      });
    };
    const handleDisconnect = () => {
      setPresence([]);
      setTypingByTask(new Map());
      setRealtimeStatus('offline');
    };

    socket.on('connect', joinProject);
    socket.on('disconnect', handleDisconnect);
    socket.on('presence:update', handlePresence);
    socket.on('task:typing', handleTyping);
    if (socket.connected) joinProject();

    return () => {
      socket.off('connect', joinProject);
      socket.off('disconnect', handleDisconnect);
      socket.off('presence:update', handlePresence);
      socket.off('task:typing', handleTyping);
      if (socket.connected)
        socket.emit('project:leave', { projectId: project.id }, () => undefined);
    };
  }, [project.id]);
  const createMutation = useMutation({
    mutationFn: createTask,
    onSuccess: async () => {
      setModal(false);
      await cache.invalidateQueries({ queryKey });
    },
  });
  const moveMutation = useMutation({
    mutationFn: ({
      id,
      status,
      position,
      expectedUpdatedAt,
    }: {
      id: string;
      status: TaskDto['status'];
      position: number;
      expectedUpdatedAt: string;
    }) => moveTask(id, status, position, expectedUpdatedAt),
    onMutate: async (change) => {
      await cache.cancelQueries({ queryKey });
      const previous = cache.getQueryData<TaskDto[]>(queryKey);
      if (previous)
        cache.setQueryData<TaskDto[]>(
          queryKey,
          optimisticallyMoveTask(previous, change.id, change.status, change.position),
        );
      return { previous };
    },
    onError: (_error, _change, context) => {
      if (context?.previous) cache.setQueryData(queryKey, context.previous);
    },
    onSettled: async () => {
      await cache.invalidateQueries({ queryKey });
    },
  });
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id || !query.data) return;
    const moving = query.data.find((task) => task.id === active.id);
    if (!moving) return;
    const overTask = query.data.find((task) => task.id === over.id);
    const status = taskStatuses.includes(String(over.id) as TaskDto['status'])
      ? (String(over.id) as TaskDto['status'])
      : overTask?.status;
    if (!status) return;
    const peers = query.data
      .filter((task) => task.status === status && task.id !== moving.id)
      .sort((a, b) => a.position - b.position);
    const position = overTask
      ? Math.max(
          0,
          peers.findIndex((task) => task.id === overTask.id),
        )
      : peers.length;
    moveMutation.mutate({
      id: moving.id,
      status,
      position: position < 0 ? peers.length : position,
      expectedUpdatedAt: moving.updatedAt,
    });
  };
  if (query.isLoading)
    return <div className="h-96 animate-pulse rounded-2xl bg-slate-200 dark:bg-white/5" />;
  if (query.isError)
    return (
      <ErrorPanel message={getApiErrorMessage(query.error)} onRetry={() => void query.refetch()} />
    );
  const tasks = query.data ?? [];
  return (
    <section>
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-semibold">Task board</h2>
          <p className="mt-1 text-xs text-slate-500">
            Drag tasks between stages. Changes are saved immediately.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <div className="flex -space-x-1.5" aria-hidden="true">
              {presence.slice(0, 3).map((participant) => (
                <span
                  key={participant.id}
                  title={participant.name}
                  className="bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-200 grid size-6 place-items-center rounded-full border-2 border-white text-[9px] font-bold dark:border-slate-900"
                >
                  {participant.name
                    .split(' ')
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join('')
                    .toUpperCase()}
                </span>
              ))}
              {presence.length === 0 ? <UsersRound className="size-5 text-slate-400" /> : null}
            </div>
            <div className="leading-tight">
              <p className="text-xs font-semibold">{presence.length} viewing</p>
              <p
                className={`text-[10px] font-medium ${realtimeStatus === 'live' ? 'text-emerald-600 dark:text-emerald-300' : 'text-slate-400'}`}
              >
                {realtimeStatus === 'live'
                  ? 'Live collaboration'
                  : realtimeStatus === 'connecting'
                    ? 'Connecting…'
                    : 'Reconnecting…'}
              </p>
            </div>
          </div>
          {user && roleHasPermission(user.role, 'task:create') ? (
            <button
              onClick={() => setModal(true)}
              className="bg-brand-600 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
            >
              <Plus className="size-4" /> Add task
            </button>
          ) : null}
        </div>
      </div>
      {moveMutation.isError ? (
        <div
          role="alert"
          className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-200"
        >
          {getApiErrorMessage(moveMutation.error)}
        </div>
      ) : null}
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="grid auto-cols-[minmax(270px,1fr)] grid-flow-col gap-4 overflow-x-auto pb-4 xl:grid-flow-row xl:grid-cols-5">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              tasks={tasks
                .filter((task) => task.status === column.id)
                .sort((a, b) => a.position - b.position)}
              onDiscuss={setSelectedTask}
            />
          ))}
        </div>
      </DndContext>
      <Modal open={modal} title="Create task" onClose={() => setModal(false)}>
        <TaskForm
          projectId={project.id}
          onSubmit={async (input: TaskInput) => {
            await createMutation.mutateAsync(input);
          }}
          submitting={createMutation.isPending}
        />
      </Modal>
      <Modal
        open={Boolean(selectedTask)}
        title={selectedTask?.title ?? 'Task discussion'}
        onClose={() => setSelectedTask(undefined)}
      >
        {selectedTask ? (
          <TaskCommentsPanel
            task={tasks.find((task) => task.id === selectedTask.id) ?? selectedTask}
            canComment={Boolean(user && roleHasPermission(user.role, 'task:comment'))}
            typingUsers={Array.from(typingByTask.get(selectedTask.id)?.values() ?? [])}
          />
        ) : null}
      </Modal>
    </section>
  );
}

function KanbanColumn({
  column,
  tasks,
  onDiscuss,
}: {
  column: (typeof columns)[number];
  tasks: TaskDto[];
  onDiscuss: (task: TaskDto) => void;
}): JSX.Element {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  return (
    <section
      ref={setNodeRef}
      className={`min-h-[28rem] rounded-2xl border p-3 transition ${isOver ? 'border-brand-400 bg-brand-50/70 dark:bg-brand-950/20' : 'border-slate-200 bg-slate-100/70 dark:border-white/10 dark:bg-white/[0.025]'}`}
    >
      <header className="flex items-center justify-between px-1 py-2">
        <div className="flex items-center gap-2">
          <span className={`size-2.5 rounded-full ${column.dot}`} />
          <h3 className="text-sm font-semibold">{column.label}</h3>
        </div>
        <span className="rounded-lg bg-white px-2 py-1 text-xs font-semibold text-slate-500 shadow-sm dark:bg-slate-900">
          {tasks.length}
        </span>
      </header>
      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <div className="mt-2 space-y-3">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onDiscuss={onDiscuss} />
          ))}
          {tasks.length === 0 ? (
            <div className="grid h-32 place-items-center rounded-xl border border-dashed border-slate-300 text-xs text-slate-400 dark:border-white/10">
              Drop a task here
            </div>
          ) : null}
        </div>
      </SortableContext>
    </section>
  );
}

function TaskCard({
  task,
  onDiscuss,
}: {
  task: TaskDto;
  onDiscuss: (task: TaskDto) => void;
}): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });
  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900 ${isDragging ? 'z-50 rotate-1 opacity-70 shadow-xl' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={`rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${priorityTone[task.priority]}`}
        >
          {task.priority}
        </span>
        <button
          aria-label={`Move ${task.title}`}
          className="cursor-grab rounded p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-500 active:cursor-grabbing dark:hover:bg-white/5"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
      </div>
      <h4 className="mt-3 text-sm font-semibold leading-5">{task.title}</h4>
      {task.labels.length ? (
        <div className="mt-3 flex flex-wrap gap-1">
          {task.labels.slice(0, 3).map((label) => (
            <span
              key={label}
              className="bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300 rounded px-1.5 py-0.5 text-[10px] font-medium"
            >
              {label}
            </span>
          ))}
        </div>
      ) : null}
      <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-3 text-xs text-slate-400 dark:border-white/5">
        {task.dueDate ? (
          <span className="flex items-center gap-1">
            <CalendarDays className="size-3.5" />
            {new Date(`${task.dueDate}T00:00:00`).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        ) : null}
        {task.estimatedMinutes ? (
          <span className="flex items-center gap-1">
            <Clock3 className="size-3.5" />
            {Math.round(task.estimatedMinutes / 60)}h
          </span>
        ) : null}
        {task.checklist.length ? (
          <span className="flex items-center gap-1">
            <CheckSquare2 className="size-3.5" />
            {task.checklist.filter((item) => item.completed).length}/{task.checklist.length}
          </span>
        ) : null}
        <span className="ml-auto flex items-center">
          <UserRound className="size-3.5" />
          {task.assigneeIds.length || ''}
        </span>
        <button
          type="button"
          onClick={() => onDiscuss(task)}
          className="text-brand-700 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-950/40 flex items-center gap-1 rounded-md px-1.5 py-1 font-medium transition"
          aria-label={`Open discussion for ${task.title}`}
        >
          <MessageSquareText className="size-3.5" /> Discuss
        </button>
      </div>
    </article>
  );
}
