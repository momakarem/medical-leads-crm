import { useI18n } from '../i18n/I18nContext';
import type { LeadActivity } from '../types';

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

interface ActivityTimelineProps {
  activities: LeadActivity[];
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  const { t } = useI18n();

  if (activities.length === 0) {
    return <div className="empty-state">{t('No activities found.')}</div>;
  }

  return (
    <div className="timeline">
      {activities.map((activity) => (
        <article className="timeline-item" key={activity.id}>
          <div className="timeline-item__dot" aria-hidden="true" />
          <div className="timeline-item__body">
            <div className="timeline-item__meta">
              <span>{activity.user.name}</span>
              <time dateTime={activity.createdAt}>{formatDate(activity.createdAt)}</time>
            </div>
            <h2>{t(`activity.${activity.type}.title`, activity.title)}</h2>
            <p>{activity.description}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
