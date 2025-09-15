import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import clientPromise from '../../lib/mongodb';
import { createCalendarEvent, getCalendarEvents, refreshAccessToken } from '../../lib/googleCalendar';
import { decryptToken } from '../../lib/encryption';
import { ObjectId } from 'mongodb';
import { DateTime } from 'luxon';

interface SessionUser {
  email: string;
}

interface Session {
  user: SessionUser;
}

interface CalendarEvent {
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  attendees?: { email: string; responseStatus: string }[];
}

interface GoogleEvent {
  id: string;
  summary?: string;
  description?: string;
  start?: { dateTime?: string };
  end?: { dateTime?: string };
  attendees?: { email: string; responseStatus?: string }[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (await getServerSession(req, res, authOptions)) as Session | null;

  if (!session?.user?.email) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method === 'POST') {
    return handleCreateAppointment(req, res, session);
  } else if (req.method === 'GET') {
    return handleGetAppointments(req, res, session);
  } else {
    return res.status(405).json({ message: 'Method not allowed' });
  }
}

async function handleCreateAppointment(req: NextApiRequest, res: NextApiResponse, session: Session) {
  const { sellerId, startTime, endTime, title } = req.body;

  if (!sellerId || !startTime || !endTime || !title) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const client = await clientPromise;
    const db = client.db('checkfree');
    const users = db.collection('users');

    const seller = await users.findOne({ _id: new ObjectId(sellerId) }) as any;
    const buyer = await users.findOne({ email: session.user.email }) as any;

    if (!seller || !buyer) {
      return res.status(404).json({ message: 'User not found' });
    }

    const sellerRefreshToken = decryptToken(seller.refreshToken);
    const buyerRefreshToken = decryptToken(buyer.refreshToken);

    const sellerAccessToken = await refreshAccessToken(sellerRefreshToken);
    const buyerAccessToken = await refreshAccessToken(buyerRefreshToken);

    // ✅ Ensure times are stored and sent in IST
    const startIST = DateTime.fromISO(startTime, { zone: 'Asia/Kolkata' }).toISO();
    const endIST = DateTime.fromISO(endTime, { zone: 'Asia/Kolkata' }).toISO();

    if (!startIST || !endIST) {
      return res.status(400).json({ message: 'Invalid date format' });
    }

    const eventData: CalendarEvent = {
      summary: title,
      description: 'Scheduled via CheckFree',
      start: { dateTime: startIST, timeZone: 'Asia/Kolkata' },
      end: { dateTime: endIST, timeZone: 'Asia/Kolkata' },
      attendees: [
        { email: seller.email, responseStatus: 'needsAction' },
        { email: buyer.email, responseStatus: 'needsAction' }
      ],
    };

    const sellerEvent = await createCalendarEvent(sellerAccessToken, eventData);
    await createCalendarEvent(buyerAccessToken, eventData);

    const appointments = db.collection('appointments');
    await appointments.insertOne({
      sellerId: seller._id,
      buyerId: buyer._id,
      title,
      startTime: startIST, // 👉 Stored as IST ISO string
      endTime: endIST,
      googleEventId: sellerEvent.id,
      createdAt: new Date(),
    });

    res.status(200).json({ message: 'Appointment created successfully', event: sellerEvent });
  } catch (error) {
    console.error('Appointment creation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

async function handleGetAppointments(req: NextApiRequest, res: NextApiResponse, session: Session) {
  try {
    const client = await clientPromise;
    const db = client.db('checkfree');
    const users = db.collection('users');

    const user = await users.findOne({ email: session.user.email }) as any;

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const refreshToken = decryptToken(user.refreshToken);
    const accessToken = await refreshAccessToken(refreshToken);

    const now = DateTime.now().setZone('Asia/Kolkata');
    const timeMin = now.toUTC().toISO()!;
    const timeMax = now.plus({ days: 30 }).toUTC().toISO()!;

    const events: GoogleEvent[] = await getCalendarEvents(accessToken, timeMin, timeMax);

    // ✅ Convert everything to IST before sending to frontend
    const appointments = events
      .filter(event => event.description?.includes('Scheduled via CheckFree'))
      .map(event => ({
        ...event,
        start: {
          dateTime: event.start?.dateTime
            ? DateTime.fromISO(event.start.dateTime, { zone: 'utc' })
                .setZone('Asia/Kolkata')
                .toISO()
            : null,
        },
        end: {
          dateTime: event.end?.dateTime
            ? DateTime.fromISO(event.end.dateTime, { zone: 'utc' })
                .setZone('Asia/Kolkata')
                .toISO()
            : null,
        },
      }));

    res.status(200).json({ appointments });
  } catch (error) {
    console.error('Appointments fetch error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
