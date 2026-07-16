import { apiClient } from '../../lib/api-client';

import type {
  ClientDto,
  ClientInput,
  DashboardDto,
  PaginationMeta,
  ProjectDto,
  ProjectInput,
  TaskCommentDto,
  TaskCommentInput,
  TaskDto,
  TaskInput,
  TeamMemberDto,
} from '@nexops/shared';

interface Envelope<T, TMeta = Record<string, unknown>> {
  success: true;
  data: T;
  meta: TMeta;
}

export async function getDashboard(): Promise<DashboardDto> {
  return (await apiClient.get<Envelope<DashboardDto>>('/analytics/dashboard')).data.data;
}

export async function listClients(
  search = '',
): Promise<{ items: ClientDto[]; meta: PaginationMeta }> {
  const response = await apiClient.get<Envelope<ClientDto[], PaginationMeta>>('/clients', {
    params: { search, limit: 50, sortBy: 'companyName', sortOrder: 'asc' },
  });
  return { items: response.data.data, meta: response.data.meta };
}

export async function getClient(id: string): Promise<ClientDto> {
  return (await apiClient.get<Envelope<ClientDto>>(`/clients/${id}`)).data.data;
}
export async function createClient(input: ClientInput): Promise<ClientDto> {
  return (await apiClient.post<Envelope<ClientDto>>('/clients', input)).data.data;
}

export async function listProjects(
  search = '',
): Promise<{ items: ProjectDto[]; meta: PaginationMeta }> {
  const response = await apiClient.get<Envelope<ProjectDto[], PaginationMeta>>('/projects', {
    params: { search, limit: 50, sortBy: 'updatedAt', sortOrder: 'desc' },
  });
  return { items: response.data.data, meta: response.data.meta };
}
export async function getProject(id: string): Promise<ProjectDto> {
  return (await apiClient.get<Envelope<ProjectDto>>(`/projects/${id}`)).data.data;
}
export async function createProject(input: ProjectInput): Promise<ProjectDto> {
  return (await apiClient.post<Envelope<ProjectDto>>('/projects', input)).data.data;
}

export async function listTasks(projectId: string): Promise<TaskDto[]> {
  return (await apiClient.get<Envelope<TaskDto[]>>('/tasks', { params: { projectId } })).data.data;
}
export async function createTask(input: TaskInput): Promise<TaskDto> {
  return (await apiClient.post<Envelope<TaskDto>>('/tasks', input)).data.data;
}
export async function moveTask(
  id: string,
  status: TaskDto['status'],
  position: number,
  expectedUpdatedAt: string,
): Promise<TaskDto> {
  return (
    await apiClient.patch<Envelope<TaskDto>>(`/tasks/${id}/move`, {
      status,
      position,
      expectedUpdatedAt,
    })
  ).data.data;
}

export async function listTaskComments(taskId: string): Promise<TaskCommentDto[]> {
  return (
    await apiClient.get<Envelope<TaskCommentDto[]>>(`/tasks/${taskId}/comments`, {
      params: { page: 1, limit: 100 },
    })
  ).data.data;
}

export async function createTaskComment(
  taskId: string,
  input: TaskCommentInput,
): Promise<TaskCommentDto> {
  return (await apiClient.post<Envelope<TaskCommentDto>>(`/tasks/${taskId}/comments`, input)).data
    .data;
}

export async function listTeam(): Promise<TeamMemberDto[]> {
  return (
    await apiClient.get<Envelope<TeamMemberDto[]>>('/users', {
      params: { limit: 100, sortBy: 'name', sortOrder: 'asc' },
    })
  ).data.data;
}
