import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Icon, TextField } from '@nebula-clock/ui';

/**
 * The Nebula family's save key (Nebula Hub ADR-040), desktop only: the JSON backups are sealed
 * with it. The recovery key opens them on another computer, so it is shown only on request;
 * another computer's key can be added so its backups open here too.
 */
export function SaveKeyPanel({
  onReveal,
  onAdd,
}: {
  onReveal: () => Promise<string | null>;
  onAdd: (code: string) => Promise<boolean>;
}) {
  const { t } = useTranslation('settings');
  const [code, setCode] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'added' | 'invalid'>('idle');

  const reveal = async () => {
    setCode(code ? null : await onReveal().catch(() => null));
  };
  const add = async () => {
    const added = await onAdd(input).catch(() => false);
    setStatus(added ? 'added' : 'invalid');
    if (added) setInput('');
  };

  return (
    <div className="save-key">
      <h3 className="save-key-title">
        <Icon name="shield" size={14} />
        {t('data.saveKey.title')}
      </h3>
      <p className="settings-copy">{t('data.saveKey.hint')}</p>
      <div className="settings-actions">
        <Button
          size="sm"
          variant="ghost"
          icon={code ? 'eyeOff' : 'eye'}
          aria-expanded={code !== null}
          onClick={() => void reveal()}
        >
          {t(code ? 'data.saveKey.hide' : 'data.saveKey.show')}
        </Button>
      </div>
      {code ? (
        <div className="save-key-code">
          <code>{code}</code>
          <p className="save-key-warning">
            <Icon name="alert" size={14} />
            {t('data.saveKey.warning')}
          </p>
        </div>
      ) : null}
      <div className="settings-actions save-key-import">
        <TextField
          label={t('data.saveKey.import')}
          value={input}
          maxLength={200}
          autoComplete="off"
          spellCheck={false}
          placeholder="XXXXXXXX-XXXXXXXX-…"
          wrapperClassName="save-key-input"
          onChange={(event) => {
            setInput(event.target.value);
            setStatus('idle');
          }}
        />
        <Button
          size="sm"
          variant="ghost"
          icon="plus"
          disabled={!input.trim()}
          onClick={() => void add()}
        >
          {t('data.saveKey.add')}
        </Button>
      </div>
      {status !== 'idle' ? (
        <p className={status === 'added' ? 'settings-copy' : 'save-key-warning'} role="status">
          {t(status === 'added' ? 'data.saveKey.added' : 'data.saveKey.invalid')}
        </p>
      ) : null}
    </div>
  );
}
