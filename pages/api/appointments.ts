import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import clientPromise from '../../lib/mongodb';
import { createCalendarEvent, getCalendarEvents, refreshAccessToken } from '../../lib/googleCalendar';
import { decryptToken } from '../../lib/encryption';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
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

async function handleCreateAppointment(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { sellerId, startTime, endTime, title } = req.body;

  if (!sellerId || !startTime || !endTime || !title) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const client = await clientPromise;
    const db = client.db('checkfree');
    const users = db.collection('users');

    const seller = await users.findOne({ _id: new (require('mongodb')).ObjectId(sellerId) });
    const buyer = await users.findOne({ email: session.user.email });

    if (!seller || !buyer) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get tokens for both users
    const sellerRefreshToken = decryptToken(seller.refreshToken);
    const buyerRefreshToken = decryptToken(buyer.refreshToken);
    
    const sellerAccessToken = await refreshAccessToken(sellerRefreshToken);
    const buyerAccessToken = await refreshAccessToken(buyerRefreshToken);

    // Create calendar event for both users
    const eventData = {
      summary: title,
      description: 'Scheduled via CheckFree',
      start: {
        dateTime: startTime,
        timeZone: 'UTC',
      },
      end: {
        dateTime: endTime,
        timeZone: 'UTC',
      },
      attendees: [
        { email: seller.email },
        { email: buyer.email }
      ],
    };

    // Create event in seller's calendar
    const sellerEvent = await createCalendarEvent(sellerAccessToken, eventData);
    
    // Create event in buyer's calendar
    await createCalendarEvent(buyerAccessToken, eventData);

    // Save appointment to database
    const appointments = db.collection('appointments');
    await appointments.insertOne({
      sellerId: seller._id,
      buyerId: buyer._id,
      title,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      googleEventId: sellerEvent.id,
      createdAt: new Date(),
    });

    res.status(200).json({ message: 'Appointment created successfully', event: sellerEvent });
  } catch (error) {
    console.error('Appointment creation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

async function handleGetAppointments(req: NextApiRequest, res: NextApiResponse, session: any) {
  try {
    const client = await clientPromise;
    const db = client.db('checkfree');
    const users = db.collection('users');

    const user = await users.findOne({ email: session.user.email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const refreshToken = decryptToken(user.refreshToken);
    const accessToken = await refreshAccessToken(refreshToken);

    const now = new Date();
    const timeMin = now.toISOString();
    const timeMax = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days from now

    const events = await getCalendarEvents(accessToken, timeMin, timeMax);

    // Filter events that are CheckFree appointments
    const appointments = events.filter(event => 
      event.description && event.description.includes('Scheduled via CheckFree')
    );

    res.status(200).json({ appointments });
  } catch (error) {
    console.error('Appointments fetch error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}