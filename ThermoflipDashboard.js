'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button, Input } from '@/components/ui/button';
import { Thermometer, Power, Fan, Pencil } from 'lucide-react';
import ScheduleModal from '@/components/ScheduleModal';
import ClientOnly from '@/components/ClientOnly';
import { CartesianGrid, XAxis, YAxis, Tooltip, Bar } from 'recharts';

const DynamicChart = dynamic(
  () => import('recharts').then((mod) => mod.BarChart),
  { ssr: false }
);

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Delete Schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>Are you sure you want to delete this schedule?</p>
          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button 
              variant="destructive"
              onClick={() => {
                onConfirm();
                onClose();
              }}
            >
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const TemperatureDisplay = ({ temp }) => {
  const getColor = (temp) => {
    if (temp <= 60) return '#3b82f6';
    if (temp <= 75) return '#fcd34d';
    return '#ef4444';
  };

  return (
    <div className="flex justify-center items-center gap-4 sm:gap-8">
      <div className="text-4xl sm:text-5xl font-bold">{temp}°F</div>
      <div className="w-16 sm:w-24 h-8 sm:h-12 relative bg-gray-200 rounded-t-full overflow-hidden">
        <div
          className="absolute bottom-0 w-full transition-all duration-500 rounded-t-full"
          style={{
            height: '100%',
            backgroundColor: getColor(temp),
          }}
        />
      </div>
    </div>
  );
};

