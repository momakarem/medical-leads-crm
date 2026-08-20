import { Injectable } from '@nestjs/common';

@Injectable()
export class PhoneNormalizationService {
  normalize(phone: string): string {
    const trimmed = phone.trim();
    if (!trimmed) return trimmed;
    let digits = trimmed.replace(/[\s\-().]/g, '');
    if (digits.startsWith('00')) digits = `+${digits.slice(2)}`;
    if (digits.startsWith('+')) return `+${digits.slice(1).replace(/\D/g, '')}`;
    digits = digits.replace(/\D/g, '');
    if (digits.startsWith('971')) return `+${digits}`;
    if (digits.startsWith('0')) return `+971${digits.slice(1)}`;
    return `+${digits}`;
  }
}


