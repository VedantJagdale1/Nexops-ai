import { z } from 'zod';

import { priorities } from './delivery.js';
import { objectIdSchema, paginationQuerySchema } from './schemas.js';

export const ticketStatuses = [
  'open',
  'assigned',
  'in_progress',
  'waiting_for_client',
  'resolved',
  'closed',
] as const;
export const ticketCategories = [
  'bug',
  'feature_request',
  'question',
  'access',
  'billing',
  'other',
] as const;
export const invoiceStatuses = ['draft', 'sent', 'paid', 'overdue', 'cancelled'] as const;

export const createTicketSchema = z.object({
  clientId: objectIdSchema.optional(),
  projectId: objectIdSchema.optional().nullable(),
  subject: z.string().trim().min(3).max(300),
  description: z.string().trim().min(3).max(20_000),
  category: z.enum(ticketCategories).default('other'),
  priority: z.enum(priorities).default('medium'),
});
export const updateTicketSchema = z
  .object({
    assignedTo: objectIdSchema.optional().nullable(),
    status: z.enum(ticketStatuses).optional(),
    priority: z.enum(priorities).optional(),
    category: z.enum(ticketCategories).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');
export const ticketMessageInputSchema = z.object({
  content: z.string().trim().min(1).max(20_000),
  internal: z.boolean().default(false),
});
export const ticketListQuerySchema = paginationQuerySchema.extend({
  status: z.enum(ticketStatuses).optional(),
  priority: z.enum(priorities).optional(),
  clientId: objectIdSchema.optional(),
  sortBy: z
    .enum(['createdAt', 'updatedAt', 'priority', 'status', 'slaDeadline'])
    .default('updatedAt'),
});

const invoiceLineItemInputSchema = z.object({
  description: z.string().trim().min(1).max(500),
  quantityMilli: z.number().int().min(1).max(1_000_000_000),
  unitAmountMinor: z.number().int().min(0).max(1_000_000_000),
});
export const createInvoiceSchema = z
  .object({
    clientId: objectIdSchema,
    projectId: objectIdSchema.optional().nullable(),
    issueDate: z.string().date(),
    dueDate: z.string().date(),
    currency: z
      .string()
      .trim()
      .length(3)
      .transform((value) => value.toUpperCase()),
    lineItems: z.array(invoiceLineItemInputSchema).min(1).max(100),
    taxMinor: z.number().int().min(0).default(0),
    discountMinor: z.number().int().min(0).default(0),
    notes: z.string().trim().max(5_000).optional(),
  })
  .refine((value) => value.dueDate >= value.issueDate, {
    message: 'Due date must be on or after issue date',
    path: ['dueDate'],
  });
export const updateInvoiceStatusSchema = z.object({
  status: z.enum(invoiceStatuses),
  paymentDate: z.string().date().optional().nullable(),
});
export const invoiceListQuerySchema = paginationQuerySchema.extend({
  status: z.enum(invoiceStatuses).optional(),
  clientId: objectIdSchema.optional(),
  sortBy: z
    .enum(['issueDate', 'dueDate', 'invoiceNumber', 'totalMinor', 'status'])
    .default('issueDate'),
});

export const documentListQuerySchema = paginationQuerySchema.extend({
  projectId: objectIdSchema.optional(),
  clientId: objectIdSchema.optional(),
  category: z.string().trim().min(1).max(80).optional(),
});
export const documentMetadataSchema = z
  .object({
    projectId: objectIdSchema.optional(),
    clientId: objectIdSchema.optional(),
    category: z.string().trim().min(1).max(80).default('general'),
  })
  .refine((value) => value.projectId || value.clientId, {
    message: 'A project or client is required',
  });

export type CreateTicketInput = z.input<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type TicketMessageInput = z.input<typeof ticketMessageInputSchema>;
export type CreateInvoiceInput = z.input<typeof createInvoiceSchema>;
export type UpdateInvoiceStatusInput = z.infer<typeof updateInvoiceStatusSchema>;
export type DocumentMetadataInput = z.input<typeof documentMetadataSchema>;

export interface TicketDto {
  id: string;
  clientId: string;
  projectId?: string;
  createdBy: string;
  assignedTo?: string;
  subject: string;
  description: string;
  category: (typeof ticketCategories)[number];
  priority: (typeof priorities)[number];
  status: (typeof ticketStatuses)[number];
  slaDeadline?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}
export interface TicketMessageDto {
  id: string;
  ticketId: string;
  senderId: string;
  content: string;
  internal: boolean;
  createdAt: string;
}
export interface InvoiceLineItemDto {
  id: string;
  description: string;
  quantityMilli: number;
  unitAmountMinor: number;
  totalMinor: number;
}
export interface InvoiceDto {
  id: string;
  clientId: string;
  projectId?: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  lineItems: InvoiceLineItemDto[];
  subtotalMinor: number;
  taxMinor: number;
  discountMinor: number;
  totalMinor: number;
  status: (typeof invoiceStatuses)[number];
  notes?: string;
  paymentDate?: string;
  createdAt: string;
  updatedAt: string;
}
export interface DocumentDto {
  id: string;
  projectId?: string;
  clientId?: string;
  taskId?: string;
  ticketId?: string;
  uploadedBy: string;
  name: string;
  mimeType: string;
  size: number;
  category: string;
  createdAt: string;
}
export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}
