import type { TaskCommentDto, TaskDto } from '@nexops/shared';

export function optimisticallyMoveTask(
  tasks: TaskDto[],
  taskId: string,
  status: TaskDto['status'],
  targetPosition: number,
): TaskDto[] {
  const moving = tasks.find((task) => task.id === taskId);
  if (!moving) return tasks;
  const remaining = tasks.filter((task) => task.id !== taskId);
  const target = remaining
    .filter((task) => task.status === status)
    .sort((first, second) => first.position - second.position);
  target.splice(Math.min(targetPosition, target.length), 0, { ...moving, status });
  const positions = new Map(target.map((task, position) => [task.id, position]));
  const inserted = target.find((task) => task.id === taskId);
  return remaining
    .concat(inserted ? [inserted] : [])
    .map((task) =>
      positions.has(task.id)
        ? { ...task, status, position: positions.get(task.id) ?? task.position }
        : task,
    );
}

export function reconcileRealtimeTask(tasks: TaskDto[], incoming: TaskDto): TaskDto[] {
  const previous = tasks.find((task) => task.id === incoming.id);
  const remaining = tasks.filter((task) => task.id !== incoming.id);
  const affectedStatuses = new Set<TaskDto['status']>([incoming.status]);
  if (previous) affectedStatuses.add(previous.status);

  const unaffected = remaining.filter((task) => !affectedStatuses.has(task.status));
  const reconciled: TaskDto[] = [];
  for (const status of affectedStatuses) {
    const peers = remaining
      .filter((task) => task.status === status)
      .sort((first, second) => first.position - second.position);
    if (status === incoming.status) {
      peers.splice(Math.min(incoming.position, peers.length), 0, incoming);
    }
    reconciled.push(...peers.map((task, position) => ({ ...task, position })));
  }
  return [...unaffected, ...reconciled];
}

export function mergeTaskComment(
  comments: TaskCommentDto[] | undefined,
  incoming: TaskCommentDto,
): TaskCommentDto[] {
  const current = comments ?? [];
  if (current.some((comment) => comment.id === incoming.id)) return current;
  return [...current, incoming].sort(
    (first, second) => Date.parse(first.createdAt) - Date.parse(second.createdAt),
  );
}
