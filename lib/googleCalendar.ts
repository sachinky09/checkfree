import axios from 'axios';

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: Array<{
    email: string;
    responseStatus: string;
  }>;
  conferenceData?: {
    entryPoints: Array<{
      entryPointType: string;
      uri: string;
    }>;
  };
}

export interface FreeBusyResponse {
  kind: string;
  timeMin: string;
  timeMax: string;
  calendars: {
    [email: string]: {
      busy: Array<{
        start: string;
        end: string;
      }>;
    };
  };
}

export async function getFreeBusy(accessToken: string, email: string, timeMin: string, timeMax: string): Promise<FreeBusyResponse> {
  const response = await axios.post(
    'https://www.googleapis.com/calendar/v3/freeBusy',
    {
      timeMin,
      timeMax,
      items: [{ id: email }]
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  return response.data;
}

export async function createCalendarEvent(accessToken: string, event: Partial<CalendarEvent>): Promise<CalendarEvent> {
  const response = await axios.post(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      ...event,
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet'
          }
        }
      }
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      params: {
        conferenceDataVersion: 1
      }
    }
  );
  
  return response.data;
}

export async function getCalendarEvents(accessToken: string, timeMin: string, timeMax: string): Promise<CalendarEvent[]> {
  const response = await axios.get(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      params: {
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: 'startTime',
      },
    }
  );
  
  return response.data.items || [];
}

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const response = await axios.post('https://oauth2.googleapis.com/token', {
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });
  
  return response.data.access_token;
}