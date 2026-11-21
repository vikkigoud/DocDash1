/**
 * DocDash: QueueZero - Clinical Sample Seed Data
 * 4 Clinics, 8 Doctors across 4 Specialties, Morning & Evening Shifts, Initial Queue Tokens
 */

const SEED_CLINICS = [
  {
    id: 'clinic-1',
    name: 'Metro Health Central Hospital',
    branch: 'Downtown Campus',
    address: '108 Healthcare Blvd, Downtown',
    phone: '+1 (555) 234-5678',
    color: '#0ea5e9'
  },
  {
    id: 'clinic-2',
    name: 'Green Valley Family Clinic',
    branch: 'Northside Health Park',
    address: '422 Pine Crest Way, Northside',
    phone: '+1 (555) 345-6789',
    color: '#10b981'
  },
  {
    id: 'clinic-3',
    name: 'Westside Medical Pavilion',
    branch: 'West District Center',
    address: '750 Westview Ave, Suite 300',
    phone: '+1 (555) 456-7890',
    color: '#8b5cf6'
  },
  {
    id: 'clinic-4',
    name: 'Sunrise Community Care',
    branch: 'East Bay Medical Annex',
    address: '19 Sunrise Highway, East Bay',
    phone: '+1 (555) 567-8901',
    color: '#f59e0b'
  }
];

const SEED_DOCTORS = [
  {
    id: 'doc-mehta',
    name: 'Dr. A. Mehta',
    degrees: 'MD, DM (Cardiology), FACC',
    specialty: 'Cardiology',
    clinicId: 'clinic-3',
    clinicName: 'Westside Medical Pavilion',
    roomNumber: 'Room 204',
    consultationFee: 75,
    baselineDurationMinutes: 12,
    ewmaDurationMinutes: 12.0,
    recentDurations: [11, 14, 12, 13, 10], // Last 5 consultation durations in mins
    status: 'IN_CONSULTATION', // 'IN_CONSULTATION' | 'AVAILABLE' | 'ON_BREAK' | 'DELAYED'
    offsetDelayMinutes: 0,
    morningShift: '09:00 - 13:00',
    eveningShift: '17:00 - 21:00',
    avatar: '👨‍⚕️',
    experienceYears: 16,
    rating: 4.9,
    tokenPrefix: 'CARD'
  },
  {
    id: 'doc-sharma',
    name: 'Dr. Anita Sharma',
    degrees: 'MD (General Medicine)',
    specialty: 'General Medicine',
    clinicId: 'clinic-1',
    clinicName: 'Metro Health Central Hospital',
    roomNumber: 'Room 101',
    consultationFee: 50,
    baselineDurationMinutes: 10,
    ewmaDurationMinutes: 10.5,
    recentDurations: [9, 11, 10, 12, 10],
    status: 'IN_CONSULTATION',
    offsetDelayMinutes: 0,
    morningShift: '09:00 - 13:00',
    eveningShift: '17:00 - 21:00',
    avatar: '👩‍⚕️',
    experienceYears: 12,
    rating: 4.8,
    tokenPrefix: 'GM'
  },
  {
    id: 'doc-patel',
    name: 'Dr. Rajesh Patel',
    degrees: 'MBBS, DCH (Pediatrics)',
    specialty: 'Pediatrics',
    clinicId: 'clinic-2',
    clinicName: 'Green Valley Family Clinic',
    roomNumber: 'Room 102',
    consultationFee: 55,
    baselineDurationMinutes: 14,
    ewmaDurationMinutes: 14.2,
    recentDurations: [15, 13, 16, 12, 14],
    status: 'IN_CONSULTATION',
    offsetDelayMinutes: 0,
    morningShift: '09:00 - 13:00',
    eveningShift: '17:00 - 21:00',
    avatar: '👨‍⚕️',
    experienceYears: 14,
    rating: 4.9,
    tokenPrefix: 'PED'
  },
  {
    id: 'doc-johnson',
    name: 'Dr. Sarah Johnson',
    degrees: 'MS (Orthopedics), MCh',
    specialty: 'Orthopedics',
    clinicId: 'clinic-3',
    clinicName: 'Westside Medical Pavilion',
    roomNumber: 'Room 301',
    consultationFee: 70,
    baselineDurationMinutes: 15,
    ewmaDurationMinutes: 15.0,
    recentDurations: [16, 14, 15, 17, 13],
    status: 'AVAILABLE',
    offsetDelayMinutes: 0,
    morningShift: '09:00 - 13:00',
    eveningShift: '17:00 - 21:00',
    avatar: '👩‍⚕️',
    experienceYears: 11,
    rating: 4.7,
    tokenPrefix: 'ORTHO'
  },
  {
    id: 'doc-kim',
    name: 'Dr. David Kim',
    degrees: 'MD (Internal Medicine)',
    specialty: 'General Medicine',
    clinicId: 'clinic-2',
    clinicName: 'Green Valley Family Clinic',
    roomNumber: 'Room 105',
    consultationFee: 50,
    baselineDurationMinutes: 10,
    ewmaDurationMinutes: 9.8,
    recentDurations: [10, 9, 11, 10, 9],
    status: 'AVAILABLE',
    offsetDelayMinutes: 0,
    morningShift: '09:00 - 13:00',
    eveningShift: '17:00 - 21:00',
    avatar: '👨‍⚕️',
    experienceYears: 9,
    rating: 4.8,
    tokenPrefix: 'GM'
  },
  {
    id: 'doc-roy',
    name: 'Dr. Priya Roy',
    degrees: 'MD (Pediatrics), Neonatologist',
    specialty: 'Pediatrics',
    clinicId: 'clinic-4',
    clinicName: 'Sunrise Community Care',
    roomNumber: 'Room 108',
    consultationFee: 55,
    baselineDurationMinutes: 13,
    ewmaDurationMinutes: 13.0,
    recentDurations: [12, 14, 13, 15, 12],
    status: 'IN_CONSULTATION',
    offsetDelayMinutes: 0,
    morningShift: '09:00 - 13:00',
    eveningShift: '17:00 - 21:00',
    avatar: '👩‍⚕️',
    experienceYears: 10,
    rating: 4.9,
    tokenPrefix: 'PED'
  },
  {
    id: 'doc-chen',
    name: 'Dr. Vikram Chen',
    degrees: 'MS (Orthopedics), Joint Replacement',
    specialty: 'Orthopedics',
    clinicId: 'clinic-1',
    clinicName: 'Metro Health Central Hospital',
    roomNumber: 'Room 206',
    consultationFee: 70,
    baselineDurationMinutes: 16,
    ewmaDurationMinutes: 16.5,
    recentDurations: [17, 15, 18, 16, 16],
    status: 'IN_CONSULTATION',
    offsetDelayMinutes: 0,
    morningShift: '09:00 - 13:00',
    eveningShift: '17:00 - 21:00',
    avatar: '👨‍⚕️',
    experienceYears: 18,
    rating: 4.8,
    tokenPrefix: 'ORTHO'
  },
  {
    id: 'doc-alvarez',
    name: 'Dr. Sunita Alvarez',
    degrees: 'MD, DM (Cardiology)',
    specialty: 'Cardiology',
    clinicId: 'clinic-4',
    clinicName: 'Sunrise Community Care',
    roomNumber: 'Room 210',
    consultationFee: 80,
    baselineDurationMinutes: 15,
    ewmaDurationMinutes: 14.8,
    recentDurations: [14, 15, 16, 14, 15],
    status: 'AVAILABLE',
    offsetDelayMinutes: 0,
    morningShift: '09:00 - 13:00',
    eveningShift: '17:00 - 21:00',
    avatar: '👩‍⚕️',
    experienceYears: 15,
    rating: 4.9,
    tokenPrefix: 'CARD'
  }
];

