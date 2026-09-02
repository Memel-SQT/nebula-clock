import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, GripVertical, Play, Trash2 } from 'lucide-react';
import { taskProgress } from '@nebula-clock/core';
import type { Tag, Task } from '@nebula-clock/core';
import { Chip, IconButton, ProgressBar, cn } from '@nebula-clock/ui';
import { revealDelay } from '../lib/reveal.js';

export interface TaskItemProps {
  task: Task;
  tags: Tag[];
  selected: boolean;
  onSelect: () => void;
  onToggleDone: (done: boolean) => void;
  onDelete: () => void;
  onRename: (title: string) => void;
  /** Position in the list, used to stagger the entrance. */
  index?: number;
}

/**
 * One row of the task list: sortable by pointer *and* by keyboard (dnd-kit
 * wires the handle up to arrow keys), with inline renaming.
 */
export function TaskItem({
  task,
  tags,
  selected,
  onSelect,
  onToggleDone,
  onDelete,
  onRename,
  index = 0,
}: TaskItemProps) {
  const { t } = useTranslation(['tasks', 'common']);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });
  const progress = taskProgress(task);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== task.title) onRename(trimmed);
    else setDraft(task.title);
    setEditing(false);
  };

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        ...revealDelay(index),
      }}
      className={cn(
        // The reveal animates `translate`, which composes with the
        // `transform` dnd-kit writes here rather than fighting it.
        'nebula-reveal',
        'flex items-center gap-3 rounded-md border bg-card px-3 py-2.5',
        'transition-[border-color,box-shadow,opacity] duration-fast ease-nebula',
        selected ? 'border-accent/50 shadow-ring-soft' : 'border-border',
        task.done && 'opacity-60',
        isDragging && 'z-10 opacity-90 shadow-glow',
      )}
    >
      <button
        type="button"
        aria-label={t('tasks:item.dragHandle')}
        className="cursor-grab touch-none text-text-secondary hover:text-text active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} aria-hidden="true" />
      </button>

      <input
        type="checkbox"
        checked={task.done}
        onChange={(event) => onToggleDone(event.target.checked)}
        aria-label={task.done ? t('tasks:item.markUndone') : t('tasks:item.markDone')}
        className="h-4 w-4 shrink-0 cursor-pointer accent-[var(--accent-to)]"
      />

      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commit();
              if (event.key === 'Escape') {
                setDraft(task.title);
                setEditing(false);
              }
            }}
            aria-label={t('tasks:form.update')}
            className="w-full rounded border border-accent bg-card-alt px-2 py-1 text-sm focus-visible:outline-none"
          />
        ) : (
          <button
            type="button"
            onDoubleClick={() => setEditing(true)}
            onClick={onSelect}
            className={cn(
              'block w-full truncate text-left text-sm font-medium',
              task.done && 'line-through',
            )}
          >
            {task.title}
          </button>
        )}

        <div className="mt-1 flex items-center gap-2">
          <span
            className="shrink-0 font-mono text-xs tabular-nums text-text-secondary"
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
            className="max-w-24"
          />
          {progress.overrun ? (
            <Chip tone="warning" size="sm">
              {t('tasks:item.overrun')}
            </Chip>
          ) : null}
          {task.tagIds.map((tagId) => {
            const tag = tags.find((candidate) => candidate.id === tagId);
            return tag ? (
              <Chip key={tag.id} color={tag.color} size="sm">
                {tag.name}
              </Chip>
            ) : null;
          })}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <IconButton
          label={selected ? t('tasks:item.selected') : t('tasks:item.select')}
          icon={selected ? <Check size={14} /> : <Play size={14} />}
          size="sm"
          active={selected}
          onClick={onSelect}
        />
        <IconButton
          label={t('common:actions.delete')}
          icon={<Trash2 size={14} />}
          size="sm"
          onClick={onDelete}
        />
      </div>
    </li>
  );
}
