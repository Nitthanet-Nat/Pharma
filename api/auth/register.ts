import { createSessionCookie, hashPassword } from '../../lib/auth';
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
const authError = (error: unknown) => {
  console.error('Auth register failed', error);
  if (error instanceof Error && /column|passwordHash|role|does not exist|Unknown arg/i.test(error.message)) {
    return 'Database auth columns are missing. Run Prisma migration on Neon first.';
  }
  if (error instanceof Error && /datasource|DATABASE_URL|protocol|connect|Can't reach|P1001|P1012/i.test(error.message)) {
    return 'Database connection failed. Check DATABASE_URL in Vercel.';
  }
  return error instanceof Error ? error.message : 'Registration failed';
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
    const name = getString(body.name);
    const password = getString(body.password);

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      res.status(409).json({ error: 'This email is already registered' });
      return;
    }

    const user = await prisma.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        role: 'USER',
        passwordHash: hashPassword(password),
      },
      select: { id: true, email: true, name: true, role: true },
    });

    res.setHeader('Set-Cookie', createSessionCookie(user));
    res.status(201).json({ user });
  } catch (error) {
    res.status(500).json({ error: authError(error) });
  }
}
