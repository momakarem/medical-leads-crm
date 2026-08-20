import { useI18n } from '../i18n/I18nContext';

const pageSizes = [5, 20, 50, 100];

interface PaginationControlsProps {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

export function PaginationControls({
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onLimitChange,
}: PaginationControlsProps) {
  const { language, t } = useI18n();
  const safeTotalPages = Math.max(totalPages, 1);

  return (
    <div className="pagination" aria-label="Pagination controls">
      <div className="pagination__summary">
        {language === 'ar' ? `صفحة ${page} من ${safeTotalPages} · ${total} عميل` : `Page ${page} of ${safeTotalPages} · ${total} leads`}
      </div>

      <div className="pagination__actions">
        <label className="field field--inline">
          <span>{t('pagination.rows')}</span>
          <select value={limit} onChange={(event) => onLimitChange(Number(event.target.value))}>
            {pageSizes.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </label>

        <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          {t('pagination.previous')}
        </button>
        <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          {t('pagination.next')}
        </button>
      </div>
    </div>
  );
}