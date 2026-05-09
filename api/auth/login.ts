import { createSessionCookie, hashPassword, verifyPassword } from '../../lib/auth';
import { prisma } from '../../lib/prisma';

type VercelRequest = {
  method?: string;
  body?: Record<string, unknown> | string;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string | string[]) => void;
};

const parseBody = (body: VercelRequest['body']) =>
  typeof body === 'string' ? (JSON.parse(body) as Record<string, unknown>) : body || {};
const getString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const publicUser = (user: { id: string; email: string | null; name: string | null; role: string }) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
});
const authError = (error: unknown) => {
  console.error('Auth login failed', error);
  if (error instanceof Error && /column|passwordHash|role|does not exist|Unknown arg/i.test(error.message)) {
    return 'Database auth columns are missing. Run Prisma migration on Neon first.';
  }
  if (error instanceof Error && /datasource|DATABASE_URL|protocol|connect|Can't reach|P1001|P1012/i.test(error.message)) {
    return 'Database connection failed. Check DATABASE_URL in Vercel.';
  }
  return error instanceof Error ? error.message : 'Login failed';
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    const body = parseBody(req.body);
    const email = getString(body.email).toLowerCase();
    const password = getString(body.password);

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || '';

    if (adminEmail && adminPassword && email === adminEmail && password === adminPassword) {
      const admin = await prisma.user.upsert({
        where: { email },
        update: { name: 'Admin', role: 'ADMIN', passwordHash: hashPassword(password) },
        create: { email, name: 'Admin', role: 'ADMIN', passwordHash: hashPassword(password) },
        select: { id: true, email: true, name: true, role: true },
      });
      res.setHeader('Set-Cookie', createSessionCookie(admin));
      res.status(200).json({ user: publicUser(admin) });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, role: true, passwordHash: true },
    });

    if (!user || !verifyPassword(password, user.passwordHash)) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    res.setHeader('Set-Cookie', createSessionCookie(user));
    res.status(200).json({ user: publicUser(user) });
  } catch (error) {
    res.status(500).json({ error: authError(error) });
  }
}
