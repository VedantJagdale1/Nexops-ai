import { Types } from '../../common/mongoose.js';
import { buildTenantFilter } from '../../common/repositories/tenant-repository.js';
import { InvoiceModel } from '../invoices/invoice.model.js';
import { ProjectModel } from '../projects/project.model.js';
import { TaskModel } from '../tasks/task.model.js';
import { TicketModel } from '../tickets/ticket.model.js';
import { UserModel } from '../users/user.model.js';

import type { AuthenticatedUserDto, DashboardDto } from '@nexops/shared';
import type { Types as MongooseTypes } from 'mongoose';

interface CountGroup {
  _id: string;
  count: number;
}
interface RevenueGroup {
  _id: string;
  amountMinor: number;
}
interface WorkloadGroup {
  _id: MongooseTypes.ObjectId;
  openTasks: number;
}

export class AnalyticsService {
  public async dashboard(user: AuthenticatedUserDto): Promise<DashboardDto> {
    const organisationId = new Types.ObjectId(user.organisationId);
    const projectAccess =
      user.role === 'client' && user.clientId
        ? { clientId: new Types.ObjectId(user.clientId) }
        : user.role === 'project_manager' || user.role === 'developer'
          ? {
              $or: [
                { projectManagerId: new Types.ObjectId(user.id) },
                { memberIds: new Types.ObjectId(user.id) },
              ],
            }
          : {};
    const hasRestrictedProjects = ['client', 'project_manager', 'developer'].includes(user.role);
    const accessibleProjects = hasRestrictedProjects
      ? await ProjectModel.find(buildTenantFilter(organisationId, projectAccess)).distinct('_id')
      : [];
    const taskAccess = hasRestrictedProjects ? { projectId: { $in: accessibleProjects } } : {};
    const clientAccess =
      user.role === 'client' && user.clientId
        ? { clientId: new Types.ObjectId(user.clientId) }
        : {};
    const startOfMonth = new Date(
      Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1),
    );
    const sixMonthsAgo = new Date(
      Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - 5, 1),
    );
    const [
      activeProjects,
      overdueTasks,
      openTickets,
      pendingInvoices,
      projectsByStatus,
      tasksByStatus,
      revenueTrend,
      teamWorkload,
      teamSize,
    ] = await Promise.all([
      ProjectModel.countDocuments(
        buildTenantFilter(organisationId, { ...projectAccess, status: 'active' }),
      ),
      TaskModel.countDocuments(
        buildTenantFilter(organisationId, {
          ...taskAccess,
          status: { $ne: 'completed' },
          dueDate: { $lt: new Date() },
        }),
      ),
      TicketModel.countDocuments(
        buildTenantFilter(organisationId, {
          ...clientAccess,
          status: { $nin: ['resolved', 'closed'] },
        }),
      ),
      InvoiceModel.countDocuments(
        buildTenantFilter(organisationId, {
          ...clientAccess,
          status: { $in: ['sent', 'overdue'] },
        }),
      ),
      ProjectModel.aggregate<CountGroup>([
        { $match: buildTenantFilter(organisationId, projectAccess) },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      TaskModel.aggregate<CountGroup>([
        { $match: buildTenantFilter(organisationId, taskAccess) },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      InvoiceModel.aggregate<RevenueGroup>([
        {
          $match: buildTenantFilter(organisationId, {
            ...clientAccess,
            status: 'paid',
            paymentDate: { $gte: sixMonthsAgo },
          }),
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$paymentDate' } },
            amountMinor: { $sum: '$totalMinor' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      TaskModel.aggregate<WorkloadGroup>([
        {
          $match: buildTenantFilter(organisationId, {
            ...taskAccess,
            status: { $ne: 'completed' },
          }),
        },
        { $unwind: '$assigneeIds' },
        { $group: { _id: '$assigneeIds', openTasks: { $sum: 1 } } },
        { $sort: { openTasks: -1 } },
        { $limit: 8 },
      ]),
      UserModel.countDocuments(
        buildTenantFilter(organisationId, {
          status: 'active',
          role: { $in: ['project_manager', 'developer'] },
        }),
      ),
    ]);
    const userIds = teamWorkload.map((entry) => entry._id);
    const names = new Map(
      userIds.length === 0
        ? []
        : (
            await UserModel.find(buildTenantFilter(organisationId, { _id: { $in: userIds } }))
              .select('name')
              .lean()
              .exec()
          ).map((member) => [member._id.toString(), member.name]),
    );
    const monthlyRevenue = await InvoiceModel.aggregate<{ total: number }>([
      {
        $match: buildTenantFilter(organisationId, {
          ...clientAccess,
          status: 'paid',
          paymentDate: { $gte: startOfMonth },
        }),
      },
      { $group: { _id: null, total: { $sum: '$totalMinor' } } },
    ]);
    const assignedOpenTasks = teamWorkload.reduce((total, member) => total + member.openTasks, 0);
    return {
      stats: {
        activeProjects,
        overdueTasks,
        openTickets,
        pendingInvoices,
        monthlyRevenueMinor: monthlyRevenue[0]?.total ?? 0,
        teamUtilisation:
          teamSize === 0
            ? 0
            : Math.min(100, Math.round((assignedOpenTasks / (teamSize * 8)) * 100)),
      },
      projectsByStatus: projectsByStatus.map((item) => ({ status: item._id, count: item.count })),
      tasksByStatus: tasksByStatus.map((item) => ({ status: item._id, count: item.count })),
      revenueTrend: revenueTrend.map((item) => ({
        month: item._id,
        amountMinor: item.amountMinor,
      })),
      teamWorkload: teamWorkload.map((item) => ({
        userId: item._id.toString(),
        name: names.get(item._id.toString()) ?? 'Team member',
        openTasks: item.openTasks,
      })),
    };
  }
}
