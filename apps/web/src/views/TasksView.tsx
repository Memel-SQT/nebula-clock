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
import { Plus } from 'lucide-react';
import {
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
    // A small activation distance keeps a click on the handle from being
    // swallowed as the start of a drag.
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
      title: trimmed,
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
    <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <section>
        <header className="mb-4">
          <h1 className="text-xl font-semibold tracking-tight">{t('tasks:title')}</h1>
          <p className="text-sm text-text-secondary">{t('tasks:subtitle')}</p>
        </header>

        <Card className="mb-4">
          <div className="flex flex-wrap items-end gap-2">
            <TextField
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && submit()}
              placeholder={t('tasks:form.titlePlaceholder')}
              aria-label={t('tasks:form.titlePlaceholder')}
              wrapperClassName="flex-1 min-w-[12rem]"
            />
            <NumberField
              value={estimate}
              onChange={setEstimate}
              min={1}
              max={20}
              label={t('tasks:form.estimate')}
              aria-label={t('tasks:form.estimateAria')}
              wrapperClassName="w-24"
            />
            <Button variant="primary" icon={<Plus size={16} />} onClick={submit} className="mb-1">
              {t('tasks:form.add')}
            </Button>
          </div>
        </Card>

        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <SegmentedControl
            size="sm"
            label={t('tasks:filters.all')}
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: t('tasks:filters.all') },
              { value: 'active', label: t('tasks:filters.active') },
              { value: 'done', label: t('tasks:filters.done') },
            ]}
          />

          {tags.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  aria-pressed={tagFilter === tag.id}
                  onClick={() => setTagFilter(tagFilter === tag.id ? null : tag.id)}
                  className={cn(
                    'rounded-pill transition-opacity duration-fast',
                    tagFilter && tagFilter !== tag.id && 'opacity-45',
                  )}
                >
                  <Chip color={tag.color} size="sm">
                    {tag.name}
                  </Chip>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {visible.length === 0 ? (
          <EmptyState title={t('tasks:empty.title')} description={t('tasks:empty.body')} />
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
              <ul className="space-y-2">
                {visible.map((task, index) => (
                  <TaskItem
                    key={task.id}
                    index={index}
                    task={task}
                    tags={tags}
                    selected={task.id === activeTaskId}
                    onSelect={() => setActiveTask(task.id === activeTaskId ? null : task.id)}
                    onToggleDone={(done) => void toggleTaskDone(task.id, done)}
                    onDelete={() => {
                      if (task.id === activeTaskId) setActiveTask(null);
                      void removeTask(task.id);
                    }}
                    onRename={(next) => void editTask(task.id, { title: next })}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-text-secondary">
          <span>
            {t('tasks:summary.completed', { done: totals.completed, total: totals.total })} ·{' '}
            {t('tasks:summary.remaining', { count: remainingPomodoros(tasks) })}
          </span>
          {totals.completed > 0 ? (
            <Button size="sm" variant="ghost" onClick={() => void clearDoneTasks()}>
              {t('tasks:clearCompleted')}
            </Button>
          ) : null}
        </div>
      </section>

      <aside>
        <TagManager />
      </aside>
    </div>
  );
}
