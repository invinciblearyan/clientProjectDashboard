import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { AdminClientsPage } from '../pages/AdminClientsPage';
import { AdminHomePage } from '../pages/AdminHomePage';
import { AdminUsersPage } from '../pages/AdminUsersPage';
import { ActivityPage } from '../pages/ActivityPage';
import { CreateProjectPage } from '../pages/CreateProjectPage';
import { CreateTaskPage } from '../pages/CreateTaskPage';
import { DeveloperHomePage } from '../pages/DeveloperHomePage';
import { LoginPage } from '../pages/LoginPage';
import { ManagerHomePage } from '../pages/ManagerHomePage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ProjectDetailPage } from '../pages/ProjectDetailPage';
import { ProjectsPage } from '../pages/ProjectsPage';
import { TaskDetailPage } from '../pages/TaskDetailPage';
import { UnauthorizedPage } from '../pages/UnauthorizedPage';
import '../pages/pages.css';
import '../pages/projects.css';
import { ProtectedRoute, RoleHomeRedirect } from './ProtectedRoute';

export function AppRoutes() {
  return (
    <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/admin" element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
              <Route index element={<AdminHomePage />} />
              <Route path="activity" element={<ActivityPage />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="clients" element={<AdminClientsPage />} />
              <Route path="projects/new" element={<CreateProjectPage />} />
              <Route path="projects/:projectId" element={<ProjectDetailPage />} />
              <Route path="projects/:projectId/tasks/new" element={<CreateTaskPage />} />
              <Route path="projects/:projectId/tasks/:taskId" element={<TaskDetailPage />} />
            </Route>
            <Route
              path="/manager"
              element={<ProtectedRoute allowedRoles={['PROJECT_MANAGER']} />}
            >
              <Route index element={<ManagerHomePage />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="projects/new" element={<CreateProjectPage />} />
              <Route path="projects/:projectId" element={<ProjectDetailPage />} />
              <Route path="projects/:projectId/tasks/new" element={<CreateTaskPage />} />
              <Route path="projects/:projectId/tasks/:taskId" element={<TaskDetailPage />} />
            </Route>
            <Route path="/developer" element={<ProtectedRoute allowedRoles={['DEVELOPER']} />}>
              <Route index element={<DeveloperHomePage />} />
              <Route path="tasks/:taskId" element={<TaskDetailPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="/" element={<RoleHomeRedirect />} />
        <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
