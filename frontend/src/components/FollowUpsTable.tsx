import type { FollowUp, FollowUpStatus } from '../types';
import { useI18n } from '../i18n/I18nContext';

const statusLabels: Record<FollowUpStatus, string> = {
  pending: 'Pending',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function formatDate(value: string, language: 'en' | 'ar'): string {
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short', day: '2-digit' }).format(new Date(value));
}

function isOverdue(followUp: FollowUp): boolean {
  return followUp.status === 'pending' && new Date(followUp.scheduledAt).getTime() < Date.now();
}

interface FollowUpsTableProps {
  followUps: FollowUp[];
}

export function FollowUpsTable({ followUps }: FollowUpsTableProps) {
  const { t, language } = useI18n();
  if (followUps.length === 0) {
    return <div className="empty-state">{t('No follow-ups found.')}</div>;
  }

  return (
    <div className="table-wrap">
      <table className="leads-table">
        <thead>
          <tr>
            <th>{t('Lead Name')}</th>
            <th>{t('Phone')}</th>
            <th>{t('Scheduled Date')}</th>
            <th>{t('Scheduled Time')}</th>
            <th>{t('Status')}</th>
            <th>{t('Assigned Agent')}</th>
          </tr>
        </thead>
        <tbody>
          {followUps.map((followUp) => {
            const overdue = isOverdue(followUp);
            return (
              <tr key={followUp.id} className={overdue ? 'overdue-row' : undefined}>
                <td>{followUp.lead ? <a className="table-link" href={`/leads/${followUp.lead.id}`}>{followUp.lead.name}</a> : '-'}</td>
                <td className="mono">{followUp.lead?.phone ?? '-'}</td>
                <td>{formatDate(followUp.scheduledAt, language)}</td>
                <td className="mono">{followUp.scheduledTime}</td>
                <td><span className={overdue ? 'status-pill danger-pill' : 'status-pill'}>{t(overdue ? 'Overdue' : statusLabels[followUp.status])}</span></td>
                <td>{followUp.user?.name ?? '-'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
