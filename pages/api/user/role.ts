import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import clientPromise from '../../../lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user?.email) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { role } = req.body;

  if (!role || (role !== 'buyer' && role !== 'seller')) {
    return res.status(400).json({ message: 'Invalid role' });
  }

  try {
    const client = await clientPromise;
    const db = client.db('checkfree');
    const users = db.collection('users');

    const result = await users.updateOne(
      { email: session.user.email },
      {
        $set: {
          role,
          updatedAt: new Date(),
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'Role updated successfully', role });
  } catch (error) {
    console.error('Role update error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}