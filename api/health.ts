type VercelRequest = {
  method?: string;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string | string[]) => void;
};

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  res.status(200).json({
    ok: true,
    app: 'rsu-pharma',
    authVersion: 'role-auth-v2',
    nodeEnv: process.env.NODE_ENV || null,
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
  });
}
