export interface SnapchatConnectionEntity {
  id: string;
  organizationId: string | null;
  adAccountId: string;
  adAccountName: string;
  formId: string;
  formName: string;
  tokenExpiresAt: Date | null;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SnapchatAdAccountOption { id: string; name: string; organizationId?: string | null; }
export interface SnapchatLeadFormOption { id: string; name: string; }
