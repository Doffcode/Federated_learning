/**
 * Vehicle configurations — each tied to the real FL training dataset for that model.
 * Stats derived from dataset means:
 *   Tesla  : avg dist 149km, battery health ~72%, age ~3.7yr
 *   BMW    : avg dist 146km, battery health ~71%, age ~3.8yr
 *   Hyundai: avg dist 161km, battery health ~74%, age ~3.3yr
 *   Chevy  : avg dist 161km, battery health ~86%, age ~1.8yr
 *   Nissan : avg dist 167km, battery health ~86%, age ~1.7yr
 */

export type VehicleConfig = {
  name: string
  model: string
  battery_capacity: number
  registration_number: string
  purchase_date: string
  image_url: string
  city: string
  // Dataset-derived display stats
  avg_range_km: number
  battery_health: number
  vehicle_age_years: number
  charging_rate_kw: number
}

const VEHICLE_CONFIGS: Record<string, VehicleConfig> = {
  tesla: {
    name: 'My Tesla Model 3',
    model: 'Tesla Model 3',
    battery_capacity: 75,
    registration_number: 'AP39TS1001',
    purchase_date: '2024-01-15',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/2019_Tesla_Model_3_facelift%2C_front_8.27.19.jpg/1280px-2019_Tesla_Model_3_facelift%2C_front_8.27.19.jpg',
    city: 'Hyderabad',
    avg_range_km: 480,
    battery_health: 72,
    vehicle_age_years: 3.7,
    charging_rate_kw: 20,
  },
  bmw: {
    name: 'My BMW i3',
    model: 'BMW i3',
    battery_capacity: 60,
    registration_number: 'AP39BM1001',
    purchase_date: '2021-06-10',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/BMW_i3_at_the_2014_Los_Angeles_Auto_Show_%28LAAS%29_%2815754024602%29.jpg/1280px-BMW_i3_at_the_2014_Los_Angeles_Auto_Show_%28LAAS%29_%2815754024602%29.jpg',
    city: 'New Delhi',
    avg_range_km: 260,
    battery_health: 68,
    vehicle_age_years: 3.8,
    charging_rate_kw: 36,
  },
  hyundai: {
    name: 'My Hyundai Kona',
    model: 'Hyundai Kona Electric',
    battery_capacity: 64,
    registration_number: 'AP39HD1001',
    purchase_date: '2022-09-20',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Hyundai_Kona_Electric_at_Geneva_Motor_Show_2018.jpg/1280px-Hyundai_Kona_Electric_at_Geneva_Motor_Show_2018.jpg',
    city: 'Bengaluru',
    avg_range_km: 415,
    battery_health: 79,
    vehicle_age_years: 3.3,
    charging_rate_kw: 31,
  },
  chevy: {
    name: 'My Chevy Bolt',
    model: 'Chevy Bolt EV',
    battery_capacity: 66,
    registration_number: 'AP39CV1001',
    purchase_date: '2023-03-05',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Chevrolet_Bolt_EV_2023_%28cropped%29.jpg/1280px-Chevrolet_Bolt_EV_2023_%28cropped%29.jpg',
    city: 'Mumbai',
    avg_range_km: 417,
    battery_health: 87,
    vehicle_age_years: 1.8,
    charging_rate_kw: 16,
  },
  nissan: {
    name: 'My Nissan Leaf',
    model: 'Nissan Leaf',
    battery_capacity: 62,
    registration_number: 'AP39NS1001',
    purchase_date: '2023-05-15',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/2018_Nissan_Leaf_-_front_8.13.18.jpg/1280px-2018_Nissan_Leaf_-_front_8.13.18.jpg',
    city: 'Chennai',
    avg_range_km: 364,
    battery_health: 89,
    vehicle_age_years: 1.7,
    charging_rate_kw: 44,
  },
};

/** Get vehicle config by type key */
export const getVehicleConfig = (vehicleType: string): VehicleConfig =>
  VEHICLE_CONFIGS[vehicleType.toLowerCase()] ?? VEHICLE_CONFIGS.tesla;

