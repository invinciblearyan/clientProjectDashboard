import { dashboardRepository } from '../repositories/dashboard.repository';
import { authorizationService } from './authorization.service';
import { getActiveUsersOnline } from './presence.service';
import { getCurrentWeekRange } from '../utils/week-range';
import type { AuthUser } from '../types/auth';

export const dashboardService = {
  async getDashboard(actor: AuthUser) {
    authorizationService.assertAdminOrPmOrDeveloper(actor);

    if (actor.role === 'ADMIN') {
      const [totalProjects, tasksByStatus, overdueTaskCount] = await Promise.all([
        dashboardRepository.countAllProjects(),
        dashboardRepository.getAdminTasksByStatus(),
        dashboardRepository.countOverdueTasks(),
      ]);

      return {
        totalProjects,
        tasksByStatus,
        overdueTaskCount,
        activeUsersOnline: getActiveUsersOnline(),
      };
    }

    if (actor.role === 'PROJECT_MANAGER') {
      const { start, end } = getCurrentWeekRange();
      const [projectCount, tasksByPriority, upcomingTasks] = await Promise.all([
        dashboardRepository.countPmProjects(actor.id),
        dashboardRepository.getPmTasksByPriority(actor.id),
        dashboardRepository.findPmUpcomingDueThisWeek(actor.id, start, end),
      ]);

      return {
        projectCount,
        tasksByPriority,
        upcomingDueThisWeek: upcomingTasks.map((task) => ({
          id: task.id,
          title: task.title,
          priority: task.priority,
          status: task.status,
          dueDate: task.dueDate,
          project: {
            id: task.project.id,
            name: task.project.name,
          },
        })),
      };
    }

    const assignedTasks = await dashboardRepository.findDeveloperAssignedTasks(actor.id);

    return {
      assignedTasks: assignedTasks.map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate,
        isOverdue: task.isOverdue,
        project: {
          id: task.project.id,
          name: task.project.name,
        },
      })),
    };
  },
};
