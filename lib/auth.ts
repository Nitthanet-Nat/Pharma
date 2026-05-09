import crypto from 'crypto';
import { prisma } from './prisma';

type RequestLike = {
  headers?: Record<string, string | string[] | undefined>;
};

type ResponseLike = {
  setHeader: (name: string, value: string | string[]) => void;
};

const SESSION_COOKIE = 'rsu_pharma_session';
const DAY_SECONDS = 24 * 60 * 60;

const getAuthSecret = () => process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD || 'dev-only-change-me';
const shouldUseSecureCookie = () => process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);

const base64Url = (value: string | Buffer) =>
  Buffer.from(value).toString('base64url');

const sign = (payload: string) =>
  crypto.createHmac('sha256', getAuthSecret()).update(payload).digest('base64url');

const timingSafeEqual = (a: string, b: string) => {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  return aBuffer.length === bBuffer.length && crypto.timingSafeEqual(aBuffer, bBuffer);
};

export const hashPassword = (password: string) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex');
  return `pbkdf2_sha256$120000$${salt}$${hash}`;
};

export const verifyPassword = (password: string, storedHash?: string | null) => {
  if (!storedHash) return false;
  const [scheme, iterationsValue, salt, hash] = storedHash.split('$');
  if (scheme !== 'pbkdf2_sha256' || !iterationsValue || !salt || !hash) return false;
  const iterations = Number(iterationsValue);
  if (!Number.isFinite(iterations)) return false;
  const candidate = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('hex');
  return timingSafeEqual(candidate, hash);
};

export const createSessionCookie = (user: { id: string; role: string }) => {
  const payload = base64Url(
    JSON.stringify({
      sub: user.id,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + DAY_SECONDS * 7,
    })
  );
  const secure = shouldUseSecureCookie() ? '; Secure' : '';
  return `${SESSION_COOKIE}=${payload}.${sign(payload)}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=${DAY_SECONDS * 7}`;
};

export const clearSessionCookie = () => {
  const secure = shouldUseSecureCookie() ? '; Secure' : '';
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=0`;
};

const getCookie = (req: RequestLike, name: string) => {
  const rawCookie = req.headers?.cookie;
  const cookie = Array.isArray(rawCookie) ? rawCookie.join('; ') : rawCookie || '';
  return cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
};

export const getSessionUser = async (req: RequestLike) => {
  const cookie = getCookie(req, SESSION_COOKIE);
  if (!cookie) return null;
  const [payload, signature] = cookie.split('.');
  if (!payload || !signature || !timingSafeEqual(signature, sign(payload))) return null;

  const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
    sub?: string;
    exp?: number;
  };
  if (!session.sub || !session.exp || session.exp < Math.floor(Date.now() / 1000)) return null;

  return prisma.user.findUnique({
    where: { id: session.sub },
    select: { id: true, email: true, name: true, role: true, activePatientPersonaId: true },
  });
};

export const requireUser = async (req: RequestLike, res: ResponseLike) => {
  const user = await getSessionUser(req);
  if (!user) {
    res.setHeader('Set-Cookie', clearSessionCookie());
    throw Object.assign(new Error('Unauthorized'), { statusCode: 401 });
  }
  return user;
};

export const requireAdmin = async (req: RequestLike, res: ResponseLike) => {
  const user = await requireUser(req, res);
  if (user.role !== 'ADMIN') {
    throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
  }
  return user;
};

export const sendAuthError = (error: unknown, res: { status: (code: number) => { json: (body: unknown) => void } }) => {
  const statusCode =
    error && typeof error === 'object' && 'statusCode' in error && typeof error.statusCode === 'number'
      ? error.statusCode
      : 500;
  const message = error instanceof Error ? error.message : 'Auth error';
  res.status(statusCode).json({ error: message });
};
