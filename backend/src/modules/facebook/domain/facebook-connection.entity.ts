export interface FacebookConnectionEntity {
  id: string;
  pageId: string;
  pageName: string;
  formId: string;
  formName: string;
  tokenExpiresAt: Date | null;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FacebookPageOption {
  id: string;
  name: string;
}

export interface FacebookLeadFormOption {
  id: string;
  name: string;
}
