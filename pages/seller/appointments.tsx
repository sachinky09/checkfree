"use client";

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, LogOut, ArrowLeft, User } from 'lucide-react';

interface Appointment {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
  };
  end: {
    dateTime: string;
  };
  attendees?: Array<{
    email: string;
  }>;
}

export default function SellerAppointments() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (session) {
      fetchAppointments();
    }
  }, [session, status, router]);

  const fetchAppointments = async () => {
    try {
      const response = await fetch('/api/appointments');
      const data = await response.json();
      setAppointments(data.appointments || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    };
  };

  const getClientEmail = (appointment: Appointment) => {
    if (!appointment.attendees) return 'Unknown';
    const clientEmail = appointment.attendees.find(a => a.email !== session?.user?.email);
    return clientEmail?.email || 'Unknown';
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => router.push('/seller/dashboard')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">My Appointments</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {session?.user?.name}</span>
              <Button
                variant="outline"
                onClick={() => signOut({ callbackUrl: '/auth/signin' })}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Upcoming Appointments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading appointments...</p>
              </div>
            ) : appointments.length > 0 ? (
              <div className="space-y-4">
                {appointments.map((appointment) => {
                  const startDateTime = formatDateTime(appointment.start.dateTime);
                  const endDateTime = formatDateTime(appointment.end.dateTime);
                  const clientEmail = getClientEmail(appointment);
                  
                  return (
                    <div
                      key={appointment.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {appointment.summary}
                          </h3>
                          <div className="flex items-center text-gray-600 mb-2">
                            <Calendar className="w-4 h-4 mr-2" />
                            <span>{startDateTime.date}</span>
                          </div>
                          <div className="flex items-center text-gray-600 mb-2">
                            <Clock className="w-4 h-4 mr-2" />
                            <span>
                              {startDateTime.time} - {endDateTime.time}
                            </span>
                          </div>
                          <div className="flex items-center text-gray-600 mb-2">
                            <User className="w-4 h-4 mr-2" />
                            <span>Client: {clientEmail}</span>
                          </div>
                          {appointment.description && (
                            <p className="text-gray-600 text-sm mt-2">
                              {appointment.description}
                            </p>
                          )}
                        </div>
                        <div className="ml-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Scheduled
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">No upcoming appointments</p>
                <p className="text-gray-500 text-sm mt-2">
                  Clients can book appointments with you through the buyer dashboard
                </p>
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-blue-800 text-sm">
                    <strong>Tip:</strong> Make sure your Google Calendar is up to date. 
                    Your availability is automatically synced from your calendar events.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}