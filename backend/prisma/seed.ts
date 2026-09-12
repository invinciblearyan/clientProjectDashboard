import {
  PrismaClient,
  UserRole,
  ProjectStatus,
  TaskStatus,
  TaskPriority,
  ActivityType,
  ActivitySource,
} from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 12;

const SEED_USERS = [
  { email: 'admin@example.com', password: 'Admin123!Dev', name: 'Admin User', role: UserRole.ADMIN },
  { email: 'pm1@example.com', password: 'PM123!Dev', name: 'PM One', role: UserRole.PROJECT_MANAGER },
  { email: 'pm2@example.com', password: 'PM456!Dev', name: 'PM Two', role: UserRole.PROJECT_MANAGER },
  { email: 'dev1@example.com', password: 'Dev123!Dev', name: 'Dev One', role: UserRole.DEVELOPER },
  { email: 'dev2@example.com', password: 'Dev456!Dev', name: 'Dev Two', role: UserRole.DEVELOPER },
  { email: 'dev3@example.com', password: 'Dev789!Dev', name: 'Dev Three', role: UserRole.DEVELOPER },
  { email: 'dev4@example.com', password: 'Dev012!Dev', name: 'Dev Four', role: UserRole.DEVELOPER },
] as const;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function clearDatabase(): Promise<void> {
  await prisma.refreshToken.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();
}

