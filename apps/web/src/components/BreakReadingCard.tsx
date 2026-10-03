import { useTranslation } from 'react-i18next';
import { Button, Card, Icon } from '@nebula-clock/ui';
import type { BreakReadingState } from '../hooks/useBreakReading.js';

export interface BreakReadingCardProps {
  state: BreakReadingState;
  onOpen: () => void;
}

/** "Read during your break": Nebula News' personal growth theme, as plain text. */
export function BreakReadingCard({ state, onOpen }: BreakReadingCardProps) {
  const { t } = useTranslation(['timer']);
  if (state.status === 'hidden') return null;

  return (
    <Card
      className="break-reading"
      eyebrow={t('timer:breakReading.eyebrow')}
      title={t('timer:breakReading.title')}
      description={state.status === 'ready' ? state.reading.caption : undefined}
      aria-busy={state.status === 'loading'}
    >
      {state.status === 'loading' ? (
        <p className="panel-empty" role="status">
          <Icon name="refresh" size={16} />
          {t('timer:breakReading.loading')}
        </p>
      ) : (
        <>
          <ul className="break-reading-list">
            {state.reading.items.map((item) => (
              <li key={`${item.label}-${item.value}`} className="break-reading-item">
                <span className="break-reading-label">{item.label}</span>
                <span className="break-reading-source">{item.value}</span>
              </li>
            ))}
          </ul>
          <Button variant="ghost" size="sm" icon="external" onClick={onOpen}>
            {t('timer:breakReading.open')}
          </Button>
        </>
      )}
    </Card>
  );
}
