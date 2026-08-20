export class ApplicationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
}

export class InvalidCredentialsError extends ApplicationError {
  constructor() {
    super('INVALID_CREDENTIALS', 'Invalid email or password.');
  }
}

export class InactiveAccountError extends ApplicationError {
  constructor() {
    super('INACTIVE_ACCOUNT', 'Your account is inactive. Please contact the admin.');
  }
}
