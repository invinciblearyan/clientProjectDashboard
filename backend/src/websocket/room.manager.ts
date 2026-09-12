import { projectRepository } from '../repositories/project.repository';
import type { SocketUser } from './types';

export const roomManager = {
  async authorizeProjectJoin(user: SocketUser, projectId: string): Promise<boolean> {
    if (user.role === 'DEVELOPER') {
      return false;
    }

    if (user.role === 'ADMIN') {
      const project = await projectRepository.findById(projectId);
      return project !== null;
    }

    if (user.role === 'PROJECT_MANAGER') {
      const project = await projectRepository.findByIdForPm(projectId, user.id);
      return project !== null;
    }

    return false;
  },
};