// Initial Seed Tokens configured precisely to enable the hackathon demo scenario:
// Dr. Mehta has Token #11 currently in consultation, #12, #13 waiting,
// and Patient A books Token #14 (with Token #14 also pre-loaded into My Appointments for instant testing).
const INITIAL_QUEUE_TOKENS = [
  // --- Dr. A. Mehta (Cardiology) Queue ---
  {
    id: 'tkn-mehta-11',
    tokenNumber: 11,
    formattedToken: 'CARD-11',
    doctorId: 'doc-mehta',
    patientName: 'Suresh Rao',
    phone: '+1 (555) 901-1101',
    age: 58,
    shift: 'Evening',
    symptoms: 'Follow-up ECG review & chest tightness',
    status: 'IN_CONSULTATION', // 'IN_CONSULTATION' | 'WAITING' | 'COMPLETED' | 'ABSENT' | 'EMERGENCY'
    checkedIn: true,
    distanceMeters: 50,
    bookedAt: '17:15',
    consultationStartedAt: Date.now() - (4 * 60 * 1000), // started 4 mins ago
    isEmergency: false,
    priority: 1
  },
  {
    id: 'tkn-mehta-12',
    tokenNumber: 12,
    formattedToken: 'CARD-12',
    doctorId: 'doc-mehta',
    patientName: 'Ananya Sen',
    phone: '+1 (555) 901-1102',
    age: 44,
    shift: 'Evening',
    symptoms: 'Hypertension checkup and medication refill',
    status: 'WAITING',
    checkedIn: true,
    distanceMeters: 120,
    bookedAt: '17:22',
    consultationStartedAt: null,
    isEmergency: false,
    priority: 2
  },
  {
    id: 'tkn-mehta-13',
    tokenNumber: 13,
    formattedToken: 'CARD-13',
    doctorId: 'doc-mehta',
    patientName: 'Mohit Verma',
    phone: '+1 (555) 901-1103',
    age: 62,
    shift: 'Evening',
    symptoms: 'Post-stent annual cardiac evaluation',
    status: 'WAITING',
    checkedIn: false,
    distanceMeters: 850,
    bookedAt: '17:28',
    consultationStartedAt: null,
    isEmergency: false,
    priority: 3
  },
  {
    id: 'tkn-mehta-14',
    tokenNumber: 14,
    formattedToken: 'CARD-14',
    doctorId: 'doc-mehta',
    patientName: 'Patient A (Demo User)',
    phone: '+1 (555) 901-1104',
    age: 36,
    shift: 'Evening',
    symptoms: 'Routine cardiology wellness screening',
    status: 'WAITING',
    checkedIn: false,
    distanceMeters: 1400,
    bookedAt: '17:35',
    consultationStartedAt: null,
    isEmergency: false,
    priority: 4
  },

  // --- Dr. Anita Sharma (General Medicine) Queue ---
  {
    id: 'tkn-sharma-21',
    tokenNumber: 21,
    formattedToken: 'GM-21',
    doctorId: 'doc-sharma',
    patientName: 'Kavita Joshi',
    phone: '+1 (555) 902-2201',
    age: 29,
    shift: 'Evening',
    symptoms: 'High fever and persistent dry cough',
    status: 'IN_CONSULTATION',
    checkedIn: true,
    distanceMeters: 20,
    bookedAt: '17:05',
    consultationStartedAt: Date.now() - (6 * 60 * 1000),
    isEmergency: false,
    priority: 1
  },
  {
    id: 'tkn-sharma-22',
    tokenNumber: 22,
    formattedToken: 'GM-22',
    doctorId: 'doc-sharma',
    patientName: 'Deepak Chopra',
    phone: '+1 (555) 902-2202',
    age: 41,
    shift: 'Evening',
    symptoms: 'Seasonal allergies and sinus headache',
    status: 'WAITING',
    checkedIn: true,
    distanceMeters: 300,
    bookedAt: '17:18',
    consultationStartedAt: null,
    isEmergency: false,
    priority: 2
  },

  // --- Dr. Rajesh Patel (Pediatrics) Queue ---
  {
    id: 'tkn-patel-31',
    tokenNumber: 31,
    formattedToken: 'PED-31',
    doctorId: 'doc-patel',
    patientName: 'Baby Aarav (Father: Sameer)',
    phone: '+1 (555) 903-3301',
    age: 2,
    shift: 'Evening',
    symptoms: '18-month pediatric immunization & rash check',
    status: 'IN_CONSULTATION',
    checkedIn: true,
    distanceMeters: 10,
    bookedAt: '17:10',
    consultationStartedAt: Date.now() - (7 * 60 * 1000),
    isEmergency: false,
    priority: 1
  },
  {
    id: 'tkn-patel-32',
    tokenNumber: 32,
    formattedToken: 'PED-32',
    doctorId: 'doc-patel',
    patientName: 'Tara Iyer',
    phone: '+1 (555) 903-3302',
    age: 6,
    shift: 'Evening',
    symptoms: 'Mild earache after swimming lessons',
    status: 'WAITING',
    checkedIn: false,
    distanceMeters: 920,
    bookedAt: '17:25',
    consultationStartedAt: null,
    isEmergency: false,
    priority: 2
  }
];

// Historical clinic wait time heatmap (average wait time in minutes by day & time slot)
const CLINIC_HEATMAP_DATA = {
  days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  slots: ['09:00 AM', '11:00 AM', '01:00 PM', '05:00 PM', '07:00 PM'],
  data: [
    // Mon: High morning traffic
    [35, 42, 28, 48, 38],
    // Tue: Moderate
    [24, 30, 18, 36, 26],
    // Wed: Balanced
    [22, 28, 16, 32, 24],
    // Thu: Lower traffic
    [18, 22, 14, 25, 20],
    // Fri: High afternoon/evening
    [26, 34, 22, 45, 40],
    // Sat: Very high morning, lower evening
    [45, 52, 35, 28, 18]
  ]
};

// Export to global window scope for zero-bundler clean script loading
window.SEED_CLINICS = SEED_CLINICS;
window.SEED_DOCTORS = SEED_DOCTORS;
window.INITIAL_QUEUE_TOKENS = INITIAL_QUEUE_TOKENS;
window.CLINIC_HEATMAP_DATA = CLINIC_HEATMAP_DATA;
