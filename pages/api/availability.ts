import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import clientPromise from '../../lib/mongodb';
import { getFreeBusy, refreshAccessToken } from '../../lib/googleCalendar';
import { decryptToken } from '../../lib/encryption';
import { DateTime } from 'luxon';

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

    const seller = await users.findOne({
      _id: new (require('mongodb')).ObjectId(sellerId as string),
    });

    if (!seller || seller.role !== 'seller') {
      return res.status(404).json({ message: 'Seller not found' });
    }

    const refreshToken = decryptToken(seller.refreshToken);
    const accessToken = await refreshAccessToken(refreshToken);

    // Parse selected date in IST
    const selectedDate = DateTime.fromISO(date as string, { zone: 'Asia/Kolkata' });

    // Working hours in IST (9 AM – 9 PM)
    const istStart = selectedDate.set({ hour: 9, minute: 0, second: 0, millisecond: 0 });
    const istEnd = selectedDate.set({ hour: 21, minute: 0, second: 0, millisecond: 0 });

    // Convert IST → UTC for Google Calendar API
    // Convert IST → UTC for Google Calendar API
    const timeMinUTC = istStart.toUTC().toISO()!;
    const timeMaxUTC = istEnd.toUTC().toISO()!;


    const freeBusyData = await getFreeBusy(
      accessToken,
      seller.email,
      timeMinUTC,
      timeMaxUTC
    );

    const busyTimes = freeBusyData.calendars[seller.email]?.busy || [];

    const slots = [];
    let current = istStart;

    while (current < istEnd) {
      const slotStart = current;
      const slotEnd = current.plus({ minutes: 30 });

      // Busy times from Google are in UTC, so convert them to millis for comparison
      const isSlotBusy = busyTimes.some((busy) => {
        const busyStart = DateTime.fromISO(busy.start, { zone: 'utc' }).toMillis();
        const busyEnd = DateTime.fromISO(busy.end, { zone: 'utc' }).toMillis();
        return slotStart.toMillis() < busyEnd && slotEnd.toMillis() > busyStart;
      });

      slots.push({
        start: slotStart.toISO(), // 👉 This will be in IST (+05:30 offset)
        end: slotEnd.toISO(),
        available: !isSlotBusy,
      });

      current = slotEnd;
    }

    res.status(200).json({ slots });
  } catch (error) {
    console.error('Availability fetch error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
