import { useSearchParams } from 'react-router-dom';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import type { TaskPriority, TaskStatus } from '../../types/api';
import {
  TASK_FILTER_URL_KEYS,
  hasTaskFilterParams,
} from '../../utils/task-filters';
import { TASK_PRIORITY_OPTIONS } from './PriorityBadge';
import { TASK_STATUS_OPTIONS } from './TaskStatusBadge';
import './TaskFiltersBar.css';

function getSelectValue<T extends string>(raw: string, allowed: T[]): string {
  return allowed.includes(raw as T) ? raw : '';
}

export function TaskFiltersBar() {
  const [searchParams, setSearchParams] = useSearchParams();

  const rawStatus = searchParams.get(TASK_FILTER_URL_KEYS.status) ?? '';
  const rawPriority = searchParams.get(TASK_FILTER_URL_KEYS.priority) ?? '';
  const dueFrom = searchParams.get(TASK_FILTER_URL_KEYS.dueFrom) ?? '';
  const dueTo = searchParams.get(TASK_FILTER_URL_KEYS.dueTo) ?? '';

  const status = getSelectValue<TaskStatus>(
    rawStatus,
    TASK_STATUS_OPTIONS.map((option) => option.value),
  );
  const priority = getSelectValue<TaskPriority>(
    rawPriority,
    TASK_PRIORITY_OPTIONS.map((option) => option.value),
  );
  const showDateRangeHint = Boolean(dueFrom && dueTo && dueFrom > dueTo);

  function updateParam(key: keyof typeof TASK_FILTER_URL_KEYS, value: string) {
    const nextParams = new URLSearchParams(searchParams);

    if (value) {
      nextParams.set(TASK_FILTER_URL_KEYS[key], value);
    } else {
      nextParams.delete(TASK_FILTER_URL_KEYS[key]);
    }

    setSearchParams(nextParams, { replace: true });
  }

  function clearFilters() {
    setSearchParams({}, { replace: true });
  }

  return (
    <div className="task-filters" aria-label="Task filters">
      <div className="task-filters__field">
        <Select
          name="status"
          label="Status"
          value={status}
          onChange={(event) => updateParam('status', event.target.value)}
          placeholder="All statuses"
          options={TASK_STATUS_OPTIONS}
        />
      </div>

      <div className="task-filters__field">
        <Select
          name="priority"
          label="Priority"
          value={priority}
          onChange={(event) => updateParam('priority', event.target.value)}
          placeholder="All priorities"
          options={TASK_PRIORITY_OPTIONS}
        />
      </div>

      <div className="task-filters__field task-filters__field--date">
        <Input
          name="dueFrom"
          label="Due from"
          type="date"
          value={dueFrom}
          onChange={(event) => updateParam('dueFrom', event.target.value)}
        />
      </div>

      <div className="task-filters__field task-filters__field--date">
        <Input
          name="dueTo"
          label="Due to"
          type="date"
          value={dueTo}
          onChange={(event) => updateParam('dueTo', event.target.value)}
        />
      </div>

      <div className="task-filters__actions">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          disabled={!hasTaskFilterParams(searchParams)}
        >
          Clear filters
        </Button>
      </div>

      {showDateRangeHint ? (
        <p className="task-filters__hint" role="status">
          Due from must be on or before due to. Date filters are ignored until corrected.
        </p>
      ) : null}
    </div>
  );
}
