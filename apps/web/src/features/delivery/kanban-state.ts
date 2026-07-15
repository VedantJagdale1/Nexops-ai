import type { TaskDto } from '@nexops/shared';

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
