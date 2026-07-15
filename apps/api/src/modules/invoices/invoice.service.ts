import { AppError } from '../../common/errors/app-error.js';

import type { Invoice } from './invoice.model.js';
import type { InvoiceListOptions, InvoiceRepository } from './invoice.repository.js';
import type { ClientRepository } from '../clients/client.repository.js';
import type { NotificationService } from '../notifications/notification.service.js';
import type { ProjectRepository } from '../projects/project.repository.js';
import type {
  AuthenticatedUserDto,
  CreateInvoiceInput,
  InvoiceDto,
  PaginationMeta,
  UpdateInvoiceStatusInput,
} from '@nexops/shared';
import type { HydratedDocument, Types } from 'mongoose';

const validTransitions: Record<Invoice['status'], readonly Invoice['status'][]> = {
  draft: ['sent', 'cancelled'],
  sent: ['paid', 'overdue', 'cancelled'],
  paid: [],
  overdue: ['paid', 'cancelled'],
  cancelled: [],
};

function safeMinor(value: bigint): number {
  if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new AppError({
      code: 'INVOICE_AMOUNT_INVALID',
      message: 'Invoice amount is outside the supported range',
      statusCode: 422,
    });
  }
  return Number(value);
}

export function calculateInvoiceAmounts(
  lineItems: CreateInvoiceInput['lineItems'],
  taxMinor: number,
  discountMinor: number,
) {
  const calculatedItems = lineItems.map((item) => ({
    ...item,
    totalMinor: safeMinor(
      (BigInt(item.quantityMilli) * BigInt(item.unitAmountMinor) + 500n) / 1_000n,
    ),
  }));
  const subtotal = calculatedItems.reduce((total, item) => total + BigInt(item.totalMinor), 0n);
  const total = subtotal + BigInt(taxMinor) - BigInt(discountMinor);
  if (total < 0n) {
    throw new AppError({
      code: 'INVOICE_DISCOUNT_INVALID',
      message: 'Discount cannot exceed the invoice subtotal and tax',
      statusCode: 422,
    });
  }
  return {
    lineItems: calculatedItems,
    subtotalMinor: safeMinor(subtotal),
    totalMinor: safeMinor(total),
  };
}

function toDto(invoice: HydratedDocument<Invoice>): InvoiceDto {
  return {
    id: invoice._id.toString(),
    clientId: invoice.clientId.toString(),
    ...(invoice.projectId ? { projectId: invoice.projectId.toString() } : {}),
    invoiceNumber: invoice.invoiceNumber,
    issueDate: invoice.issueDate.toISOString().slice(0, 10),
    dueDate: invoice.dueDate.toISOString().slice(0, 10),
    currency: invoice.currency,
    lineItems: invoice.lineItems.map((item) => ({
      id: item._id.toString(),
      description: item.description,
      quantityMilli: item.quantityMilli,
      unitAmountMinor: item.unitAmountMinor,
      totalMinor: item.totalMinor,
    })),
    subtotalMinor: invoice.subtotalMinor,
    taxMinor: invoice.taxMinor,
    discountMinor: invoice.discountMinor,
    totalMinor: invoice.totalMinor,
    status: invoice.status,
    ...(invoice.notes ? { notes: invoice.notes } : {}),
    ...(invoice.paymentDate ? { paymentDate: invoice.paymentDate.toISOString().slice(0, 10) } : {}),
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
  };
}

export class InvoiceService {
  public constructor(
    private readonly repository: InvoiceRepository,
    private readonly clients: ClientRepository,
    private readonly projects: ProjectRepository,
    private readonly notifications: NotificationService,
  ) {}

