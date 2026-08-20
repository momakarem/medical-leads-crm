export interface TokenPayload {
  sub: string;
}

export const TOKEN_SERVICE = Symbol('TOKEN_SERVICE');

export interface TokenService {
  sign(payload: TokenPayload): Promise<string>;
}
