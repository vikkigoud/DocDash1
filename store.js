/**
 * DocDash: QueueZero - Central Reactive Store & Multi-Tab Synchronization
 * 
 * Supports:
 * - Real-Time Pub/Sub
 * - Cross-Window/Cross-Tab Sync via BroadcastChannel & LocalStorage Event Bus
 * - Safe Local Persistence & One-Click Demo Reset
 */

const STORAGE_KEY = 'docdash_queue_state_v1';
const SYNC_CHANNEL_NAME = 'docdash_sync_channel';

class ClinicStore {
  constructor() {
    this.subscribers = [];
    this.broadcastChannel = null;
    
    // Initialize BroadcastChannel if available in browser
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
        this.broadcastChannel.onmessage = (event) => {
          if (event && event.data) {
            this._handleRemoteAction(event.data);
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel not supported or blocked:', err);
      }
    }

    // Fallback cross-tab sync via storage event
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY && e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            this.state = parsed;
            this._notifySubscribers({ type: 'STORAGE_SYNC' });
          } catch (err) {
            console.error('Error parsing remote storage sync:', err);
          }
        }
      });
    }

    // Initialize State from Storage or Defaults
    this.state = this._loadInitialState();
  }

  _loadInitialState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.tokens && parsed.doctors && parsed.clinics) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed reading localStorage, using default seed:', e);
    }

    return this._getDefaultState();
  }

  _getDefaultState() {
    return {
      clinics: JSON.parse(JSON.stringify(window.SEED_CLINICS || [])),
      doctors: JSON.parse(JSON.stringify(window.SEED_DOCTORS || [])),
      tokens: JSON.parse(JSON.stringify(window.INITIAL_QUEUE_TOKENS || [])),
      // Pre-seed Patient A's active token for the instant demo experience
      myAppointments: ['tkn-mehta-14'],
      activeDoctorId: 'doc-mehta',
      audioEnabled: true,
      lastAction: { type: 'INIT', timestamp: Date.now() }
    };
  }

  _saveAndBroadcast(actionInfo = { type: 'STATE_UPDATED' }) {
    try {
      this.state.lastAction = { ...actionInfo, timestamp: Date.now() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error('Failed saving to localStorage:', e);
    }

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          actionInfo,
          state: this.state
        });
      } catch (e) {
        console.warn('BroadcastChannel post error:', e);
      }
    }

    this._notifySubscribers(actionInfo);
  }

  _handleRemoteAction(payload) {
    if (!payload || !payload.state) return;
    this.state = payload.state;
    this._notifySubscribers(payload.actionInfo || { type: 'REMOTE_SYNC' });
  }

  _notifySubscribers(actionInfo) {
    for (const callback of this.subscribers) {
      try {
        callback(this.state, actionInfo);
      } catch (err) {
        console.error('Error in store subscriber:', err);
      }
    }
  }

  subscribe(callback) {
    this.subscribers.push(callback);
    // Immediately invoke with current state
    callback(this.state, { type: 'INITIAL_SUBSCRIBE' });
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  getState() {
    return this.state;
  }

  // --- Doctor Queries ---
  getDoctor(doctorId) {
    return this.state.doctors.find(d => d.id === doctorId) || null;
  }

  getDoctors(filterSpecialty = 'ALL', filterClinic = 'ALL', searchQuery = '') {
    return this.state.doctors.filter(d => {
      if (filterSpecialty !== 'ALL' && d.specialty !== filterSpecialty) return false;
      if (filterClinic !== 'ALL' && d.clinicId !== filterClinic) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = d.name.toLowerCase().includes(q);
        const matchesSpec = d.specialty.toLowerCase().includes(q);
        const matchesClinic = d.clinicName.toLowerCase().includes(q);
        if (!matchesName && !matchesSpec && !matchesClinic) return false;
      }
      return true;
    });
  }

  // --- Queue Queries ---
  getDoctorTokens(doctorId) {
    return this.state.tokens.filter(t => t.doctorId === doctorId);
  }

  getActiveDoctorTokens(doctorId) {
    return this.state.tokens.filter(t => 
      t.doctorId === doctorId && (t.status === 'IN_CONSULTATION' || t.status === 'WAITING')
    ).sort((a, b) => {
      if (a.status === 'IN_CONSULTATION') return -1;
      if (b.status === 'IN_CONSULTATION') return 1;
      if (a.isEmergency && !b.isEmergency) return -1;
      if (!a.isEmergency && b.isEmergency) return 1;
      return a.tokenNumber - b.tokenNumber;
    });
  }

  getMyAppointments() {
    return this.state.tokens.filter(t => this.state.myAppointments.includes(t.id));
  }

  // --- Actions ---

  /**
   * Book a new virtual appointment token
   */
  bookToken({ patientName, phone, age, doctorId, shift, symptoms }) {
    const doctor = this.getDoctor(doctorId);
    if (!doctor) throw new Error('Selected doctor not found');

    // Calculate sequential token number for this doctor
    const doctorTokens = this.getDoctorTokens(doctorId);
    const maxTokenNum = doctorTokens.reduce((max, t) => Math.max(max, t.tokenNumber), 10);
    const nextTokenNum = maxTokenNum + 1;
    const formattedToken = `${doctor.tokenPrefix}-${nextTokenNum}`;

    const newToken = {
      id: `tkn-${doctor.id}-${nextTokenNum}-${Date.now().toString(36)}`,
      tokenNumber: nextTokenNum,
      formattedToken,
      doctorId,
      patientName: patientName.trim(),
      phone: phone.trim(),
      age: parseInt(age, 10) || 30,
      shift: shift || 'Evening',
      symptoms: (symptoms || 'General consultation').trim(),
      status: 'WAITING',
      checkedIn: false,
      distanceMeters: 1200,
      bookedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      consultationStartedAt: null,
      isEmergency: false,
      priority: nextTokenNum
    };

    this.state.tokens.push(newToken);
    if (!this.state.myAppointments.includes(newToken.id)) {
      this.state.myAppointments.push(newToken.id);
    }

    this._saveAndBroadcast({
      type: 'TOKEN_BOOKED',
      token: newToken,
      doctorId
    });

    return newToken;
  }

  /**
   * Doctor advances queue: Calls the next patient in line
   */
  callNextPatient(doctorId) {
    const doctor = this.getDoctor(doctorId);
    if (!doctor) return null;

    // 1. If there's an ongoing consultation, complete it and log its duration for EWMA
    const currentActive = this.state.tokens.find(
      t => t.doctorId === doctorId && t.status === 'IN_CONSULTATION'
    );

    if (currentActive) {
      currentActive.status = 'COMPLETED';
      currentActive.completedAt = Date.now();
      
      // Calculate realistic consultation duration
      let durationMinutes = doctor.baselineDurationMinutes || 12;
      if (currentActive.consultationStartedAt) {
        const elapsed = Math.round((Date.now() - currentActive.consultationStartedAt) / 60000);
        durationMinutes = Math.max(5, Math.min(30, elapsed > 0 ? elapsed : durationMinutes));
      }

      // Add to recent durations list (keep last 5)
      if (!doctor.recentDurations) doctor.recentDurations = [];
      doctor.recentDurations.push(durationMinutes);
      if (doctor.recentDurations.length > 5) {
        doctor.recentDurations.shift();
      }

      // Recalculate EWMA
      if (window.estimator) {
        doctor.ewmaDurationMinutes = window.estimator.calculateEWMA(
          doctor.recentDurations,
          doctor.baselineDurationMinutes
        );
      }
    }

    // 2. Find next waiting patient (emergency first, then lowest token number)
    const waitingTokens = this.state.tokens
      .filter(t => t.doctorId === doctorId && t.status === 'WAITING')
      .sort((a, b) => {
        if (a.isEmergency && !b.isEmergency) return -1;
        if (!a.isEmergency && b.isEmergency) return 1;
        return a.tokenNumber - b.tokenNumber;
      });

    if (waitingTokens.length === 0) {
      doctor.status = 'AVAILABLE';
      this._saveAndBroadcast({
        type: 'QUEUE_EMPTY',
        doctorId
      });
      return null;
    }

    const nextPatient = waitingTokens[0];
    nextPatient.status = 'IN_CONSULTATION';
    nextPatient.consultationStartedAt = Date.now();
    nextPatient.checkedIn = true; // Auto-checked in when called
    doctor.status = 'IN_CONSULTATION';

    this._saveAndBroadcast({
      type: 'TOKEN_CALLED',
      token: nextPatient,
      doctorId
    });

    return nextPatient;
  }

  /**
   * Mark current consultation completed
   */
  markCompleted(doctorId) {
    const doctor = this.getDoctor(doctorId);
    if (!doctor) return null;

    const currentActive = this.state.tokens.find(
      t => t.doctorId === doctorId && t.status === 'IN_CONSULTATION'
    );

    if (currentActive) {
      currentActive.status = 'COMPLETED';
      currentActive.completedAt = Date.now();
    }

    doctor.status = 'AVAILABLE';

    this._saveAndBroadcast({
      type: 'CONSULTATION_COMPLETED',
      token: currentActive,
      doctorId
    });

    return currentActive;
  }

  /**
   * Physician delays queue by X minutes (adds to offsetDelayMinutes)
   */
  delayDoctor(doctorId, minutes = 10) {
    const doctor = this.getDoctor(doctorId);
    if (!doctor) return;

    doctor.offsetDelayMinutes = (doctor.offsetDelayMinutes || 0) + minutes;
    doctor.status = 'DELAYED';

    this._saveAndBroadcast({
      type: 'DOCTOR_DELAYED',
      doctorId,
      delayMinutes: minutes,
      totalDelay: doctor.offsetDelayMinutes
    });
  }

  /**
   * Reset doctor delay offset back to 0
   */
  clearDoctorDelay(doctorId) {
    const doctor = this.getDoctor(doctorId);
    if (!doctor) return;

    doctor.offsetDelayMinutes = 0;
    doctor.status = this.getActiveDoctorTokens(doctorId).some(t => t.status === 'IN_CONSULTATION')
      ? 'IN_CONSULTATION'
      : 'AVAILABLE';

    this._saveAndBroadcast({
      type: 'DELAY_CLEARED',
      doctorId
    });
  }

  /**
   * Skip absent patient token to prevent stalling the queue
   */
  skipAbsentPatient(doctorId, tokenId) {
    const token = this.state.tokens.find(t => t.id === tokenId);
    if (token) {
      token.status = 'ABSENT';
      token.absentAt = Date.now();
    }

    // Call next patient immediately
    this.callNextPatient(doctorId);

    this._saveAndBroadcast({
      type: 'PATIENT_SKIPPED',
      tokenId,
      doctorId
    });
  }

  /**
   * Re-admit an absent patient back into waiting line
   */
  restoreAbsentPatient(tokenId) {
    const token = this.state.tokens.find(t => t.id === tokenId);
    if (token && token.status === 'ABSENT') {
      token.status = 'WAITING';
      this._saveAndBroadcast({
        type: 'PATIENT_RESTORED',
        tokenId
      });
    }
  }

  /**
   * Triage Emergency Escalation: injects high priority patient to head of queue
   */
  injectEmergencyPatient({ doctorId, patientName, triageNotes }) {
    const doctor = this.getDoctor(doctorId);
    if (!doctor) return;

    const doctorTokens = this.getDoctorTokens(doctorId);
    const maxTokenNum = doctorTokens.reduce((max, t) => Math.max(max, t.tokenNumber), 10);
    const nextTokenNum = maxTokenNum + 1;
    const formattedToken = `${doctor.tokenPrefix}-EM-${nextTokenNum}`;

    const emergencyToken = {
      id: `tkn-em-${doctor.id}-${Date.now().toString(36)}`,
      tokenNumber: nextTokenNum,
      formattedToken,
      doctorId,
      patientName: (patientName || 'Emergency Trauma Patient').trim(),
      phone: '+1 (555) 911-0000',
      age: 45,
      shift: 'Emergency',
      symptoms: (triageNotes || 'Acute critical escalation - Immediate triage').trim(),
      status: 'WAITING',
      checkedIn: true,
      distanceMeters: 0,
      bookedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      consultationStartedAt: null,
      isEmergency: true,
      priority: 0 // Head of waiting line
    };

    this.state.tokens.push(emergencyToken);

    this._saveAndBroadcast({
      type: 'EMERGENCY_ESCALATION',
      token: emergencyToken,
      doctorId
    });

    return emergencyToken;
  }

  /**
   * Virtual Clinic Check-in Simulator
   * If distance is <= 500 meters, automatically marks checkedIn = true
   */
  simulateCheckIn(tokenId, distanceMeters) {
    const token = this.state.tokens.find(t => t.id === tokenId);
    if (!token) return;

    token.distanceMeters = distanceMeters;
    const wasCheckedIn = token.checkedIn;
    token.checkedIn = (distanceMeters <= 500);

    this._saveAndBroadcast({
      type: 'CHECK_IN_UPDATE',
      token,
      justActivated: !wasCheckedIn && token.checkedIn
    });
  }

  setActiveDoctor(doctorId) {
    this.state.activeDoctorId = doctorId;
    this._saveAndBroadcast({
      type: 'ACTIVE_DOCTOR_CHANGED',
      doctorId
    });
  }

  toggleAudio(enabled) {
    this.state.audioEnabled = (enabled !== undefined) ? enabled : !this.state.audioEnabled;
    this._saveAndBroadcast({
      type: 'AUDIO_TOGGLED',
      enabled: this.state.audioEnabled
    });
  }

  /**
   * Reset the entire system back to clean hackathon demo state
   */
  resetDemoData() {
    this.state = this._getDefaultState();
    this._saveAndBroadcast({
      type: 'RESET_DEMO_DATA'
    });
  }
}

// Global Singleton Instance
window.store = new ClinicStore();