  public async list(
    user: AuthenticatedUserDto,
    options: InvoiceListOptions,
  ): Promise<{ items: InvoiceDto[]; meta: PaginationMeta }> {
    const result = await this.repository.list(user.organisationId, {
      ...options,
      ...(user.role === 'client' && user.clientId ? { clientId: user.clientId } : {}),
    });
    return {
      items: result.items.map(toDto),
      meta: {
        page: options.page,
        limit: options.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / options.limit),
      },
    };
  }

  public async get(user: AuthenticatedUserDto, id: string): Promise<InvoiceDto> {
    return toDto(await this.requireAccess(user, id));
  }

  public async create(user: AuthenticatedUserDto, input: CreateInvoiceInput): Promise<InvoiceDto> {
    if (!(await this.clients.findById(user.organisationId, input.clientId))) {
      throw new AppError({
        code: 'CLIENT_NOT_FOUND',
        message: 'Client not found',
        statusCode: 404,
      });
    }
    if (input.projectId) {
      const project = await this.projects.findById(user.organisationId, input.projectId);
      if (!project || project.clientId.toString() !== input.clientId) {
        throw new AppError({
          code: 'PROJECT_NOT_FOUND',
          message: 'Project not found for this client',
          statusCode: 404,
        });
      }
    }
    const taxMinor = input.taxMinor ?? 0;
    const discountMinor = input.discountMinor ?? 0;
    const amounts = calculateInvoiceAmounts(input.lineItems, taxMinor, discountMinor);
    const issueDate = new Date(`${input.issueDate}T00:00:00.000Z`);
    const invoiceNumber = await this.repository.nextNumber(
      user.organisationId,
      issueDate.getUTCFullYear(),
    );
    const invoice = await this.repository.create({
      organisationId: user.organisationId as unknown as Types.ObjectId,
      clientId: input.clientId as unknown as Types.ObjectId,
      ...(input.projectId ? { projectId: input.projectId as unknown as Types.ObjectId } : {}),
      invoiceNumber,
      issueDate,
      dueDate: new Date(`${input.dueDate}T00:00:00.000Z`),
      currency: input.currency,
      lineItems: amounts.lineItems as unknown as Invoice['lineItems'],
      subtotalMinor: amounts.subtotalMinor,
      taxMinor,
      discountMinor,
      totalMinor: amounts.totalMinor,
      status: 'draft',
      ...(input.notes ? { notes: input.notes } : {}),
    });
    return toDto(invoice);
  }

  public async updateStatus(
    user: AuthenticatedUserDto,
    id: string,
    input: UpdateInvoiceStatusInput,
  ): Promise<InvoiceDto> {
    const current = await this.requireAccess(user, id);
    if (
      input.status !== current.status &&
      !validTransitions[current.status].includes(input.status)
    ) {
      throw new AppError({
        code: 'INVOICE_STATUS_TRANSITION_INVALID',
        message: `Invoice cannot move from ${current.status} to ${input.status}`,
        statusCode: 409,
      });
    }
    const updated = await this.repository.update(user.organisationId, id, {
      status: input.status,
      ...(input.status === 'paid'
        ? {
            paymentDate: input.paymentDate
              ? new Date(`${input.paymentDate}T00:00:00.000Z`)
              : new Date(),
          }
        : {}),
    });
    if (!updated) throw this.notFound();
    if (input.status === 'sent' && current.status !== 'sent') {
      const recipients = await this.repository.clientUserIds(
        user.organisationId,
        updated.clientId.toString(),
      );
      await Promise.all(
        recipients.map((userId) =>
          this.notifications.create({
            organisationId: user.organisationId,
            userId,
            type: 'invoice_issued',
            title: 'New invoice issued',
            message: updated.invoiceNumber,
            entityType: 'invoice',
            entityId: updated._id.toString(),
          }),
        ),
      );
    }
    return toDto(updated);
  }

  private async requireAccess(
    user: AuthenticatedUserDto,
    id: string,
  ): Promise<HydratedDocument<Invoice>> {
    const invoice = await this.repository.findById(user.organisationId, id);
    if (!invoice || (user.role === 'client' && user.clientId !== invoice.clientId.toString())) {
      throw this.notFound();
    }
    return invoice;
  }

  private notFound(): AppError {
    return new AppError({
      code: 'INVOICE_NOT_FOUND',
      message: 'Invoice not found',
      statusCode: 404,
    });
  }
}