const LocationModal = ({ isOpen, onClose, onConfirm }) => {
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Location</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City"
            className="w-full"
          />
          <Input
            value={state}
            onChange={(e) => setState(e.target.value)}
            placeholder="State (Optional)"
            className="w-full"
          />
          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                const locationQuery = state ? `${city},${state}` : city;
                onConfirm(locationQuery);
                onClose();
              }}
            >
              Confirm
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const ThermoflipDashboard = () => {
  const savingsData = [
    { day: 'Mon', savings: 2.50 },
    { day: 'Tue', savings: 3.20 },
    { day: 'Wed', savings: 2.80 },
    { day: 'Thu', savings: 3.00 },
    { day: 'Fri', savings: 2.70 },
    { day: 'Sat', savings: 2.90 },
    { day: 'Sun', savings: 3.10 }
  ];
  const today = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());
  const [mode, setMode] = useState('off');
  const [reportedTemp, setReportedTemp] = useState('');
  const [lastReportTime, setLastReportTime] = useState(null);
  const [isConnected, setIsConnected] = useState(true);
  const [predictedTemp, setPredictedTemp] = useState(72);
  const [outdoorTemp, setOutdoorTemp] = useState(42);
  const [schedules, setSchedules] = useState([]);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleToEdit, setScheduleToEdit] = useState(null);
  const [scheduleToDelete, setScheduleToDelete] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getModeStyles = (mode) => {
    switch (mode.toLowerCase()) {
      case 'heat':
        return 'bg-[#dc7c5d] text-white';
      case 'air':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-200';
    }
  };

  useEffect(() => {
    const checkSchedules = () => {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const currentDay = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(now);

      schedules.forEach(schedule => {
        if (schedule.time === currentTime && schedule.days.includes(currentDay)) {
          setMode(schedule.mode.toLowerCase());
        }
      });
    };

    const interval = setInterval(checkSchedules, 60000);
    checkSchedules();

    return () => clearInterval(interval);
  }, [schedules]);

  const fetchTemperature = async (location) => {
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${location}&units=imperial&appid=0d02964f3757bf687c30eaf43130f9e5`
      );
      const data = await response.json();
      if (data.main && data.main.temp) {
        setOutdoorTemp(data.main.temp);
      } else {
        console.error('Invalid location or unable to fetch temperature');
      }
    } catch (error) {
      console.error('Error fetching temperature:', error);
    }
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
  };

  const handleTempReport = () => {
    setLastReportTime(new Date());
    setReportedTemp('');
  };

  const removeSchedule = (index) => {
    setSchedules(schedules.filter((_, i) => i !== index));
  };

  const formatTime = (time) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <ClientOnly>
      <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <Image
              src="/thermoflip-logo.png"
              alt="ThermoFlip Logo"
              width={150}
              height={45}
              priority
              className="w-32 sm:w-auto"
            />
            <div className="flex items-center gap-2 text-green-500">
              <span className="h-2 w-2 rounded-full bg-current" />
              Connected
            </div>
          </div>

          {/* Current Status */}
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Current Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Button
                  variant="outline"
                  className={`flex items-center gap-2 px-8 py-2 ${
                    mode === 'heat' ? 'bg-[#dc7c5d] text-white hover:bg-[#c46e53]' : ''
                  }`}
                  onClick={() => handleModeChange('heat')}
                >
                  <Thermometer className="h-5 w-5" />
                  Heat
                </Button>
                <Button
                  variant="outline"
                  className={`flex items-center gap-2 px-8 py-2 ${
                    mode === 'off' ? 'bg-gray-200 hover:bg-gray-300' : ''
                  }`}
                  onClick={() => handleModeChange('off')}
                >
                  <Power className="h-5 w-5" />
                  Off
                </Button>
                <Button
                  variant="outline"
                  className={`flex items-center gap-2 px-8 py-2 ${
                    mode === 'air' ? 'bg-blue-500 text-white hover:bg-blue-600' : ''
                  }`}
                  onClick={() => handleModeChange('air')}
                >
                  <Fan className="h-5 w-5" />
                  Air
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Schedule Settings */}
          <Card className="w-full">
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle>Schedule Settings</CardTitle>
              <Button
                variant="outline"
                onClick={() => {
                  setScheduleToEdit(null);
                  setIsScheduleModalOpen(true);
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white w-8 h-8 p-0 rounded-full text-xl font-semibold shadow-md flex items-center justify-center"
              >
                +
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {schedules.length === 0 ? (
                  <div className="text-center text-gray-500 py-4">No schedules set</div>
                ) : (
                  schedules.map((schedule, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-gray-50 p-4 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="font-medium">{formatTime(schedule.time)}</div>
                          <div className="text-sm text-gray-500">
                            {schedule.days.join(', ')}
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full ${getModeStyles(schedule.mode)}`}>
                          {schedule.mode}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setScheduleToEdit(schedule);
                            setIsScheduleModalOpen(true);
                          }}
                          className="text-blue-500 hover:text-blue-600 p-2"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setScheduleToDelete(index)}
                          className="text-gray-500 hover:text-red-500 p-2"
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Temperature Card */}
          <Card className="h-[180px] sm:h-[200px]">
            <CardHeader className="pb-0 flex justify-between items-center">
              <CardTitle className="text-left">Predicted Temperature</CardTitle>
              <Button
                variant="outline"
                onClick={() => setIsModalOpen(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white w-8 h-8 p-0 rounded-full text-xl font-semibold shadow-md flex items-center justify-center"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="pt-6 pb-6">
              <div className="flex flex-col justify-center items-center h-full">
                <div className="flex items-center justify-center mb-2">
                  <TemperatureDisplay temp={outdoorTemp} />
                </div>
                <div className="text-xs sm:text-sm text-gray-500 mt-2">
                  Current outdoor temp: {outdoorTemp}°F
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Estimated Savings */}
          <Card>
            <CardHeader>
              <CardTitle>Estimated Savings</CardTitle>
            </CardHeader>
            <CardContent className="p-2 sm:p-6">
              <div className="w-full h-[200px] sm:h-[300px] overflow-x-auto">
                <DynamicChart
                  width={typeof window !== 'undefined' ? (window.innerWidth < 640 ? 400 : 600) : 600}
                  height={typeof window !== 'undefined' ? (window.innerWidth < 640 ? 200 : 300) : 300}
                  data={savingsData}
                  margin={{ top: 5, right: 20, bottom: 5, left: 40 }}
                  responsive={true}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis 
                    label={{ value: 'Savings ($)', angle: -90, position: 'left', offset: 15 }}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                  <Bar dataKey="savings" fill="#4CAF50" />
                </DynamicChart>
              </div>
            </CardContent>
          </Card>

          {/* Modals */}
          <ScheduleModal
            isOpen={isScheduleModalOpen}
            onClose={() => {
              setIsScheduleModalOpen(false);
              setScheduleToEdit(null);
            }}
            onAdd={(newSchedule) => {
              if (scheduleToEdit) {
                const newSchedules = [...schedules];
                const index = schedules.indexOf(scheduleToEdit);
                newSchedules[index] = newSchedule;
                setSchedules(newSchedules);
                setScheduleToEdit(null);
              } else {
                setSchedules([...schedules, newSchedule]);
              }
            }}
            editSchedule={scheduleToEdit}
          />

          <DeleteConfirmationModal
            isOpen={scheduleToDelete !== null}
            onClose={() => setScheduleToDelete(null)}
            onConfirm={() => {
              removeSchedule(scheduleToDelete);
              setScheduleToDelete(null);
            }}
          />

          <LocationModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onConfirm={fetchTemperature}
          />
        </div>
      </div>
    </ClientOnly>
  );
};

export default ThermoflipDashboard;
