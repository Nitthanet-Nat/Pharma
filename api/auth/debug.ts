type VercelRequest = {
  method?: string;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string | string[]) => void;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const databaseUrl = process.env.DATABASE_URL || '';
  const env = {
    hasDatabaseUrl: Boolean(databaseUrl),
    databaseProtocol: databaseUrl.split(':', 1)[0] || null,
    databaseHost: (() => {
      try {
        return databaseUrl ? new URL(databaseUrl).host : null;
      } catch {
        return 'invalid-url';
      }
    })(),
    hasAuthSecret: Boolean(process.env.AUTH_SECRET),
    hasAdminEmail: Boolean(process.env.ADMIN_EMAIL),
    hasAdminPassword: Boolean(process.env.ADMIN_PASSWORD),
  };

  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'User'
        AND column_name IN ('id', 'email', 'passwordHash', 'role')
      ORDER BY column_name
    `;

    const migrations = await prisma.$queryRaw<Array<{ migration_name: string; finished_at: Date | null }>>`
      SELECT migration_name, finished_at
      FROM "_prisma_migrations"
      ORDER BY finished_at DESC NULLS LAST
      LIMIT 5
    `.catch(() => []);

    res.status(200).json({
      ok: true,
      env,
      userTableColumns: columns.map((column) => column.column_name),
      hasAuthColumns: columns.some((column) => column.column_name === 'passwordHash') &&
        columns.some((column) => column.column_name === 'role'),
      recentMigrations: migrations,
    });
    await prisma.$disconnect().catch(() => undefined);
  } catch (error) {
    res.status(500).json({
      ok: false,
      env,
      error: error instanceof Error ? error.message : 'Unknown auth debug error',
    });
  }
}
