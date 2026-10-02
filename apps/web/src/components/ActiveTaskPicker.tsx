import { useTranslation } from 'react-i18next';
import { sortTasks } from '@nebula-clock/core';
import { Chip, IconButton, SelectField } from '@nebula-clock/ui';
import { useDataStore } from '../store/dataStore.js';
import { useTimerStore } from '../store/timerStore.js';

/**
 * Which task the next pomodoro will be credited to. A native select, so it stays usable on
 * mobile and with a keyboard. A task that was finished or deleted counts as no selection (the
 * timer store does the same when it records a session).
 */
export function ActiveTaskPicker() {
  const { t } = useTranslation(['timer']);
  const tasks = useDataStore((state) => state.tasks);
  const tags = useDataStore((state) => state.tags);
  const activeTaskId = useTimerStore((state) => state.activeTaskId);
  const setActiveTask = useTimerStore((state) => state.setActiveTask);

  const open = sortTasks(tasks).filter((task) => !task.done);
  const active = open.find((task) => task.id === activeTaskId) ?? null;

  return (
    <div className="active-task">
      <div className="active-task-row">
        <SelectField
          label={t('timer:activeTask.label')}
          value={active?.id ?? ''}
          onChange={(event) => setActiveTask(event.target.value || null)}
          options={[
            { value: '', label: t('timer:activeTask.none') },
            ...open.map((task) => ({ value: task.id, label: task.title })),
          ]}
          wrapperClassName="active-task-select"
        />
        {active ? (
          <IconButton
            label={t('timer:activeTask.clear')}
            icon="close"
            size="sm"
            onClick={() => setActiveTask(null)}
          />
        ) : null}
      </div>

      {active ? (
        <div className="active-task-meta">
          <span className="tabular">
            {active.completedPomodoros} / {Math.max(1, active.estimatedPomodoros)}
          </span>
          {active.tagIds.map((tagId) => {
            const tag = tags.find((candidate) => candidate.id === tagId);
            return tag ? (
              <Chip key={tag.id} color={tag.color}>
                {tag.name}
              </Chip>
            ) : null;
          })}
        </div>
      ) : null}
    </div>
  );
}
