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

    // Get seller's refresh token
    const refreshToken = decryptToken(seller.refreshToken);
    const accessToken = await refreshAccessToken(refreshToken);

    // Generate time slots for the day (9 AM to 9 PM)
    const selectedDate = new Date(date as string);
    const timeMin = new Date(selectedDate);
    timeMin.setHours(9, 0, 0, 0);
    const timeMax = new Date(selectedDate);
    timeMax.setHours(21, 0, 0, 0);

    // Get busy times from Google Calendar
    const freeBusyData = await getFreeBusy(
      accessToken,
      seller.email,
      timeMin.toISOString(),
      timeMax.toISOString()
    );

    const busyTimes = freeBusyData.calendars[seller.email]?.busy || [];

    // Generate 30-minute slots
    const slots = [];
    const current = new Date(timeMin);

    while (current < timeMax) {
      const slotStart = new Date(current);
      const slotEnd = new Date(current.getTime() + 30 * 60 * 1000);

      // Check if this slot overlaps with any busy time
      const isSlotBusy = busyTimes.some(busy => {
        const busyStart = new Date(busy.start);
        const busyEnd = new Date(busy.end);
        return slotStart < busyEnd && slotEnd > busyStart;
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