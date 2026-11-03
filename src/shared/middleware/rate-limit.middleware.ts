import { NextFunction, Request, Response } from 'express';

import { AppError } from '../errors/app-error';

interface RateLimitOptions {
  /** Ventana de tiempo en milisegundos. */
  windowMs: number;
  /** Solicitudes permitidas por clave dentro de la ventana. */
  max: number;
  /** Clave por la que se cuenta: por defecto el usuario autenticado o, si no hay, la IP. */
  key?: (req: Request) => string;
}

/**
 * Límite simple de solicitudes por ventana fija, en memoria. Suficiente para una sola
 * instancia (Render free); con varias instancias habría que llevar el conteo a Redis.
 * Protege rutas con costo o abuso posible: chat (Azure), auth y reenvío de invitaciones.
 */
export const rateLimit = ({ windowMs, max, key }: RateLimitOptions) => {
  const hits = new Map<string, { count: number; resetAt: number }>();

  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
  }, windowMs);
  sweep.unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    const id = key ? key(req) : req.uid || req.ip || 'unknown';
    const now = Date.now();
    let entry = hits.get(id);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(id, entry);
    }
    entry.count += 1;

    if (entry.count > max) {
      res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000).toString());
      return next(new AppError('Too many requests, try again later', 429, 'RATE_LIMITED'));
    }
    next();
  };
};

const MINUTE = 60_000;

/** Login, registro y recuperación de contraseña: por IP. */
export const authRateLimit = rateLimit({ windowMs: 15 * MINUTE, max: 20, key: (req) => req.ip || 'unknown' });
/** Mensajes al asistente (cada uno consulta Azure CLU): por usuario. */
export const chatRateLimit = rateLimit({ windowMs: MINUTE, max: 20 });
/** Reenvío de invitaciones (cada uno manda un push): por usuario. */
export const resendRateLimit = rateLimit({ windowMs: 10 * MINUTE, max: 10 });