async function main(): Promise<void> {
  console.log('Clearing existing seed data...');
  await clearDatabase();

  console.log('Creating users with bcrypt-hashed passwords...');
  const users = await Promise.all(
    SEED_USERS.map(async (seedUser) =>
      prisma.user.create({
        data: {
          email: seedUser.email,
          passwordHash: await hashPassword(seedUser.password),
          name: seedUser.name,
          role: seedUser.role,
        },
      }),
    ),
  );

  const admin = users.find((u) => u.role === UserRole.ADMIN)!;
  const pm1 = users.find((u) => u.email === 'pm1@example.com')!;
  const pm2 = users.find((u) => u.email === 'pm2@example.com')!;
  const dev1 = users.find((u) => u.email === 'dev1@example.com')!;
  const dev2 = users.find((u) => u.email === 'dev2@example.com')!;
  const dev3 = users.find((u) => u.email === 'dev3@example.com')!;
  const dev4 = users.find((u) => u.email === 'dev4@example.com')!;

  const now = new Date();
  const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const daysFromNow = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  console.log('Creating clients...');
  const clients = await Promise.all([
    prisma.client.create({
      data: {
        name: 'Acme Corporation',
        company: 'Acme Corp',
        contactEmail: 'contact@acme.example.com',
      },
    }),
    prisma.client.create({
      data: {
        name: 'Globex Industries',
        company: 'Globex',
        contactEmail: 'hello@globex.example.com',
      },
    }),
    prisma.client.create({
      data: {
        name: 'Initech Solutions',
        company: 'Initech',
        contactEmail: 'info@initech.example.com',
      },
    }),
  ]);

  await prisma.activityLog.create({
    data: {
      type: ActivityType.CLIENT_CREATED,
      summary: `Client "${clients[0].name}" created`,
      source: ActivitySource.USER,
      actorId: admin.id,
      clientId: clients[0].id,
      createdAt: daysAgo(30),
    },
  });

  console.log('Creating projects...');
  const project1 = await prisma.project.create({
    data: {
      name: 'Client Portal Redesign',
      description: 'Modernize the client-facing portal with improved UX.',
      status: ProjectStatus.IN_PROGRESS,
      clientId: clients[0].id,
      createdById: pm1.id,
      startDate: daysAgo(20),
      dueDate: daysFromNow(45),
    },
  });

  const project2 = await prisma.project.create({
    data: {
      name: 'Mobile App MVP',
      description: 'Deliver the first mobile app release for Globex.',
      status: ProjectStatus.IN_PROGRESS,
      clientId: clients[1].id,
      createdById: pm1.id,
      startDate: daysAgo(15),
      dueDate: daysFromNow(30),
    },
  });

  const project3 = await prisma.project.create({
    data: {
      name: 'Internal Analytics Dashboard',
      description: 'Build analytics tooling for Initech operations team.',
      status: ProjectStatus.PLANNED,
      clientId: clients[2].id,
      createdById: pm2.id,
      startDate: daysAgo(5),
      dueDate: daysFromNow(60),
    },
  });

  const projects = [project1, project2, project3];

  for (const project of projects) {
    await prisma.activityLog.create({
      data: {
        type: ActivityType.PROJECT_CREATED,
        summary: `Project "${project.name}" created`,
        source: ActivitySource.USER,
        actorId: project.createdById,
        projectId: project.id,
        createdAt: daysAgo(14),
      },
    });
  }

  console.log('Creating tasks...');
  type TaskSeed = {
    projectId: string;
    createdById: string;
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    assigneeId: string;
    dueDate: Date;
    isOverdue: boolean;
    overdueAt?: Date;
  };

  const taskSeeds: TaskSeed[] = [
    // Project 1 — 5 tasks (1 overdue)
    {
      projectId: project1.id,
      createdById: pm1.id,
      title: 'Audit existing portal pages',
      description: 'Document current portal structure and pain points.',
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      assigneeId: dev1.id,
      dueDate: daysAgo(10),
      isOverdue: false,
    },
    {
      projectId: project1.id,
      createdById: pm1.id,
      title: 'Design new dashboard layout',
      description: 'Create wireframes for the redesigned dashboard.',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.CRITICAL,
      assigneeId: dev2.id,
      dueDate: daysFromNow(7),
      isOverdue: false,
    },
    {
      projectId: project1.id,
      createdById: pm1.id,
      title: 'Implement login flow',
      description: 'Build updated authentication UI components.',
      status: TaskStatus.IN_REVIEW,
      priority: TaskPriority.MEDIUM,
      assigneeId: dev1.id,
      dueDate: daysFromNow(3),
      isOverdue: false,
    },
    {
      projectId: project1.id,
      createdById: pm1.id,
      title: 'Fix legacy CSS regressions',
      description: 'Resolve styling issues on older portal pages.',
      status: TaskStatus.TODO,
      priority: TaskPriority.CRITICAL,
      assigneeId: dev3.id,
      dueDate: daysAgo(3),
      isOverdue: true,
      overdueAt: daysAgo(2),
    },
    {
      projectId: project1.id,
      createdById: pm1.id,
      title: 'Write portal migration guide',
      description: 'Document steps for migrating client data.',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.MEDIUM,
      assigneeId: dev4.id,
      dueDate: daysFromNow(14),
      isOverdue: false,
    },
    // Project 2 — 5 tasks (1 overdue)
    {
      projectId: project2.id,
      createdById: pm1.id,
      title: 'Set up React Native project',
      description: 'Initialize mobile repo and CI pipeline.',
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      assigneeId: dev2.id,
      dueDate: daysAgo(8),
      isOverdue: false,
    },
    {
      projectId: project2.id,
      createdById: pm1.id,
      title: 'Build authentication screens',
      description: 'Login, logout, and session handling for mobile.',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.CRITICAL,
      assigneeId: dev1.id,
      dueDate: daysFromNow(5),
      isOverdue: false,
    },
    {
      projectId: project2.id,
      createdById: pm1.id,
      title: 'Integrate push notifications',
      description: 'Wire up FCM for task alerts.',
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      assigneeId: dev3.id,
      dueDate: daysAgo(1),
      isOverdue: true,
      overdueAt: daysAgo(1),
    },
    {
      projectId: project2.id,
      createdById: pm1.id,
      title: 'Offline data sync',
      description: 'Cache tasks for offline viewing.',
      status: TaskStatus.IN_REVIEW,
      priority: TaskPriority.MEDIUM,
      assigneeId: dev4.id,
      dueDate: daysFromNow(10),
      isOverdue: false,
    },
    {
      projectId: project2.id,
      createdById: pm1.id,
      title: 'App store submission prep',
      description: 'Prepare screenshots and release notes.',
      status: TaskStatus.TODO,
      priority: TaskPriority.LOW,
      assigneeId: dev2.id,
      dueDate: daysFromNow(20),
      isOverdue: false,
    },
    // Project 3 — 5 tasks
    {
      projectId: project3.id,
      createdById: pm2.id,
      title: 'Define analytics KPIs',
      description: 'Work with stakeholders to finalize metrics.',
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      assigneeId: dev3.id,
      dueDate: daysAgo(5),
      isOverdue: false,
    },
    {
      projectId: project3.id,
      createdById: pm2.id,
      title: 'Design data model',
      description: 'Schema for analytics events and aggregations.',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      assigneeId: dev1.id,
      dueDate: daysFromNow(8),
      isOverdue: false,
    },
    {
      projectId: project3.id,
      createdById: pm2.id,
      title: 'Build ETL pipeline',
      description: 'Ingest data from operational databases.',
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      assigneeId: dev4.id,
      dueDate: daysFromNow(15),
      isOverdue: false,
    },
    {
      projectId: project3.id,
      createdById: pm2.id,
      title: 'Create dashboard widgets',
      description: 'Charts for task throughput and overdue counts.',
      status: TaskStatus.IN_REVIEW,
      priority: TaskPriority.MEDIUM,
      assigneeId: dev2.id,
      dueDate: daysFromNow(12),
      isOverdue: false,
    },
    {
      projectId: project3.id,
      createdById: pm2.id,
      title: 'Performance testing',
      description: 'Load test analytics queries.',
      status: TaskStatus.TODO,
      priority: TaskPriority.LOW,
      assigneeId: dev3.id,
      dueDate: daysFromNow(25),
      isOverdue: false,
    },
  ];

  const tasks = await Promise.all(
    taskSeeds.map((seed) =>
      prisma.task.create({
        data: {
          projectId: seed.projectId,
          createdById: seed.createdById,
          title: seed.title,
          description: seed.description,
          status: seed.status,
          priority: seed.priority,
          assigneeId: seed.assigneeId,
          dueDate: seed.dueDate,
          isOverdue: seed.isOverdue,
          overdueAt: seed.overdueAt ?? null,
        },
      }),
    ),
  );

  console.log('Creating activity log entries...');
  const activityEntries = [
    {
      type: ActivityType.TASK_CREATED,
      summary: 'Task "Audit existing portal pages" created',
      actorId: pm1.id,
      projectId: project1.id,
      taskId: tasks[0].id,
      createdAt: daysAgo(18),
    },
    {
      type: ActivityType.TASK_ASSIGNED,
      summary: 'Task "Audit existing portal pages" assigned to Dev One',
      actorId: pm1.id,
      projectId: project1.id,
      taskId: tasks[0].id,
      createdAt: daysAgo(17),
    },
    {
      type: ActivityType.TASK_STATUS_CHANGED,
      summary: 'Task "Audit existing portal pages" status changed from TODO to IN_PROGRESS',
      actorId: dev1.id,
      projectId: project1.id,
      taskId: tasks[0].id,
      previousStatus: TaskStatus.TODO,
      newStatus: TaskStatus.IN_PROGRESS,
      createdAt: daysAgo(16),
    },
    {
      type: ActivityType.TASK_STATUS_CHANGED,
      summary: 'Task "Audit existing portal pages" status changed from IN_PROGRESS to DONE',
      actorId: dev1.id,
      projectId: project1.id,
      taskId: tasks[0].id,
      previousStatus: TaskStatus.IN_PROGRESS,
      newStatus: TaskStatus.DONE,
      createdAt: daysAgo(10),
    },
    {
      type: ActivityType.TASK_STATUS_CHANGED,
      summary: 'Task "Implement login flow" status changed from IN_PROGRESS to IN_REVIEW',
      actorId: dev1.id,
      projectId: project1.id,
      taskId: tasks[2].id,
      previousStatus: TaskStatus.IN_PROGRESS,
      newStatus: TaskStatus.IN_REVIEW,
      createdAt: daysAgo(2),
    },
    {
      type: ActivityType.TASK_MARKED_OVERDUE,
      summary: 'Task "Fix legacy CSS regressions" marked as overdue',
      source: ActivitySource.SYSTEM,
      actorId: null,
      projectId: project1.id,
      taskId: tasks[3].id,
      createdAt: daysAgo(2),
      metadata: { dueDate: tasks[3].dueDate?.toISOString() },
    },
    {
      type: ActivityType.TASK_STATUS_CHANGED,
      summary: 'Task "Build authentication screens" status changed from TODO to IN_PROGRESS',
      actorId: dev1.id,
      projectId: project2.id,
      taskId: tasks[6].id,
      previousStatus: TaskStatus.TODO,
      newStatus: TaskStatus.IN_PROGRESS,
      createdAt: daysAgo(4),
    },
    {
      type: ActivityType.TASK_MARKED_OVERDUE,
      summary: 'Task "Integrate push notifications" marked as overdue',
      source: ActivitySource.SYSTEM,
      actorId: null,
      projectId: project2.id,
      taskId: tasks[7].id,
      createdAt: daysAgo(1),
      metadata: { dueDate: tasks[7].dueDate?.toISOString() },
    },
    {
      type: ActivityType.TASK_STATUS_CHANGED,
      summary: 'Task "Define analytics KPIs" status changed from IN_PROGRESS to DONE',
      actorId: dev3.id,
      projectId: project3.id,
      taskId: tasks[10].id,
      previousStatus: TaskStatus.IN_PROGRESS,
      newStatus: TaskStatus.DONE,
      createdAt: daysAgo(5),
    },
    {
      type: ActivityType.PROJECT_STATUS_CHANGED,
      summary: 'Project "Client Portal Redesign" status changed to IN_PROGRESS',
      actorId: pm1.id,
      projectId: project1.id,
      createdAt: daysAgo(19),
    },
  ];

  for (const entry of activityEntries) {
    await prisma.activityLog.create({
      data: {
        type: entry.type,
        summary: entry.summary,
        source: entry.source ?? ActivitySource.USER,
        actorId: entry.actorId,
        projectId: entry.projectId,
        taskId: entry.taskId,
        previousStatus: entry.previousStatus,
        newStatus: entry.newStatus,
        metadata: entry.metadata,
        createdAt: entry.createdAt,
      },
    });
  }

  const counts = {
    users: await prisma.user.count(),
    clients: await prisma.client.count(),
    projects: await prisma.project.count(),
    tasks: await prisma.task.count(),
    overdueTasks: await prisma.task.count({ where: { isOverdue: true } }),
    activityLogs: await prisma.activityLog.count(),
    notifications: await prisma.notification.count(),
    refreshTokens: await prisma.refreshToken.count(),
  };

  console.log('Seed completed successfully.');
  console.log('Record counts:', counts);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
