import { apiClient } from '../../lib/api-client';

import type {
  CreateInvoiceInput,
  CreateTicketInput,
  DocumentDto,
  InvoiceDto,
  NotificationDto,
  PaginationMeta,
  ProjectMessageDto,
  TicketDto,
  TicketMessageDto,
  TicketMessageInput,
  UpdateInvoiceStatusInput,
  UpdateTicketInput,
} from '@nexops/shared';

interface Envelope<T, TMeta = Record<string, unknown>> {
  success: true;
  data: T;
  meta: TMeta;
}

export interface NotificationMeta extends PaginationMeta {
  unread: number;
}

export async function listTickets(search = '') {
  const response = await apiClient.get<Envelope<TicketDto[], PaginationMeta>>('/tickets', {
    params: { search, limit: 50, sortBy: 'updatedAt', sortOrder: 'desc' },
  });
  return { items: response.data.data, meta: response.data.meta };
}

export async function getTicket(id: string): Promise<TicketDto> {
  return (await apiClient.get<Envelope<TicketDto>>(`/tickets/${id}`)).data.data;
}

export async function createTicket(input: CreateTicketInput): Promise<TicketDto> {
  return (await apiClient.post<Envelope<TicketDto>>('/tickets', input)).data.data;
}

export async function updateTicket(id: string, input: UpdateTicketInput): Promise<TicketDto> {
  return (await apiClient.patch<Envelope<TicketDto>>(`/tickets/${id}`, input)).data.data;
}

export async function listTicketMessages(id: string): Promise<TicketMessageDto[]> {
  return (await apiClient.get<Envelope<TicketMessageDto[]>>(`/tickets/${id}/messages`)).data.data;
}

export async function addTicketMessage(
  id: string,
  input: TicketMessageInput,
): Promise<TicketMessageDto> {
  return (await apiClient.post<Envelope<TicketMessageDto>>(`/tickets/${id}/messages`, input)).data
    .data;
}

export async function listInvoices(search = '') {
  const response = await apiClient.get<Envelope<InvoiceDto[], PaginationMeta>>('/invoices', {
    params: { search, limit: 50, sortBy: 'issueDate', sortOrder: 'desc' },
  });
  return { items: response.data.data, meta: response.data.meta };
}

export async function getInvoice(id: string): Promise<InvoiceDto> {
  return (await apiClient.get<Envelope<InvoiceDto>>(`/invoices/${id}`)).data.data;
}

export async function createInvoice(input: CreateInvoiceInput): Promise<InvoiceDto> {
  return (await apiClient.post<Envelope<InvoiceDto>>('/invoices', input)).data.data;
}

export async function updateInvoiceStatus(
  id: string,
  input: UpdateInvoiceStatusInput,
): Promise<InvoiceDto> {
  return (await apiClient.patch<Envelope<InvoiceDto>>(`/invoices/${id}/status`, input)).data.data;
}

export async function listDocuments(projectId: string) {
  const response = await apiClient.get<Envelope<DocumentDto[], PaginationMeta>>('/documents', {
    params: { projectId, limit: 50 },
  });
  return { items: response.data.data, meta: response.data.meta };
}

export async function uploadDocument(
  projectId: string,
  category: string,
  file: File,
): Promise<DocumentDto> {
  const form = new FormData();
  form.set('projectId', projectId);
  form.set('category', category);
  form.set('file', file);
  return (await apiClient.post<Envelope<DocumentDto>>('/documents', form)).data.data;
}

export async function downloadDocument(document: DocumentDto): Promise<void> {
  const response = await apiClient.get<Blob>(`/documents/${document.id}/download`, {
    responseType: 'blob',
  });
  const url = URL.createObjectURL(response.data);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = document.name;
  link.click();
  URL.revokeObjectURL(url);
}

export async function deleteDocument(id: string): Promise<void> {
  await apiClient.delete(`/documents/${id}`);
}

export async function listNotifications() {
  const response = await apiClient.get<Envelope<NotificationDto[], NotificationMeta>>(
    '/notifications',
    { params: { limit: 50 } },
  );
  return { items: response.data.data, meta: response.data.meta };
}

export async function listProjectMessages(projectId: string) {
  const response = await apiClient.get<Envelope<ProjectMessageDto[], PaginationMeta>>(
    `/projects/${projectId}/messages`,
    { params: { limit: 50 } },
  );
  return { items: response.data.data, meta: response.data.meta };
}

export async function markNotificationRead(id: string): Promise<NotificationDto> {
  return (await apiClient.patch<Envelope<NotificationDto>>(`/notifications/${id}/read`)).data.data;
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.patch('/notifications/read-all');
}
