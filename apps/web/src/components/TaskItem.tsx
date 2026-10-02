import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { taskProgress } from '@nebula-clock/core';
import type { Tag, Task } from '@nebula-clock/core';
import { Chip, Icon, IconButton, ProgressBar, cn } from '@nebula-clock/ui';

export interface TaskItemProps {
  task: Task;
  tags: Tag[];
  selected: boolean;
  onSelect: () => void;
  onToggleDone: (done: boolean) => void;
  onDelete: () => void;
  onRename: (title: string) => void;
}

/**
 * One row of the task list: sortable by pointer *and* by keyboard (dnd-kit wires the handle up
 * to the arrow keys), renamed inline from its own button or by double-click.
 */
export function TaskItem({
  task,
  tags,
  selected,
  onSelect,
  onToggleDone,
  onDelete,
  onRename,
}: TaskItemProps) {
  const { t } = useTranslation(['tasks', 'common']);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });
  const progress = taskProgress(task);

  const startEditing = () => {
    // From the current title: it may have changed since the row mounted (an import, a rename).
    setDraft(task.title);
    setEditing(true);
  };

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== task.title) onRename(trimmed);
    setEditing(false);
  };

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'task-row',
        selected && 'is-selected',
        task.done && 'is-done',
        isDragging && 'is-dragging',
      )}
    >
      <button
        type="button"
        aria-label={t('tasks:item.dragHandle')}
        className="task-grip"
        data-sound="none"
        {...attributes}
        {...listeners}
      >
        <Icon name="grip" size={16} />
      </button>

      <input
        type="checkbox"
        checked={task.done}
        onChange={(event) => onToggleDone(event.target.checked)}
        aria-label={task.done ? t('tasks:item.markUndone') : t('tasks:item.markDone')}
        className="task-check"
      />

      <div className="task-body">
        {editing ? (
          <input
            autoFocus
            value={draft}
            maxLength={200}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commit();
              if (event.key === 'Escape') setEditing(false);
            }}
            aria-label={t('tasks:item.rename')}
            className="field task-title-input"
          />
        ) : (
          <button
            type="button"
            onDoubleClick={startEditing}
            onClick={onSelect}
            aria-pressed={selected}
            className="task-title"
            title={task.title}
          >
            {task.title}
          </button>
        )}

        <div className="task-meta">
          <span
            className="tabular"
            aria-label={t('tasks:item.progressAria', {
              done: progress.done,
              estimated: progress.estimated,
            })}
          >
            {t('tasks:item.progress', { done: progress.done, estimated: progress.estimated })}
          </span>
          <ProgressBar
            value={progress.ratio}
            label=""
            decorative
            size="sm"
            tone={progress.overrun ? 'warning' : 'accent'}
            className="task-progress"
          />
          {progress.overrun ? <Chip tone="warning">{t('tasks:item.overrun')}</Chip> : null}
          {task.tagIds.map((tagId) => {
            const tag = tags.find((candidate) => candidate.id === tagId);
            return tag ? (
              <Chip key={tag.id} color={tag.color}>
                {tag.name}
              </Chip>
            ) : null;
          })}
        </div>
      </div>

      <div className="task-actions">
        <IconButton
          label={selected ? t('tasks:item.selected') : t('tasks:item.select')}
          icon={selected ? 'check' : 'start'}
          size="sm"
          active={selected}
          disabled={task.done}
          onClick={onSelect}
        />
        <IconButton label={t('tasks:item.rename')} icon="edit" size="sm" onClick={startEditing} />
        <IconButton
          label={t('common:actions.delete')}
          icon="trash"
          size="sm"
          sound="none"
          onClick={onDelete}
        />
      </div>
    </li>
  );
}
