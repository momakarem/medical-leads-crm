export interface TiktokConnectionEntity {
  id: string;
  advertiserId: string;
  advertiserName: string;
  formId: string;
  formName: string;
  tokenExpiresAt: Date | null;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TiktokAdvertiserOption {
  id: string;
  name: string;
}

export interface TiktokLeadFormOption {
  id: string;
  name: string;
}
