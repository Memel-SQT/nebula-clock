import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  LIMITS,
  filterTasksByTag,
  moveItem,
  sortTasks,
  taskTotals,
  remainingPomodoros,
} from '@nebula-clock/core';
import {
  Button,
  Card,
  Chip,
  EmptyState,
  NumberField,
  PageHeader,
  SegmentedControl,
  TextField,
  cn,
} from '@nebula-clock/ui';
import { TagManager } from '../components/TagManager.js';
import { TaskItem } from '../components/TaskItem.js';
import { useDataStore } from '../store/dataStore.js';
import { useTimerStore } from '../store/timerStore.js';

type Filter = 'all' | 'active' | 'done';

export function TasksView() {
  const { t } = useTranslation(['tasks', 'common']);
  const tasks = useDataStore((state) => state.tasks);
  const tags = useDataStore((state) => state.tags);
  const addTask = useDataStore((state) => state.addTask);
  const editTask = useDataStore((state) => state.editTask);
  const toggleTaskDone = useDataStore((state) => state.toggleTaskDone);
  const removeTask = useDataStore((state) => state.removeTask);
  const reorder = useDataStore((state) => state.reorder);
  const clearDoneTasks = useDataStore((state) => state.clearDoneTasks);

  const activeTaskId = useTimerStore((state) => state.activeTaskId);
  const setActiveTask = useTimerStore((state) => state.setActiveTask);

  const [title, setTitle] = useState('');
  const [estimate, setEstimate] = useState(1);
  const [filter, setFilter] = useState<Filter>('all');
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  const sensors = useSensors(
    // A small activation distance keeps a click on the handle from being swallowed as the
    // start of a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const ordered = useMemo(() => sortTasks(tasks), [tasks]);
  const visible = useMemo(() => {
    const byTag = filterTasksByTag(ordered, tagFilter);
    if (filter === 'active') return byTag.filter((task) => !task.done);
    if (filter === 'done') return byTag.filter((task) => task.done);
    return byTag;
  }, [ordered, tagFilter, filter]);

  const totals = taskTotals(tasks);

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    void addTask({
      title: trimmed.slice(0, 200),
      estimatedPomodoros: estimate,
      tagIds: tagFilter ? [tagFilter] : [],
    });
    setTitle('');
    setEstimate(1);
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = ordered.map((task) => task.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    void reorder(moveItem(ids, from, to));
  };

  return (
    <>
      <PageHeader
        eyebrow={t('common:pages.tasks.eyebrow')}
        title={t('tasks:title')}
        intro={t('tasks:subtitle')}
      />

      <div className="tasks-layout">
        <div className="tasks-main">
          <Card>
            <div className="task-form">
              <TextField
                value={title}
                maxLength={200}
                onChange={(event) => setTitle(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && submit()}
                placeholder={t('tasks:form.titlePlaceholder')}
                aria-label={t('tasks:form.titlePlaceholder')}
                wrapperClassName="task-form-title"
              />
              <NumberField
                value={estimate}
                onChange={(value) =>
                  setEstimate(
                    Math.min(
                      LIMITS.estimatedPomodoros.max,
                      Math.max(LIMITS.estimatedPomodoros.min, Math.round(value)),
                    ),
                  )
                }
                min={LIMITS.estimatedPomodoros.min}
                max={LIMITS.estimatedPomodoros.max}
                aria-label={t('tasks:form.estimateAria')}
                title={t('tasks:form.estimate')}
                wrapperClassName="task-form-estimate"
              />
              <Button variant="primary" icon="plus" onClick={submit}>
                {t('tasks:form.add')}
              </Button>
            </div>
          </Card>

          <div className="task-filters">
            <SegmentedControl
              label={t('tasks:title')}
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: t('tasks:filters.all') },
                { value: 'active', label: t('tasks:filters.active') },
                { value: 'done', label: t('tasks:filters.done') },
              ]}
            />

            {tags.length > 0 ? (
              <div className="tag-filter" role="group" aria-label={t('tasks:filters.byTag')}>
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    aria-pressed={tagFilter === tag.id}
                    data-sound="toggle"
                    onClick={() => setTagFilter(tagFilter === tag.id ? null : tag.id)}
                    className={cn(
                      'tag-filter-button',
                      tagFilter && tagFilter !== tag.id && 'is-dimmed',
                    )}
                  >
                    <Chip color={tag.color}>{tag.name}</Chip>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {visible.length === 0 ? (
            <EmptyState
              compact={false}
              icon="tasks"
              title={t('tasks:empty.title')}
              description={t('tasks:empty.body')}
            />
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
              modifiers={[restrictToVerticalAxis, restrictToParentElement]}
              accessibility={{
                screenReaderInstructions: { draggable: t('tasks:reorder.instructions') },
              }}
            >
              <SortableContext
                items={visible.map((task) => task.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="task-list">
                  {visible.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      tags={tags}
                      selected={task.id === activeTaskId}
                      onSelect={() => {
                        if (task.done) return;
                        setActiveTask(task.id === activeTaskId ? null : task.id);
                      }}
                      onToggleDone={(done) => {
                        // A finished task cannot keep collecting pomodoros.
                        if (done && task.id === activeTaskId) setActiveTask(null);
                        void toggleTaskDone(task.id, done);
                      }}
                      onDelete={() => {
                        if (task.id === activeTaskId) setActiveTask(null);
                        void removeTask(task.id);
                      }}
                      onRename={(next) => void editTask(task.id, { title: next.slice(0, 200) })}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}

          <div className="task-summary">
            <span>
              {t('tasks:summary.completed', { done: totals.completed, total: totals.total })} ·{' '}
              {t('tasks:summary.remaining', { count: remainingPomodoros(tasks) })}
            </span>
            {totals.completed > 0 ? (
              <Button size="sm" variant="ghost" icon="trash" onClick={() => void clearDoneTasks()}>
                {t('tasks:clearCompleted')}
              </Button>
            ) : null}
          </div>
        </div>

        <aside className="tasks-side">
          <TagManager />
        </aside>
      </div>
    </>
  );
}
