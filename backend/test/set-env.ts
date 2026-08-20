process.env.NODE_ENV = 'test';
process.env.PORT ??= '3000';
process.env.DATABASE_URL = 'postgresql://medical_crm:medical_crm@localhost:5432/medical_crm_test?schema=public';
process.env.JWT_SECRET ??= 'test-secret-at-least-32-characters-long';
process.env.JWT_EXPIRES_IN ??= '3600';
process.env.AUTH_COOKIE_NAME ??= 'medical_crm_access';
process.env.COOKIE_SECURE ??= 'false';
process.env.CORS_ORIGIN ??= '';
