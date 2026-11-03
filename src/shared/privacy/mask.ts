/**
 * Enmascara correos antes de escribirlos en logs: `juan.perez@upc.edu.pe` → `ju***@upc.edu.pe`.
 * Así los logs permiten depurar sin guardar el correo completo de nadie.
 */
export const maskEmail = (email: string): string => {
  const [user, domain] = email.split('@');
  if (!domain) return '***';
  return `${user.slice(0, 2)}***@${domain}`;
};

const EMAIL_RE = /[A-Za-z0-9._%+-]+(?:@|%40)[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

/** Enmascara todos los correos de un texto (también los codificados en una URL como `%40`). */
export const maskEmailsIn = (text: string): string =>
  text.replace(EMAIL_RE, (m) => maskEmail(decodeURIComponent(m)));
