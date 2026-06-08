// Tipli fetch sarmalayici. CONVENTIONS.md zarfini cozer:
//   basari -> { ok:true, data }   ->  data dondurulur
//   hata   -> { ok:false, error } ->  ApiError firlatilir
//
// Taban yol VITE_API_BASE ?? '/api'. Cerez tabanli oturum icin credentials:'include'.

import type { ApiEnvelope } from '@/types/api';
import { tr } from '@/i18n/tr';

const API_BASE = (import.meta.env.VITE_API_BASE ?? '/api').replace(/\/$/, '');

/** Sunucudan donen yapilandirilmis hata. UI bunu yakalayip Turkce gosterebilir. */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

/** HTTP durum kodundan makul bir Turkce yedek mesaj uretir. */
function fallbackMessage(status: number): string {
  switch (status) {
    case 401:
      return tr.errors.unauthorized;
    case 403:
      return tr.errors.forbidden;
    case 404:
      return tr.errors.notFound;
    case 409:
      return tr.errors.conflict;
    case 422:
      return tr.errors.validation;
    case 500:
    case 502:
    case 503:
      return tr.errors.server;
    default:
      return tr.errors.generic;
  }
}

interface RequestOptions {
  /** Sorgu dizesi parametreleri (undefined/null degerler atlanir). */
  params?: Record<string, string | number | boolean | undefined | null>;
  /** AbortController sinyali (react-query iptali icin). */
  signal?: AbortSignal;
  /** Ek/ozel basliklar. */
  headers?: Record<string, string>;
}

function buildUrl(path: string, params?: RequestOptions['params']): string {
  const base = path.startsWith('http')
    ? path
    : `${API_BASE}/${path.replace(/^\//, '')}`;
  if (!params) return base;

  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    usp.append(key, String(value));
  }
  const qs = usp.toString();
  return qs ? `${base}?${qs}` : base;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const isFormData = body instanceof FormData;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(body !== undefined && !isFormData
      ? { 'Content-Type': 'application/json' }
      : {}),
    ...options.headers,
  };

  let res: Response;
  try {
    res = await fetch(buildUrl(path, options.params), {
      method,
      credentials: 'include',
      headers,
      signal: options.signal,
      body:
        body === undefined
          ? undefined
          : isFormData
            ? (body as FormData)
            : JSON.stringify(body),
    });
  } catch (err) {
    // Iptal edilmis istekleri yutmadan tekrar firlat (react-query yonetir).
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError('network', tr.errors.network, 0);
  }

  // Govdesiz yanit (ornek: 204) -> bos veri.
  if (res.status === 204) {
    return undefined as T;
  }

  let payload: ApiEnvelope<T> | null = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text) as ApiEnvelope<T>;
    } catch {
      payload = null;
    }
  }

  if (payload && typeof payload === 'object' && 'ok' in payload) {
    if (payload.ok) {
      return payload.data;
    }
    throw new ApiError(
      payload.error?.code ?? 'error',
      payload.error?.message ?? fallbackMessage(res.status),
      res.status,
    );
  }

  // Zarf yoksa ama HTTP basariliysa govdeyi oldugu gibi dondur.
  if (res.ok) {
    return (payload as unknown as T) ?? (undefined as T);
  }

  throw new ApiError('http_error', fallbackMessage(res.status), res.status);
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>('GET', path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('POST', path, body, options),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PATCH', path, body, options),
  del: <T>(path: string, options?: RequestOptions) =>
    request<T>('DELETE', path, undefined, options),
};

/**
 * Yuklenen dosyanin (TaskAttachment.file_path) tarayicidan erisilebilir tam
 * URL'sini uretir. Sunucu goreli yol dondurur (ornek: "uploads/abc.jpg");
 * web bunu API tabani altinda "/api/uploads/abc.jpg" olarak gosterir.
 */
export function fileUrl(filePath: string): string {
  if (/^https?:\/\//.test(filePath)) return filePath;
  return `${API_BASE}/${filePath.replace(/^\//, '')}`;
}

export { API_BASE };