/**
 * Detect vehicle type from model string or registration number.
 * Used to pick the right image and stats for a vehicle returned by the API.
 */
export const detectVehicleType = (vehicle: { model?: string; registration_number?: string }): string => {
  const m = (vehicle.model ?? '').toLowerCase();
  const r = (vehicle.registration_number ?? '').toLowerCase();
  if (m.includes('tesla') || r.includes('ts')) return 'tesla';
  if (m.includes('bmw')   || r.includes('bm')) return 'bmw';
  if (m.includes('kona')  || m.includes('hyundai') || r.includes('hd')) return 'hyundai';
  if (m.includes('bolt')  || m.includes('chevy')   || r.includes('cv')) return 'chevy';
  if (m.includes('leaf')  || m.includes('nissan')  || r.includes('ns')) return 'nissan';
  return 'tesla';
};

/** Backward-compat: MOCK_VEHICLES defaults to Tesla */
export const MOCK_VEHICLES = [getVehicleConfig('tesla')];

/** Per-type ride data for "Load Demo Data" — matches seeded DB rides */
export const generateMockRides = (vehicleType: string) => {
  const configs: Record<string, Array<{
    distance: number; duration: number;
    start_location: string; end_location: string;
    start_lat: number; start_lng: number; end_lat: number; end_lng: number;
    date: string; start_time: string; end_time: string;
  }>> = {
    tesla: [
      { distance: 32.4, duration: 38, start_location: 'Jubilee Hills, Hyderabad', end_location: 'HITEC City, Hyderabad', start_lat: 17.4318, start_lng: 78.4080, end_lat: 17.4473, end_lng: 78.3762, date: '2026-04-10', start_time: '09:00', end_time: '09:38' },
      { distance: 27.1, duration: 31, start_location: 'Banjara Hills, Hyderabad', end_location: 'Gachibowli, Hyderabad', start_lat: 17.4156, start_lng: 78.4347, end_lat: 17.4400, end_lng: 78.3489, date: '2026-04-07', start_time: '18:15', end_time: '18:46' },
      { distance: 19.8, duration: 22, start_location: 'Madhapur, Hyderabad', end_location: 'Kondapur, Hyderabad', start_lat: 17.4485, start_lng: 78.3908, end_lat: 17.4681, end_lng: 78.3579, date: '2026-04-04', start_time: '08:30', end_time: '08:52' },
    ],
    hyundai: [
      { distance: 18.6, duration: 28, start_location: 'Koramangala, Bengaluru', end_location: 'Electronic City, Bengaluru', start_lat: 12.9279, start_lng: 77.6271, end_lat: 12.8399, end_lng: 77.6770, date: '2026-04-10', start_time: '09:10', end_time: '09:38' },
      { distance: 14.3, duration: 24, start_location: 'Indiranagar, Bengaluru', end_location: 'Whitefield, Bengaluru', start_lat: 12.9784, start_lng: 77.6408, end_lat: 12.9698, end_lng: 77.7499, date: '2026-04-07', start_time: '17:45', end_time: '18:09' },
      { distance: 9.7,  duration: 17, start_location: 'Jayanagar, Bengaluru', end_location: 'BTM Layout, Bengaluru', start_lat: 12.9240, start_lng: 77.5930, end_lat: 12.9165, end_lng: 77.6101, date: '2026-04-04', start_time: '08:00', end_time: '08:17' },
    ],
    bmw: [
      { distance: 14.2, duration: 25, start_location: 'Connaught Place, New Delhi', end_location: 'Hauz Khas Village, Delhi', start_lat: 28.6315, start_lng: 77.2167, end_lat: 28.5494, end_lng: 77.2001, date: '2026-04-10', start_time: '09:00', end_time: '09:25' },
      { distance: 8.9,  duration: 18, start_location: 'Lajpat Nagar, Delhi', end_location: 'Khan Market, Delhi', start_lat: 28.5677, start_lng: 77.2433, end_lat: 28.5997, end_lng: 77.2271, date: '2026-04-07', start_time: '18:30', end_time: '18:48' },
      { distance: 11.5, duration: 20, start_location: 'Vasant Kunj, Delhi', end_location: 'Saket, Delhi', start_lat: 28.5200, start_lng: 77.1590, end_lat: 28.5244, end_lng: 77.2167, date: '2026-04-04', start_time: '08:00', end_time: '08:20' },
      { distance: 22.3, duration: 35, start_location: 'Dwarka, Delhi', end_location: 'Nehru Place, Delhi', start_lat: 28.5921, start_lng: 77.0460, end_lat: 28.5491, end_lng: 77.2519, date: '2026-04-01', start_time: '08:45', end_time: '09:20' },
    ],
    // Chevy gets 5 rides — frequent, long-distance usage hints at heavy battery drain
    chevy: [
      { distance: 28.7, duration: 35, start_location: 'Andheri West, Mumbai', end_location: 'BKC, Mumbai', start_lat: 19.1282, start_lng: 72.8266, end_lat: 19.0656, end_lng: 72.8687, date: '2026-04-10', start_time: '09:00', end_time: '09:35' },
      { distance: 22.4, duration: 30, start_location: 'Powai, Mumbai', end_location: 'Kurla Station, Mumbai', start_lat: 19.1197, start_lng: 72.9068, end_lat: 19.0726, end_lng: 72.8795, date: '2026-04-07', start_time: '17:30', end_time: '18:00' },
      { distance: 35.1, duration: 42, start_location: 'Bandra West, Mumbai', end_location: 'Nariman Point, Mumbai', start_lat: 19.0596, start_lng: 72.8295, end_lat: 18.9267, end_lng: 72.8236, date: '2026-04-04', start_time: '08:15', end_time: '08:57' },
      { distance: 41.6, duration: 55, start_location: 'Thane, Mumbai', end_location: 'Churchgate, Mumbai', start_lat: 19.2183, start_lng: 72.9781, end_lat: 18.9355, end_lng: 72.8256, date: '2026-04-02', start_time: '07:00', end_time: '07:55' },
      { distance: 18.9, duration: 26, start_location: 'Goregaon, Mumbai', end_location: 'Malad West, Mumbai', start_lat: 19.1663, start_lng: 72.8526, end_lat: 19.1862, end_lng: 72.8479, date: '2026-03-30', start_time: '20:10', end_time: '20:36' },
    ],
    // Nissan gets 4 rides — also heavy usage pattern
    nissan: [
      { distance: 16.3, duration: 26, start_location: 'T. Nagar, Chennai', end_location: 'Anna Nagar, Chennai', start_lat: 13.0418, start_lng: 80.2341, end_lat: 13.0850, end_lng: 80.2101, date: '2026-04-10', start_time: '09:00', end_time: '09:26' },
      { distance: 12.8, duration: 21, start_location: 'Velachery, Chennai', end_location: 'OMR, Chennai', start_lat: 12.9815, start_lng: 80.2180, end_lat: 12.9010, end_lng: 80.2270, date: '2026-04-07', start_time: '17:55', end_time: '18:16' },
      { distance: 8.6,  duration: 15, start_location: 'Adyar, Chennai', end_location: 'Besant Nagar, Chennai', start_lat: 13.0063, start_lng: 80.2574, end_lat: 13.0001, end_lng: 80.2707, date: '2026-04-04', start_time: '08:00', end_time: '08:15' },
      { distance: 29.4, duration: 44, start_location: 'Tambaram, Chennai', end_location: 'Chennai Airport, Chennai', start_lat: 12.9249, start_lng: 80.1000, end_lat: 12.9941, end_lng: 80.1709, date: '2026-04-01', start_time: '05:30', end_time: '06:14' },
    ],
  };
  return configs[vehicleType] ?? configs.tesla;
};

/** Backward-compat: MOCK_RIDES defaults to Tesla rides */
export const MOCK_RIDES = generateMockRides('tesla');

export const DEMO_LOCATION = {
  location: 'HITEC City, Hyderabad',
  latitude: 17.4473,
  longitude: 78.3762,
};
