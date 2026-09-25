/**
 * Helper to convert local phone numbers into virtual Firebase email accounts.
 * E.g. 0772123456 or +263 77 212 3456 -> 0772123456@comforthousing.zw
 */
export function phoneToVirtualEmail(phoneInput: string): string {
  let digits = phoneInput.replace(/\D/g, '');
  if (digits.startsWith('263') && digits.length >= 12) {
    digits = '0' + digits.substring(3);
  }
  return `${digits}@comforthousing.zw`;
}

export function isVirtualPhoneEmail(email: string): boolean {
  return email.toLowerCase().endsWith('@comforthousing.zw');
}

export function extractPhoneFromVirtualEmail(email: string): string {
  if (isVirtualPhoneEmail(email)) {
    return email.split('@')[0];
  }
  return email;
}
