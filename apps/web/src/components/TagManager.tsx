import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { TAG_COLORS } from '@nebula-clock/core';
import { Button, Card, Chip, IconButton, TextField, cn } from '@nebula-clock/ui';
import { useDataStore } from '../store/dataStore.js';

/** Create, recolour and delete the tags that group tasks into projects. */
export function TagManager() {
  const { t } = useTranslation(['tasks', 'common']);
  const tags = useDataStore((state) => state.tags);
  const addTag = useDataStore((state) => state.addTag);
  const editTag = useDataStore((state) => state.editTag);
  const removeTag = useDataStore((state) => state.removeTag);

  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(TAG_COLORS[0]);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    void addTag(trimmed, color);
    setName('');
  };

  return (
    <Card title={t('tasks:tags.title')}>
      <div className="flex flex-wrap items-end gap-2">
        <TextField
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && submit()}
          placeholder={t('tasks:tags.namePlaceholder')}
          aria-label={t('tasks:tags.namePlaceholder')}
          wrapperClassName="flex-1 min-w-[10rem]"
        />
        <Button
          variant="primary"
          size="sm"
          icon={<Plus size={14} />}
          onClick={submit}
          className="mb-1"
        >
          {t('tasks:tags.add')}
        </Button>
      </div>

      <fieldset className="mt-2">
        <legend className="mb-1.5 text-xs font-medium text-text-secondary">
          {t('tasks:tags.color')}
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {TAG_COLORS.map((candidate) => (
            <button
              key={candidate}
              type="button"
              aria-label={t('tasks:tags.colorAria', { color: candidate })}
              aria-pressed={candidate === color}
              onClick={() => setColor(candidate)}
              style={{ backgroundColor: candidate }}
              className={cn(
                'h-6 w-6 rounded-pill transition-transform duration-fast ease-nebula',
                candidate === color ? 'scale-110 ring-2 ring-text' : 'hover:scale-105',
              )}
            />
          ))}
        </div>
      </fieldset>

      {tags.length > 0 ? (
        <ul className="mt-4 space-y-1.5 border-t border-border pt-3">
          {tags.map((tag) => (
            <li key={tag.id} className="flex items-center gap-2">
              <Chip color={tag.color}>{tag.name}</Chip>
              <input
                type="color"
                value={tag.color}
                aria-label={`${tag.name} — ${t('tasks:tags.color')}`}
                onChange={(event) => void editTag(tag.id, { color: event.target.value })}
                className="h-6 w-8 cursor-pointer rounded border border-border bg-transparent"
              />
              <IconButton
                label={t('common:actions.delete')}
                icon={<Trash2 size={14} />}
                size="sm"
                className="ml-auto"
                onClick={() => void removeTag(tag.id)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-text-secondary">{t('tasks:tags.empty')}</p>
      )}
    </Card>
  );
}
