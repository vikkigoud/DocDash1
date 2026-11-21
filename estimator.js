/**
 * DocDash: QueueZero - Dynamic Wait-Time & EWMA Estimator Engine
 * 
 * Formulas:
 * 1. Rolling EWMA: S_t = α * Y_t + (1 - α) * S_{t-1}
 * 2. Dynamic Wait: EstimatedWait = (QueuePosition - 1) * DynamicAverageDuration + DoctorOffsetDelay
 */

class WaitTimeEstimator {
  constructor(alpha = 0.35) {
    this.alpha = alpha; // Smoothing factor between 0.2 and 0.4
  }

  /**
   * Calculates Exponentially Weighted Moving Average from recent consultation durations.
   * @param {number[]} durations Array of recent consultation times (in minutes)
   * @param {number} fallbackBase Baseline default if history is empty
   * @returns {number} Smoothed average duration in minutes
   */
  calculateEWMA(durations, fallbackBase = 12) {
    if (!durations || durations.length === 0) return fallbackBase;
    
    // Start with the first observed value or baseline
    let ewma = durations[0];
    for (let i = 1; i < durations.length; i++) {
      ewma = (this.alpha * durations[i]) + ((1 - this.alpha) * ewma);
    }
    
    // Clamp to realistic range (4 mins to 45 mins)
    return Math.max(4, Math.min(45, Math.round(ewma * 10) / 10));
  }

  /**
   * Computes the relative queue position for a target token.
   * If token is currently in consultation, position is 0.
   * If token is the very next waiting patient, position is 1.
   * If token is 2 patients away, position is 2.
   * @param {Object} targetToken
   * @param {Object[]} doctorActiveTokens Active tokens for the doctor (IN_CONSULTATION + WAITING)
   * @returns {{ position: number, activeToken: Object|null, patientsAhead: number }}
   */
  computeQueuePosition(targetToken, doctorActiveTokens) {
    if (!targetToken || !doctorActiveTokens) {
      return { position: -1, activeToken: null, patientsAhead: 0 };
    }

    const activeToken = doctorActiveTokens.find(t => t.status === 'IN_CONSULTATION') || null;

    if (targetToken.status === 'IN_CONSULTATION') {
      return { position: 0, activeToken: targetToken, patientsAhead: 0 };
    }

    if (targetToken.status === 'COMPLETED' || targetToken.status === 'ABSENT') {
      return { position: -1, activeToken, patientsAhead: 0 };
    }

    // Filter only waiting tokens, sorted by emergency priority first, then tokenNumber
    const waitingTokens = doctorActiveTokens
      .filter(t => t.status === 'WAITING')
      .sort((a, b) => {
        // High priority / Emergency first
        if (a.isEmergency && !b.isEmergency) return -1;
        if (!a.isEmergency && b.isEmergency) return 1;
        return a.tokenNumber - b.tokenNumber;
      });

    const indexInWaiting = waitingTokens.findIndex(t => t.id === targetToken.id);
    if (indexInWaiting === -1) {
      return { position: -1, activeToken, patientsAhead: 0 };
    }

    // QueuePosition: 1 means next in line, 2 means 2 patients ahead, etc.
    const position = indexInWaiting + 1;
    // Patients ahead includes currently in consultation patient (if any) + waiting patients ahead
    const patientsAhead = (activeToken ? 1 : 0) + indexInWaiting;

    return { position, activeToken, patientsAhead };
  }

  /**
   * Calculates dynamic predicted wait time in minutes for a given token.
   * Formula: EstimatedWait = (QueuePosition - 1) * DynamicAverageDuration + DoctorOffsetDelay
   * Plus remaining time on currently active consultation.
   * 
   * @param {Object} token
   * @param {Object} doctor
   * @param {Object[]} allDoctorTokens
   * @returns {{
   *   estimatedMinutes: number,
   *   queuePosition: number,
   *   patientsAhead: number,
   *   activeTokenNumber: number|null,
   *   pacingAverage: number,
   *   isNextInLine: boolean,
   *   isAmberAlert: boolean,
   *   estimatedTimeFormatted: string
   * }}
   */
  estimateTokenWait(token, doctor, allDoctorTokens) {
    if (!token || !doctor) {
      return {
        estimatedMinutes: 0,
        queuePosition: 0,
        patientsAhead: 0,
        activeTokenNumber: null,
        pacingAverage: 12,
        isNextInLine: false,
        isAmberAlert: false,
        estimatedTimeFormatted: '0 mins'
      };
    }

    const { position, activeToken, patientsAhead } = this.computeQueuePosition(token, allDoctorTokens);

    if (position === 0) {
      return {
        estimatedMinutes: 0,
        queuePosition: 0,
        patientsAhead: 0,
        activeTokenNumber: activeToken ? activeToken.tokenNumber : token.tokenNumber,
        pacingAverage: doctor.ewmaDurationMinutes || doctor.baselineDurationMinutes || 12,
        isNextInLine: false,
        isAmberAlert: false,
        estimatedTimeFormatted: 'In Consultation Now'
      };
    }

    if (position < 0) {
      return {
        estimatedMinutes: 0,
        queuePosition: -1,
        patientsAhead: 0,
        activeTokenNumber: activeToken ? activeToken.tokenNumber : null,
        pacingAverage: doctor.ewmaDurationMinutes || doctor.baselineDurationMinutes || 12,
        isNextInLine: false,
        isAmberAlert: false,
        estimatedTimeFormatted: token.status === 'COMPLETED' ? 'Completed' : 'Status: ' + token.status
      };
    }

    // Dynamic pacing from doctor's EWMA
    const dynamicPacing = doctor.ewmaDurationMinutes || this.calculateEWMA(doctor.recentDurations, doctor.baselineDurationMinutes);
    const doctorDelay = Number(doctor.offsetDelayMinutes) || 0;

    // Remaining consultation duration of active patient if underway
    let activeTokenRemainingTime = 0;
    if (activeToken && activeToken.consultationStartedAt) {
      const elapsedMinutes = Math.floor((Date.now() - activeToken.consultationStartedAt) / 60000);
      activeTokenRemainingTime = Math.max(1, dynamicPacing - elapsedMinutes);
    } else if (activeToken) {
      activeTokenRemainingTime = dynamicPacing;
    }

    // Base wait for patients in line ahead
    const waitingAhead = Math.max(0, position - 1);
    const estimatedMinutes = Math.round(activeTokenRemainingTime + (waitingAhead * dynamicPacing) + doctorDelay);

    // Amber Alert: triggered when patient is exactly 2 tokens away (or <= 2 tokens away)
    // As per brief: "Amber alert when patient is 2 tokens away"
    const isAmberAlert = (position <= 2);
    const isNextInLine = (position === 1);

    return {
      estimatedMinutes: Math.max(0, estimatedMinutes),
      queuePosition: position,
      patientsAhead: position, // How many patients are ahead of this user
      activeTokenNumber: activeToken ? activeToken.tokenNumber : null,
      pacingAverage: dynamicPacing,
      isNextInLine,
      isAmberAlert,
      estimatedTimeFormatted: `${estimatedMinutes} mins`
    };
  }

  /**
   * Helper to format clock time from now + minutes ahead
   * e.g. "05:45 PM"
   */
  formatEstimatedClockTime(minutesAhead) {
    const target = new Date(Date.now() + minutesAhead * 60000);
    let hours = target.getHours();
    const minutes = target.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strMinutes = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${strMinutes} ${ampm}`;
  }
}

// Export singleton to window
window.WaitTimeEstimator = WaitTimeEstimator;
window.estimator = new WaitTimeEstimator(0.35);
