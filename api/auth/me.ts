import { getSessionUser } from '../../lib/auth';

type VercelRequest = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string | string[]) => void;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    const user = await getSessionUser(req);
    res.status(200).json({ user });
  } catch (error) {
    console.error('Auth me failed', error);
    res.status(200).json({ user: null });
  }
}
