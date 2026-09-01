import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { sortTasks } from '@nebula-clock/core';
import { Chip, IconButton, cn } from '@nebula-clock/ui';
import { useDataStore } from '../store/dataStore.js';
import { useTimerStore } from '../store/timerStore.js';

/**
 * Which task the next pomodoro will be credited to. Rendered as a native
 * select so it stays usable on mobile and with a keyboard.
 */
export function ActiveTaskPicker() {
  const { t } = useTranslation(['timer']);
  const tasks = useDataStore((state) => state.tasks);
  const tags = useDataStore((state) => state.tags);
  const activeTaskId = useTimerStore((state) => state.activeTaskId);
  const setActiveTask = useTimerStore((state) => state.setActiveTask);

  const open = sortTasks(tasks).filter((task) => !task.done);
  const active = tasks.find((task) => task.id === activeTaskId) ?? null;

  return (
    <div className="flex flex-col items-center gap-2">
      <label
        htmlFor="active-task"
        className="text-xs font-medium uppercase tracking-wide text-text-secondary"
      >
        {t('timer:activeTask.label')}
      </label>

      <div className="flex items-center gap-2">
        <select
          id="active-task"
          value={activeTaskId ?? ''}
          onChange={(event) => setActiveTask(event.target.value || null)}
          className={cn(
            'h-9 max-w-[16rem] cursor-pointer truncate rounded border border-border bg-card-alt px-3 text-sm',
            'transition-colors duration-fast ease-nebula hover:border-accent focus:border-accent focus-visible:outline-none',
          )}
        >
          <option value="">{t('timer:activeTask.none')}</option>
          {open.map((task) => (
            <option key={task.id} value={task.id}>
              {task.title}
            </option>
          ))}
        </select>

        {active ? (
          <IconButton
            label={t('timer:activeTask.clear')}
            icon={<X size={14} />}
            size="sm"
            onClick={() => setActiveTask(null)}
          />
        ) : null}
      </div>

      {active ? (
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs tabular-nums text-text-secondary">
            {active.completedPomodoros} / {Math.max(1, active.estimatedPomodoros)}
          </span>
          {active.tagIds.map((tagId) => {
            const tag = tags.find((candidate) => candidate.id === tagId);
            return tag ? (
              <Chip key={tag.id} color={tag.color} size="sm">
                {tag.name}
              </Chip>
            ) : null;
          })}
        </div>
      ) : null}
    </div>
  );
}
