"use client";

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Calendar, Clock, User, LogOut, Settings } from 'lucide-react';

interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}

export default function SellerDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (session) {
      checkUserRole();
      fetchAvailability();
    }
  }, [session, status, router]);

  useEffect(() => {
    if (session && selectedDate) {
      fetchAvailability();
    }
  }, [selectedDate, session]);

  const checkUserRole = async () => {
    try {
      const response = await fetch('/api/user/check');
      const userData = await response.json();
      if (userData.role !== 'seller') {
        router.push('/auth/role-select');
      }
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  };

  const fetchAvailability = async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/availability?sellerId=${session.user.id}&date=${selectedDate}`);
      const data = await response.json();
      setTimeSlots(data.slots || []);
    } catch (error) {
      console.error('Error fetching availability:', error);
      setTimeSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata', // IST
    });
  };

  const getSlotStatus = (slot: TimeSlot) => (slot.available ? 'Available' : 'Busy');

  const getSlotColor = (slot: TimeSlot) =>
    slot.available ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200';

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
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">CheckFree - Seller Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {session?.user?.name}</span>
              <Button variant="outline" onClick={() => router.push('/seller/appointments')}>
                <Calendar className="w-4 h-4 mr-2" /> My Appointments
              </Button>
              <Button variant="outline" onClick={() => signOut({ callbackUrl: '/auth/signin' })}>
                <LogOut className="w-4 h-4 mr-2" /> Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" /> Your Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                {session?.user?.image && (
                  <img
                    src={session.user.image}
                    alt={session?.user?.name || 'Profile'}
                    className="w-20 h-20 rounded-full mx-auto mb-4"
                  />
                )}
                <h3 className="text-lg font-semibold text-gray-900">{session?.user?.name}</h3>
                <p className="text-gray-600">{session?.user?.email}</p>
                <div className="mt-4 p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>Status:</strong> Available for bookings
                  </p>
                  <p className="text-sm text-green-700 mt-1">Working Hours: 9:00 AM - 9:00 PM</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Date Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="w-5 h-5 mr-2" /> Select Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full"
              />
              <div className="mt-4 text-sm text-gray-600">
                <p>Your availability is automatically synced from Google Calendar.</p>
                <p className="mt-2"><strong>Legend:</strong></p>
                <div className="flex items-center mt-1">
                  <div className="w-3 h-3 bg-green-200 rounded mr-2"></div>
                  <span>Available for booking</span>
                </div>
                <div className="flex items-center mt-1">
                  <div className="w-3 h-3 bg-red-200 rounded mr-2"></div>
                  <span>Busy (from your calendar)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Availability Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="w-5 h-5 mr-2" /> Availability Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Working Hours</label>
                  <p className="text-gray-600">9:00 AM - 9:00 PM</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Slot Duration</label>
                  <p className="text-gray-600">30 minutes</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Calendar Integration</label>
                  <p className="text-green-600">✓ Connected to Google Calendar</p>
                </div>
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Your availability is automatically managed through your Google Calendar.
                    Busy times from your calendar will be marked as unavailable for booking.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Time Slots for Selected Date */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="w-5 h-5 mr-2" /> Availability for{' '}
              {new Date(selectedDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                timeZone: 'Asia/Kolkata',
              })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading availability...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                {timeSlots.map((slot, index) => (
                  <div key={index} className={`p-3 rounded-lg border text-center ${getSlotColor(slot)}`}>
                    <div className="text-sm font-medium">{formatTime(slot.start)}</div>
                    <div className="text-xs mt-1">{formatTime(slot.end)}</div>
                    <div
                      className={`text-xs mt-2 font-medium ${
                        slot.available ? 'text-green-700' : 'text-red-700'
                      }`}
                    >
                      {getSlotStatus(slot)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
