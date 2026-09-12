import type { TaskPriority, TaskStatus } from '../types/api';
import type { ListTasksParams } from '../api/tasks.api';
import { dateInputToIsoDateTime, dateInputToIsoEndOfDay, isValidDateInput } from './format-dates';

export const TASK_FILTER_URL_KEYS = {
  status: 'status',
  priority: 'priority',
  dueFrom: 'dueFrom',
  dueTo: 'dueTo',
} as const;

const TASK_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
const TASK_PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export type TaskUrlFilters = {
  status?: TaskStatus;
  priority?: TaskPriority;
  dueFrom?: string;
  dueTo?: string;
};

export type ParsedTaskFilters = {
  urlFilters: TaskUrlFilters;
  apiParams: Omit<ListTasksParams, 'projectId' | 'page' | 'limit'>;
  hasActiveFilters: boolean;
  dateRangeInvalid: boolean;
};

function parseStatus(value: string | null): TaskStatus | undefined {
  if (!value) {
    return undefined;
  }

  return TASK_STATUSES.includes(value as TaskStatus) ? (value as TaskStatus) : undefined;
}

function parsePriority(value: string | null): TaskPriority | undefined {
  if (!value) {
    return undefined;
  }

  return TASK_PRIORITIES.includes(value as TaskPriority) ? (value as TaskPriority) : undefined;
}

function parseDateParam(value: string | null): string | undefined {
  if (!value || !isValidDateInput(value)) {
    return undefined;
  }

  return value;
}

export function parseTaskFiltersFromSearchParams(searchParams: URLSearchParams): ParsedTaskFilters {
  const status = parseStatus(searchParams.get(TASK_FILTER_URL_KEYS.status));
  const priority = parsePriority(searchParams.get(TASK_FILTER_URL_KEYS.priority));
  const dueFrom = parseDateParam(searchParams.get(TASK_FILTER_URL_KEYS.dueFrom));
  const dueTo = parseDateParam(searchParams.get(TASK_FILTER_URL_KEYS.dueTo));

  const urlFilters: TaskUrlFilters = {
    ...(status ? { status } : {}),
    ...(priority ? { priority } : {}),
    ...(dueFrom ? { dueFrom } : {}),
    ...(dueTo ? { dueTo } : {}),
  };

  const dateRangeInvalid = Boolean(dueFrom && dueTo && dueFrom > dueTo);

  const apiParams: Omit<ListTasksParams, 'projectId' | 'page' | 'limit'> = {
    ...(status ? { status } : {}),
    ...(priority ? { priority } : {}),
    ...(!dateRangeInvalid && dueFrom ? { dueDateFrom: dateInputToIsoDateTime(dueFrom) } : {}),
    ...(!dateRangeInvalid && dueTo ? { dueDateTo: dateInputToIsoEndOfDay(dueTo) } : {}),
  };

  const hasActiveFilters = Boolean(
    status || priority || (dueFrom && !dateRangeInvalid) || (dueTo && !dateRangeInvalid),
  );

  return {
    urlFilters,
    apiParams,
    hasActiveFilters,
    dateRangeInvalid,
  };
}

export function buildTaskFilterSearchParams(filters: TaskUrlFilters): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.status) {
    params.set(TASK_FILTER_URL_KEYS.status, filters.status);
  }
  if (filters.priority) {
    params.set(TASK_FILTER_URL_KEYS.priority, filters.priority);
  }
  if (filters.dueFrom) {
    params.set(TASK_FILTER_URL_KEYS.dueFrom, filters.dueFrom);
  }
  if (filters.dueTo) {
    params.set(TASK_FILTER_URL_KEYS.dueTo, filters.dueTo);
  }

  return params;
}

export function hasTaskFilterParams(searchParams: URLSearchParams): boolean {
  return (
    searchParams.has(TASK_FILTER_URL_KEYS.status) ||
    searchParams.has(TASK_FILTER_URL_KEYS.priority) ||
    searchParams.has(TASK_FILTER_URL_KEYS.dueFrom) ||
    searchParams.has(TASK_FILTER_URL_KEYS.dueTo)
  );
}
