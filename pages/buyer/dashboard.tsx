"use client";

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Calendar, Clock, User, LogOut, Search } from 'lucide-react';

interface Seller {
  _id: string;
  name: string;
  email: string;
  image?: string;
}

interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}

export default function BuyerDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (session) {
      checkUserRole();
      fetchSellers();
    }
  }, [session, status, router]);

  const checkUserRole = async () => {
    try {
      const response = await fetch('/api/user/check');
      const userData = await response.json();
      
      if (userData.role !== 'buyer') {
        router.push('/auth/role-select');
      }
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  };

  const fetchSellers = async () => {
    try {
      const response = await fetch('/api/sellers');
      const data = await response.json();
      setSellers(data);
    } catch (error) {
      console.error('Error fetching sellers:', error);
    }
  };

  const fetchAvailability = async (sellerId: string, date: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/availability?sellerId=${sellerId}&date=${date}`);
      const data = await response.json();
      setTimeSlots(data.slots || []);
    } catch (error) {
      console.error('Error fetching availability:', error);
      setTimeSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    if (selectedSeller) {
      fetchAvailability(selectedSeller._id, date);
    }
  };

  const handleSellerSelect = (seller: Seller) => {
    setSelectedSeller(seller);
    setTimeSlots([]);
    if (selectedDate) {
      fetchAvailability(seller._id, selectedDate);
    }
  };

  const bookAppointment = async (slot: TimeSlot) => {
    if (!selectedSeller) return;

    setBookingLoading(true);
    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sellerId: selectedSeller._id,
          startTime: slot.start,
          endTime: slot.end,
          title: `Meeting with ${selectedSeller.name}`,
        }),
      });

      if (response.ok) {
        alert('Appointment booked successfully!');
        // Refresh availability
        fetchAvailability(selectedSeller._id, selectedDate);
      } else {
        alert('Failed to book appointment. Please try again.');
      }
    } catch (error) {
      console.error('Error booking appointment:', error);
      alert('Error booking appointment. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
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
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">CheckFree - Buyer Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {session?.user?.name}</span>
              <Button
                variant="outline"
                onClick={() => router.push('/buyer/appointments')}
              >
                <Calendar className="w-4 h-4 mr-2" />
                My Appointments
              </Button>
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

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sellers List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Search className="w-5 h-5 mr-2" />
                Available Sellers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sellers.map((seller) => (
                  <div
                    key={seller._id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedSeller?._id === seller._id
                        ? 'bg-blue-50 border-blue-200 border'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                    onClick={() => handleSellerSelect(seller)}
                  >
                    <div className="flex items-center space-x-3">
                      {seller.image ? (
                        <img
                          src={seller.image}
                          alt={seller.name}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <User className="w-5 h-5 text-gray-600" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{seller.name}</p>
                        <p className="text-sm text-gray-600">{seller.email}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Date Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Select Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                disabled={!selectedSeller}
                className="w-full"
              />
              {!selectedSeller && (
                <p className="text-sm text-gray-500 mt-2">
                  Please select a seller first
                </p>
              )}
            </CardContent>
          </Card>

          {/* Time Slots */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Available Time Slots
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading availability...</p>
                </div>
              ) : selectedSeller && selectedDate ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {timeSlots.filter(slot => slot.available).length > 0 ? (
                    timeSlots
                      .filter(slot => slot.available)
                      .map((slot, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          className="w-full justify-between"
                          onClick={() => bookAppointment(slot)}
                          disabled={bookingLoading}
                        >
                          <span>
                            {formatTime(slot.start)} - {formatTime(slot.end)}
                          </span>
                          {bookingLoading ? 'Booking...' : 'Book'}
                        </Button>
                      ))
                  ) : (
                    <p className="text-gray-600 text-center py-8">
                      No available slots for this date
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-gray-600 text-center py-8">
                  Select a seller and date to view available time slots
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}