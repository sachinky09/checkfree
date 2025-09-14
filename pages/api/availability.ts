import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import clientPromise from '../../lib/mongodb';
import { getFreeBusy, refreshAccessToken } from '../../lib/googleCalendar';
import { decryptToken } from '../../lib/encryption';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.email) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { sellerId, date } = req.query;

  if (!sellerId || !date) {
    return res.status(400).json({ message: 'Missing sellerId or date' });
  }

  try {
    const client = await clientPromise;
    const db = client.db('checkfree');
    const users = db.collection('users');

    const seller = await users.findOne({ _id: new (require('mongodb')).ObjectId(sellerId as string) });

    if (!seller || seller.role !== 'seller') {
      return res.status(404).json({ message: 'Seller not found' });
    }

    const refreshToken = decryptToken(seller.refreshToken);
    const accessToken = await refreshAccessToken(refreshToken);

    // IST offset
    const IST_OFFSET = 5.5 * 60 * 60 * 1000; // 5 hours 30 mins

    // Generate slots in IST (9AM - 9PM IST)
    const selectedDate = new Date(date as string);
    const istStart = new Date(selectedDate);
    istStart.setHours(9, 0, 0, 0);
    const istEnd = new Date(selectedDate);
    istEnd.setHours(21, 0, 0, 0);

    // Convert IST to UTC for Google Calendar
    const timeMinUTC = new Date(istStart.getTime() - IST_OFFSET).toISOString();
    const timeMaxUTC = new Date(istEnd.getTime() - IST_OFFSET).toISOString();

    const freeBusyData = await getFreeBusy(accessToken, seller.email, timeMinUTC, timeMaxUTC);
    const busyTimes = freeBusyData.calendars[seller.email]?.busy || [];

    const slots = [];
    const current = new Date(istStart);

    while (current < istEnd) {
      const slotStart = new Date(current);
      const slotEnd = new Date(current.getTime() + 30 * 60 * 1000);

      const isSlotBusy = busyTimes.some(busy => {
        // Convert busy times to IST for comparison
        const busyStart = busy.start.includes('T') ? new Date(busy.start).getTime() + IST_OFFSET : new Date(busy.start + 'T00:00:00').getTime();
        const busyEnd = busy.end.includes('T') ? new Date(busy.end).getTime() + IST_OFFSET : new Date(busy.end + 'T00:00:00').getTime();
        return slotStart.getTime() < busyEnd && slotEnd.getTime() > busyStart;
      });

      slots.push({
        start: slotStart.toISOString(),
        end: slotEnd.toISOString(),
        available: !isSlotBusy
      });

      current.setTime(current.getTime() + 30 * 60 * 1000);
    }

    res.status(200).json({ slots });
  } catch (error) {
    console.error('Availability fetch error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
