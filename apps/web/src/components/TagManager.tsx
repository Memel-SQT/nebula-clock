import { useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { TAG_COLORS } from '@nebula-clock/core';
import { Button, Card, Chip, EmptyState, IconButton, TextField, cn } from '@nebula-clock/ui';
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
    void addTag(trimmed.slice(0, 80), color);
    setName('');
  };

  return (
    <Card title={t('tasks:tags.title')} count={tags.length}>
      <div className="tag-form">
        <TextField
          value={name}
          maxLength={80}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && submit()}
          placeholder={t('tasks:tags.namePlaceholder')}
          aria-label={t('tasks:tags.namePlaceholder')}
          wrapperClassName="flex-1"
        />
        {/* Secondary: the screen's primary action is "Add the task". */}
        <Button variant="secondary" icon="plus" onClick={submit}>
          {t('tasks:tags.add')}
        </Button>
      </div>

      <fieldset className="tag-colors">
        <legend className="field-label">{t('tasks:tags.color')}</legend>
        <div className="tag-color-row">
          {TAG_COLORS.map((candidate, index) => (
            <button
              key={candidate}
              type="button"
              aria-label={t('tasks:tags.colorAria', { color: index + 1 })}
              aria-pressed={candidate === color}
              data-sound="toggle"
              onClick={() => setColor(candidate)}
              style={{ '--chip': candidate } as CSSProperties}
              className={cn('tag-color', candidate === color && 'active')}
            />
          ))}
        </div>
      </fieldset>

      {tags.length > 0 ? (
        <ul className="tag-list">
          {tags.map((tag) => (
            <li key={tag.id}>
              <Chip color={tag.color}>{tag.name}</Chip>
              <input
                type="color"
                value={tag.color}
                aria-label={`${tag.name} — ${t('tasks:tags.color')}`}
                onChange={(event) => void editTag(tag.id, { color: event.target.value })}
                className="tag-color-input"
              />
              <IconButton
                label={`${t('common:actions.delete')} : ${tag.name}`}
                icon="trash"
                size="sm"
                sound="none"
                className="ml-auto"
                onClick={() => void removeTag(tag.id)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon="tag" title={t('tasks:tags.empty')} />
      )}
    </Card>
  );
}
