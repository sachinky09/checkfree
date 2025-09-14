import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import clientPromise from '../../lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user?.email) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const client = await clientPromise;
    const db = client.db('checkfree');
    const users = db.collection('users');

    const sellers = await users.find(
      { role: 'seller' },
      { projection: { _id: 1, name: 1, email: 1, image: 1 } }
    ).toArray();

    res.status(200).json(sellers);
  } catch (error) {
    console.error('Sellers fetch error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}