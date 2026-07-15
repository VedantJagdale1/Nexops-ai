import { z } from 'zod';

import { objectIdSchema, paginationQuerySchema } from './schemas.js';

export const clientStatuses = ['active', 'inactive', 'prospect'] as const;
export const projectStatuses = ['planning', 'active', 'on_hold', 'completed', 'cancelled'] as const;
export const priorities = ['low', 'medium', 'high', 'critical'] as const;
export const taskStatuses = ['backlog', 'todo', 'in_progress', 'in_review', 'completed'] as const;

const optionalText = (maximum: number) => z.string().trim().max(maximum).optional();

export const clientInputSchema = z.object({
  companyName: z.string().trim().min(2).max(160),
  contactName: z.string().trim().min(2).max(100),
  contactEmail: z.string().trim().toLowerCase().email().max(254),
  contactPhone: optionalText(40),
  industry: optionalText(100),
  address: optionalText(500),
  status: z.enum(clientStatuses).default('active'),
  notes: optionalText(5_000),
});

export const updateClientSchema = clientInputSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export const clientListQuerySchema = paginationQuerySchema.extend({
  status: z.enum(clientStatuses).optional(),
  sortBy: z.enum(['companyName', 'status', 'createdAt', 'updatedAt']).default('updatedAt'),
});

const dateStringSchema = z.string().date();
const projectBaseSchema = z.object({
  clientId: objectIdSchema,
  name: z.string().trim().min(2).max(160),
  key: z
    .string()
    .trim()
    .min(2)
    .max(12)
    .regex(/^[A-Za-z][A-Za-z0-9-]*$/)
    .transform((value) => value.toUpperCase()),
  description: optionalText(10_000),
  status: z.enum(projectStatuses).default('planning'),
  priority: z.enum(priorities).default('medium'),
  projectManagerId: objectIdSchema.optional().nullable(),
  memberIds: z.array(objectIdSchema).max(100).default([]),
  startDate: dateStringSchema.optional().nullable(),
  dueDate: dateStringSchema.optional().nullable(),
  estimatedBudgetMinor: z.number().int().min(0).optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
});

export const projectInputSchema = projectBaseSchema.refine(
  (value) => !value.startDate || !value.dueDate || value.dueDate >= value.startDate,
  { message: 'Due date must be on or after the start date', path: ['dueDate'] },
);

export const updateProjectSchema = projectBaseSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export const projectListQuerySchema = paginationQuerySchema.extend({
  clientId: objectIdSchema.optional(),
  status: z.enum(projectStatuses).optional(),
  priority: z.enum(priorities).optional(),
  sortBy: z
    .enum(['name', 'key', 'status', 'priority', 'dueDate', 'updatedAt'])
    .default('updatedAt'),
});

const checklistItemInputSchema = z.object({
  text: z.string().trim().min(1).max(500),
  completed: z.boolean().default(false),
});

export const taskInputSchema = z.object({
  projectId: objectIdSchema,
  title: z.string().trim().min(2).max(300),
  description: optionalText(20_000),
  status: z.enum(taskStatuses).default('backlog'),
  priority: z.enum(priorities).default('medium'),
  assigneeIds: z.array(objectIdSchema).max(20).default([]),
  dueDate: dateStringSchema.optional().nullable(),
  estimatedMinutes: z.number().int().min(0).max(1_000_000).optional().nullable(),
  labels: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  checklist: z.array(checklistItemInputSchema).max(100).default([]),
});

export const updateTaskSchema = taskInputSchema
  .omit({ projectId: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export const moveTaskSchema = z.object({
  status: z.enum(taskStatuses),
  position: z.number().int().min(0),
  expectedUpdatedAt: z.string().datetime(),
});

export const taskListQuerySchema = z.object({
  projectId: objectIdSchema,
  search: z.string().trim().max(120).optional(),
  status: z.enum(taskStatuses).optional(),
  assigneeId: objectIdSchema.optional(),
});

export type ClientInput = z.input<typeof clientInputSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type ProjectInput = z.input<typeof projectInputSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type TaskInput = z.input<typeof taskInputSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type MoveTaskInput = z.infer<typeof moveTaskSchema>;

export interface ClientDto {
  id: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  industry?: string;
  address?: string;
  status: (typeof clientStatuses)[number];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDto {
  id: string;
  clientId: string;
  name: string;
  key: string;
  description?: string;
  status: (typeof projectStatuses)[number];
  priority: (typeof priorities)[number];
  projectManagerId?: string;
  memberIds: string[];
  startDate?: string;
  dueDate?: string;
  estimatedBudgetMinor?: number;
  actualCostMinor: number;
  progress: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskChecklistItemDto {
  id: string;
  text: string;
  completed: boolean;
}

export interface TaskDto {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: (typeof taskStatuses)[number];
  priority: (typeof priorities)[number];
  assigneeIds: string[];
  reporterId: string;
  dueDate?: string;
  estimatedMinutes?: number;
  loggedMinutes: number;
  labels: string[];
  checklist: TaskChecklistItemDto[];
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMemberDto {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: 'owner' | 'admin' | 'project_manager' | 'developer' | 'client';
  status: 'invited' | 'active' | 'suspended' | 'disabled';
}

export interface DashboardDto {
  stats: {
    activeProjects: number;
    overdueTasks: number;
    openTickets: number;
    pendingInvoices: number;
    monthlyRevenueMinor: number;
    teamUtilisation: number;
  };
  projectsByStatus: Array<{ status: string; count: number }>;
  tasksByStatus: Array<{ status: string; count: number }>;
  revenueTrend: Array<{ month: string; amountMinor: number }>;
  teamWorkload: Array<{ userId: string; name: string; openTasks: number }>;
}
