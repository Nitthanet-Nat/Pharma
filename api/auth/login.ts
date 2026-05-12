import { createSessionCookie, hashPassword, verifyPassword } from '../../lib/auth';

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

const publicUser = (user: { id: string; username?: string | null; email: string | null; name: string | null; role: string }) => ({
  id: user.id,
  username: user.username,
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
    const identifier = (getString(body.identifier) || getString(body.username) || getString(body.email)).toLowerCase();
    const password = getString(body.password);

    if (!identifier || !password) {
      res.status(400).json({ error: 'Username/email and password are required' });
      return;
    }

    const email = identifier.includes('@') ? identifier : '';
    const username = identifier.includes('@') ? '' : identifier;
    const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const adminUsername = (process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || '';
    const { prisma } = await import('../../lib/prisma');

    if (adminPassword && password === adminPassword && (identifier === adminEmail || identifier === adminUsername)) {
      const admin = await prisma.user.upsert({
        where: { email: adminEmail || 'admin@gmail.com' },
        update: { username: adminUsername, name: 'Admin', role: 'ADMIN', passwordHash: hashPassword(password) },
        create: {
          username: adminUsername,
          email: adminEmail || 'admin@gmail.com',
          name: 'Admin',
          role: 'ADMIN',
          passwordHash: hashPassword(password),
        },
        select: { id: true, username: true, email: true, name: true, role: true },
      });
      res.setHeader('Set-Cookie', createSessionCookie(admin));
      res.status(200).json({ user: publicUser(admin) });
      return;
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          email ? { email } : undefined,
          username ? { username } : undefined,
        ].filter(Boolean) as Array<{ email?: string; username?: string }>,
      },
      select: { id: true, username: true, email: true, name: true, role: true, passwordHash: true },
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
