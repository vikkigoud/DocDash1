/**
 * DocDash: QueueZero - Main Application Controller
 * Minimal, clean, modern medical SPA controller with real-time sync & audio chimes
 */

(function () {
  'use strict';

  // --- Audio Synthesizer (Web Audio API) ---
  class SoundEffects {
    constructor() {
      this.ctx = null;
    }

    _init() {
      if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
      }
    }

    playChime(type = 'call') {
      const state = store.getState();
      if (!state.audioEnabled) return;

      try {
        this._init();
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') {
          this.ctx.resume();
        }

        const now = this.ctx.currentTime;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        gainNode.connect(this.ctx.destination);
        osc1.connect(gainNode);
        osc2.connect(gainNode);

        if (type === 'call') {
          // Pleasant two-tone hospital announcement chime (C5 -> E5)
          osc1.type = 'sine';
          osc2.type = 'triangle';
          osc1.frequency.setValueAtTime(523.25, now); // C5
          osc1.frequency.setValueAtTime(659.25, now + 0.15); // E5
          osc2.frequency.setValueAtTime(523.25 / 2, now);
          osc2.frequency.setValueAtTime(659.25 / 2, now + 0.15);

          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.linearRampToValueAtTime(0.2, now + 0.05);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 0.6);
          osc2.stop(now + 0.6);
        } else if (type === 'amber') {
          // Urgent amber alert dual chime
          osc1.type = 'sawtooth';
          osc1.frequency.setValueAtTime(440, now);
          osc1.frequency.setValueAtTime(880, now + 0.12);
          gainNode.gain.setValueAtTime(0.15, now);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

          osc1.start(now);
          osc1.stop(now + 0.5);
        }
      } catch (err) {
        console.warn('Audio play notice:', err);
      }
    }
  }

  const sfx = new SoundEffects();

  // --- Application State & Variables ---
  let activeView = 'directory';
  let consultationStopwatchInterval = null;
  let simulatedSmsHistory = [
    {
      id: 1,
      sender: 'DocDash-Alert',
      text: '✅ Welcome to DocDash QueueZero. Your virtual token #CARD-14 is confirmed for Dr. A. Mehta (Cardiology, Westside Pavilion).',
      time: '17:35',
      urgent: false
    },
    {
      id: 2,
      sender: 'DocDash-Alert',
      text: '⏱️ Live Queue Update: Dr. Mehta is currently seeing Token #CARD-11. You have 3 patients ahead. Est. wait: 36 mins.',
      time: '17:36',
      urgent: false
    }
  ];

  // DOM Elements
  const tabs = document.querySelectorAll('.nav-tab-btn');
  const viewSections = document.querySelectorAll('.view-section');
  const btnSplitToggle = document.getElementById('btn-split-toggle');
  const btnExitSplit = document.getElementById('btn-exit-split');
  const btnToggleAudio = document.getElementById('btn-toggle-audio');
  const audioIcon = document.getElementById('audio-icon');
  const btnResetDemo = document.getElementById('btn-reset-demo');
  const toastContainer = document.getElementById('toast-container');

  // Directory Elements
  const filterSpecialty = document.getElementById('filter-specialty');
  const filterClinic = document.getElementById('filter-clinic');
  const filterSearch = document.getElementById('filter-search');
  const doctorGridContainer = document.getElementById('doctor-grid-container');

  // TV Board Elements
  const tvDoctorSelect = document.getElementById('tv-doctor-select');
  const tvNowServingBox = document.getElementById('tv-now-serving-box');
  const tvServingTokenNumber = document.getElementById('tv-serving-token-number');
  const tvServingPatientName = document.getElementById('tv-serving-patient-name');
  const tvDoctorRoomInfo = document.getElementById('tv-doctor-room-info');
  const tvDoctorStatusBadge = document.getElementById('tv-doctor-status-badge');
  const tvPacingSpeed = document.getElementById('tv-pacing-speed');
  const tvShiftInfo = document.getElementById('tv-shift-info');
  const tvWaitingCount = document.getElementById('tv-waiting-count');
  const tvQueueList = document.getElementById('tv-queue-list');
  const heatmapContainer = document.getElementById('heatmap-container');

  // Doctor Console Elements
  const consoleDoctorSelect = document.getElementById('console-doctor-select');
  const consoleActiveToken = document.getElementById('console-active-token');
  const consoleActivePatientName = document.getElementById('console-active-patient-name');
  const consoleActiveSymptoms = document.getElementById('console-active-symptoms');
  const consoleTimer = document.getElementById('console-timer');
  const consoleEwmaText = document.getElementById('console-ewma-text');
  const consoleDelayText = document.getElementById('console-delay-text');
  const consoleHistoryText = document.getElementById('console-history-text');
  const consoleQueueTbody = document.getElementById('console-queue-tbody');
  const consoleQueueBadge = document.getElementById('console-queue-badge');
  const holdingQueueWrapper = document.getElementById('holding-queue-wrapper');
  const holdingQueueList = document.getElementById('holding-queue-list');
  const btnCallNext = document.getElementById('btn-call-next');
  const btnMarkCompleted = document.getElementById('btn-mark-completed');
  const btnDelay10 = document.getElementById('btn-delay-10');
  const btnSkipAbsent = document.getElementById('btn-skip-absent');
  const btnOpenEmergency = document.getElementById('btn-open-emergency');

  // Patient View Elements
  const patientActiveContainer = document.getElementById('patient-active-container');
  const geoDistanceSlider = document.getElementById('geo-distance-slider');
  const geoStatusPill = document.getElementById('geo-status-pill');
  const phoneChatStream = document.getElementById('phone-chat-stream');
  const btnQuickBookDemo = document.getElementById('btn-quick-book-demo');

  // Split Screen Panes
  const splitDoctorPaneContent = document.getElementById('split-doctor-pane-content');
  const splitPatientPaneContent = document.getElementById('split-patient-pane-content');

  // Modals
  const modalBook = document.getElementById('modal-book');
  const btnCloseBookModal = document.getElementById('btn-close-book-modal');
  const btnCancelBook = document.getElementById('btn-cancel-book');
  const formBookToken = document.getElementById('form-book-token');
  const bookDoctorId = document.getElementById('book-doctor-id');
  const bookDoctorSummary = document.getElementById('book-doctor-summary');
  const shiftMorning = document.getElementById('shift-morning');
  const shiftEvening = document.getElementById('shift-evening');

  const modalPass = document.getElementById('modal-pass');
  const btnClosePassModal = document.getElementById('btn-close-pass-modal');
  const btnDonePass = document.getElementById('btn-done-pass');
  const modalPassBody = document.getElementById('modal-pass-body');

  const modalEmergency = document.getElementById('modal-emergency');
  const btnCloseEmergencyModal = document.getElementById('btn-close-emergency-modal');
  const btnCancelEmergency = document.getElementById('btn-cancel-emergency');
  const formEmergencyEscalation = document.getElementById('form-emergency-escalation');

  // Selected Booking Shift
  let selectedBookingShift = 'Evening';

  // --- Initial Setup & Listeners ---
  function init() {
    setupNavigation();
    setupModals();
    setupControlConsole();
    setupFilters();
    setupGeolocationSlider();
    populateDoctorSelectors();
    renderHeatmap();
    startStopwatch();

    // Subscribe to Central Store
    store.subscribe((state, actionInfo) => {
      handleStoreUpdate(state, actionInfo);
    });
  }

  // Navigation Controller
  function setupNavigation() {
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetView = tab.getAttribute('data-view');
        switchView(targetView);
      });
    });

    btnSplitToggle.addEventListener('click', () => {
      if (activeView === 'split') {
        switchView('directory');
      } else {
        switchView('split');
      }
    });

    btnExitSplit.addEventListener('click', () => {
      switchView('directory');
    });

    btnToggleAudio.addEventListener('click', () => {
      const state = store.getState();
      store.toggleAudio(!state.audioEnabled);
      showToast(state.audioEnabled ? 'Audio chime muted' : 'Audio chime enabled', 'info');
    });

    btnResetDemo.addEventListener('click', () => {
      if (confirm('Reset DocDash to initial Hackathon Demo state (Dr. Mehta with Token #11 active, #14 booked)?')) {
        store.resetDemoData();
        simulatedSmsHistory = [
          {
            id: 1,
            sender: 'DocDash-Alert',
            text: '✅ Welcome to DocDash QueueZero. Your virtual token #CARD-14 is confirmed for Dr. A. Mehta (Cardiology, Westside Pavilion).',
            time: '17:35',
            urgent: false
          },
          {
            id: 2,
            sender: 'DocDash-Alert',
            text: '⏱️ Live Queue Update: Dr. Mehta is currently seeing Token #CARD-11. You have 3 patients ahead. Est. wait: 36 mins.',
            time: '17:36',
            urgent: false
          }
        ];
        renderSmsChat();
        showToast('Demo data restored successfully!', 'success');
      }
    });

    btnQuickBookDemo.addEventListener('click', () => {
      openBookModal('doc-mehta');
    });
  }

  function switchView(viewName) {
    activeView = viewName;

    // Update Tab Styles
    tabs.forEach(t => {
      if (t.getAttribute('data-view') === viewName) {
        t.classList.add('active');
      } else {
        t.classList.remove('active');
      }
    });

    if (viewName === 'split') {
      btnSplitToggle.classList.add('active');
    } else {
      btnSplitToggle.classList.remove('active');
    }

    // Update View Sections
    viewSections.forEach(section => {
      if (section.id === `view-${viewName}`) {
        section.classList.add('active');
      } else {
        section.classList.remove('active');
      }
    });

    // Re-render relevant view
    const state = store.getState();
    renderAllViews(state);
  }

  // --- Populate Selectors ---
  function populateDoctorSelectors() {
    const state = store.getState();
    const doctors = state.doctors;

    const populate = (elem) => {
      if (!elem) return;
      elem.innerHTML = doctors.map(d => `
        <option value="${d.id}" ${d.id === state.activeDoctorId ? 'selected' : ''}>
          ${d.name} — ${d.specialty} (${d.clinicName.split(' ')[0]})
        </option>
      `).join('');
    };

    populate(tvDoctorSelect);
    populate(consoleDoctorSelect);

    tvDoctorSelect.addEventListener('change', (e) => {
      store.setActiveDoctor(e.target.value);
    });

    consoleDoctorSelect.addEventListener('change', (e) => {
      store.setActiveDoctor(e.target.value);
    });
  }

  // --- Central Reactive Store Updates ---
  function handleStoreUpdate(state, actionInfo) {
    // Update Audio Icon
    if (audioIcon) {
      audioIcon.textContent = state.audioEnabled ? '🔊' : '🔇';
    }

    // Sync Active Doctor Selectors
    if (tvDoctorSelect && tvDoctorSelect.value !== state.activeDoctorId) {
      tvDoctorSelect.value = state.activeDoctorId;
    }
    if (consoleDoctorSelect && consoleDoctorSelect.value !== state.activeDoctorId) {
      consoleDoctorSelect.value = state.activeDoctorId;
    }

    // Handle Specific Action Alerts & Chimes
    if (actionInfo && actionInfo.type) {
      switch (actionInfo.type) {
        case 'TOKEN_CALLED':
          sfx.playChime('call');
          showToast(`Now Serving: ${actionInfo.token.formattedToken} (${actionInfo.token.patientName})`, 'success');
          checkPatientAmberAlertOnAdvance(state, actionInfo.token);
          break;
        case 'DOCTOR_DELAYED':
          showToast(`Dr. ${store.getDoctor(actionInfo.doctorId).name} announced +${actionInfo.delayMinutes} mins delay`, 'amber');
          addSmsMessage(`⏳ Clinic Notice: Dr. Mehta has experienced a 10-minute procedural delay. All queue estimates have been adjusted.`, true);
          break;
        case 'PATIENT_SKIPPED':
          showToast(`Absent token moved to holding queue. Next patient called!`, 'info');
          break;
        case 'EMERGENCY_ESCALATION':
          showToast(`🚨 Emergency patient injected at head of queue!`, 'danger');
          addSmsMessage(`🚨 Triage Priority Alert: An urgent emergency case was admitted. Queue shifted by 1 position.`, true);
          break;
        case 'TOKEN_BOOKED':
          showToast(`Token ${actionInfo.token.formattedToken} issued!`, 'success');
          break;
      }
    }

    renderAllViews(state);
  }

  // Checks whether the user's token is now 2 away or called, and fires the Amber Alert
  function checkPatientAmberAlertOnAdvance(state, calledToken) {
    const myAppointments = store.getMyAppointments();
    if (myAppointments.length === 0) return;

    const myToken = myAppointments[0]; // Patient A
    const doctor = store.getDoctor(myToken.doctorId);
    const doctorTokens = store.getDoctorTokens(myToken.doctorId);

    const estimate = estimator.estimateTokenWait(myToken, doctor, doctorTokens);

    if (calledToken.id === myToken.id) {
      sfx.playChime('call');
      addSmsMessage(`🎉 It's your turn! Please enter Room ${doctor.roomNumber} now. Dr. Mehta is ready to see you.`, true);
      showToast(`It's your turn! Proceed to ${doctor.roomNumber}.`, 'success');
    } else if (estimate.queuePosition === 2) {
      // The crucial Problem Brief demo trigger!
      sfx.playChime('amber');
      addSmsMessage(`⚠️ [DocDash Alert] Token #${myToken.tokenNumber}: Dr. Mehta is now seeing Token #${calledToken.tokenNumber}. You are 2 Patients Ahead — Est. Wait: ${estimate.estimatedMinutes} mins. Please arrive at the clinic now!`, true);
      showToast(`⚠️ Amber Alert: 2 Patients Ahead! Please arrive at the clinic now.`, 'amber');
    }
  }

  function renderAllViews(state) {
    renderDoctorDirectory(state);
    renderTvBoard(state);
    renderDoctorConsole(state);
    renderPatientView(state);
    renderSplitScreen(state);
    renderSmsChat();
  }

  // ==========================================================================
  // VIEW 1: Doctor Directory Rendering
  // ==========================================================================
  function setupFilters() {
    const triggerFilter = () => {
      const state = store.getState();
      renderDoctorDirectory(state);
    };

    filterSpecialty.addEventListener('change', triggerFilter);
    filterClinic.addEventListener('change', triggerFilter);
    filterSearch.addEventListener('input', triggerFilter);
  }

  function renderDoctorDirectory(state) {
    const specialty = filterSpecialty.value;
    const clinic = filterClinic.value;
    const query = filterSearch.value;

    const doctors = store.getDoctors(specialty, clinic, query);

    if (doctors.length === 0) {
      doctorGridContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: var(--white); border-radius: var(--radius-md); border: 1px dashed var(--slate-300);">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">🔍</div>
          <h3 style="font-weight: 700; color: var(--dark);">No doctors found</h3>
          <p style="color: var(--slate-500); font-size: 0.85rem;">Try adjusting your specialty or clinic branch filters.</p>
        </div>
      `;
      return;
    }

    doctorGridContainer.innerHTML = doctors.map(doc => {
      const activeTokens = store.getActiveDoctorTokens(doc.id);
      const serving = activeTokens.find(t => t.status === 'IN_CONSULTATION');
      const waitingCount = activeTokens.filter(t => t.status === 'WAITING').length;
      const ewmaPace = doc.ewmaDurationMinutes || doc.baselineDurationMinutes;

      // Status pill class
      let statusClass = 'status-available';
      let statusText = 'Available';
      if (doc.status === 'IN_CONSULTATION') {
        statusClass = 'status-in-consultation';
        statusText = 'In Consultation';
      } else if (doc.status === 'DELAYED') {
        statusClass = 'status-delayed';
        statusText = `Delayed (+${doc.offsetDelayMinutes}m)`;
      }

      return `
        <div class="doctor-card">
          <div class="doctor-card-header">
            <div class="doctor-avatar">${doc.avatar}</div>
            <div class="doctor-info">
              <h3>${doc.name}</h3>
              <div class="doctor-degrees">${doc.degrees}</div>
              <span class="badge-specialty spec-${doc.specialty.replace(/\s+/g, '-')}">
                ${doc.specialty}
              </span>
            </div>
          </div>

          <div class="doctor-meta-list">
            <div class="doctor-meta-item">
              <span>🏥 Clinic:</span>
              <strong>${doc.clinicName.split(' ')[0]} ${doc.clinicName.split(' ')[1] || ''}</strong>
            </div>
            <div class="doctor-meta-item">
              <span>📍 Location:</span>
              <span>${doc.roomNumber}</span>
            </div>
            <div class="doctor-meta-item">
              <span>⏱️ Pacing Speed:</span>
              <span><strong>~${ewmaPace} mins</strong> / patient</span>
            </div>
            <div class="doctor-meta-item">
              <span>💵 Fee:</span>
              <span><strong>$${doc.consultationFee}</strong></span>
            </div>
          </div>

          <div class="doctor-queue-status">
            <div>
              <div style="font-size: 0.725rem; color: var(--slate-500); font-weight: 600;">ACTIVE QUEUE</div>
              <div style="font-size: 0.875rem; font-weight: 800; color: var(--dark);">
                ${serving ? `Serving ${serving.formattedToken}` : 'Queue Idle'}
                <span style="font-size:0.75rem; font-weight:500; color:var(--slate-500);">(${waitingCount} waiting)</span>
              </div>
            </div>
            <span class="queue-pill ${statusClass}">${statusText}</span>
          </div>

          <button class="btn-book" onclick="window.docdashApp.openBookModal('${doc.id}')">
            <span>🎟️</span> Book Consultation Token
          </button>
        </div>
      `;
    }).join('');
  }

  // ==========================================================================
  // VIEW 2: Live Waiting Room TV Board
  // ==========================================================================
  function renderTvBoard(state) {
    const doctor = store.getDoctor(state.activeDoctorId);
    if (!doctor) return;

    const allTokens = store.getDoctorTokens(doctor.id);
    const activeTokens = store.getActiveDoctorTokens(doctor.id);
    const serving = activeTokens.find(t => t.status === 'IN_CONSULTATION');
    const waitingTokens = activeTokens.filter(t => t.status === 'WAITING');

    // Update NOW SERVING Box
    if (serving) {
      tvServingTokenNumber.textContent = serving.formattedToken;
      tvServingPatientName.textContent = serving.patientName;
      tvDoctorStatusBadge.className = 'tv-doctor-status-badge status-in-consultation';
      tvDoctorStatusBadge.textContent = '● In Consultation';
    } else {
      tvServingTokenNumber.textContent = '---';
      tvServingPatientName.textContent = 'No Patient In Consultation';
      tvDoctorStatusBadge.className = 'tv-doctor-status-badge status-available';
      tvDoctorStatusBadge.textContent = '● Ready For Next';
    }

    if (doctor.status === 'DELAYED') {
      tvDoctorStatusBadge.className = 'tv-doctor-status-badge status-delayed';
      tvDoctorStatusBadge.textContent = `● Delayed (+${doctor.offsetDelayMinutes} mins)`;
    }

    tvDoctorRoomInfo.innerHTML = `
      <span>👨‍⚕️ ${doctor.name} (${doctor.specialty})</span>
      <span>📍 ${doctor.roomNumber} • ${doctor.clinicName}</span>
    `;

    const ewmaPace = doctor.ewmaDurationMinutes || doctor.baselineDurationMinutes;
    tvPacingSpeed.textContent = `${ewmaPace} mins / patient (EWMA)`;
    tvShiftInfo.textContent = `${doctor.eveningShift} (Evening)`;
    tvWaitingCount.textContent = `${waitingTokens.length} Patients Waiting`;

    // Render Next Up List
    if (waitingTokens.length === 0) {
      tvQueueList.innerHTML = `
        <div style="text-align:center; padding:2rem; color:var(--slate-400); font-size:0.85rem;">
          No patients waiting in queue right now.
        </div>
      `;
    } else {
      const myAppointments = store.getMyAppointments().map(t => t.id);

      tvQueueList.innerHTML = waitingTokens.map((t, index) => {
        const estimate = estimator.estimateTokenWait(t, doctor, allTokens);
        const isUser = myAppointments.includes(t.id);
        const isEmergency = t.isEmergency;

        return `
          <div class="queue-list-item ${isUser ? 'is-user' : ''} ${isEmergency ? 'is-emergency' : ''}">
            <div class="item-left">
              <span class="item-pos-badge" style="${isEmergency ? 'background:#ef4444; color:#fff;' : ''}">
                ${isEmergency ? '🚨' : index + 1}
              </span>
              <div>
                <div class="item-token-code">
                  ${t.formattedToken}
                  ${isUser ? '<span style="font-size:0.7rem; background:#10b981; color:#fff; padding:0.1rem 0.4rem; border-radius:999px; margin-left:0.35rem;">YOU</span>' : ''}
                </div>
                <div class="item-patient-name">${t.patientName} (${t.shift} Shift)</div>
              </div>
            </div>

            <div class="item-right">
              <span style="font-size:0.75rem; color:${t.checkedIn ? 'var(--success)' : 'var(--slate-400)'};">
                ${t.checkedIn ? '✅ Checked In' : '📍 Remote (' + t.distanceMeters + 'm)'}
              </span>
              <span class="est-wait-pill">
                ~${estimate.estimatedMinutes} mins
              </span>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  function renderHeatmap() {
    const data = window.CLINIC_HEATMAP_DATA;
    if (!data || !heatmapContainer) return;

    heatmapContainer.innerHTML = data.days.map((day, dIdx) => {
      return `
        <div style="background:var(--slate-50); border:1px solid var(--slate-200); border-radius:var(--radius-sm); padding:0.5rem 0.25rem;">
          <div style="font-weight:800; margin-bottom:0.35rem; color:var(--slate-700);">${day}</div>
          <div style="display:flex; flex-direction:column; gap:0.25rem;">
            ${data.slots.map((slot, sIdx) => {
              const waitMins = data.data[dIdx][sIdx];
              let bgColor = '#dcfce7'; // green < 25m
              let textColor = '#15803d';
              if (waitMins >= 25 && waitMins < 40) {
                bgColor = '#fef3c7'; // yellow
                textColor = '#b45309';
              } else if (waitMins >= 40) {
                bgColor = '#fee2e2'; // red
                textColor = '#b91c1c';
              }
              return `
                <div style="background:${bgColor}; color:${textColor}; padding:0.2rem 0.15rem; border-radius:4px; font-weight:700; font-size:0.7rem;" title="${slot}: ~${waitMins}m average wait">
                  ${slot.split(' ')[0]}: ${waitMins}m
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  // ==========================================================================
  // VIEW 3: Doctor Consultation Control Console
  // ==========================================================================
  function setupControlConsole() {
    btnCallNext.addEventListener('click', () => {
      const state = store.getState();
      store.callNextPatient(state.activeDoctorId);
    });

    btnMarkCompleted.addEventListener('click', () => {
      const state = store.getState();
      store.markCompleted(state.activeDoctorId);
      showToast('Consultation marked completed', 'success');
    });

    btnDelay10.addEventListener('click', () => {
      const state = store.getState();
      store.delayDoctor(state.activeDoctorId, 10);
    });

    btnSkipAbsent.addEventListener('click', () => {
      const state = store.getState();
      const activeTokens = store.getActiveDoctorTokens(state.activeDoctorId);
      const serving = activeTokens.find(t => t.status === 'IN_CONSULTATION');
      if (serving) {
        store.skipAbsentPatient(state.activeDoctorId, serving.id);
      } else {
        showToast('No active patient to skip', 'info');
      }
    });

    btnOpenEmergency.addEventListener('click', () => {
      openEmergencyModal();
    });
  }

  function renderDoctorConsole(state) {
    const doctor = store.getDoctor(state.activeDoctorId);
    if (!doctor) return;

    consoleQueueBadge.textContent = `${doctor.specialty} OPD • ${doctor.roomNumber}`;
    consoleQueueBadge.className = `badge-specialty spec-${doctor.specialty.replace(/\s+/g, '-')}`;

    const allTokens = store.getDoctorTokens(doctor.id);
    const activeTokens = store.getActiveDoctorTokens(doctor.id);
    const serving = activeTokens.find(t => t.status === 'IN_CONSULTATION');
    const waitingTokens = activeTokens.filter(t => t.status === 'WAITING');

    // Active Consultation Box
    if (serving) {
      consoleActiveToken.textContent = serving.formattedToken;
      consoleActivePatientName.textContent = `${serving.patientName} (Age: ${serving.age || 35})`;
      consoleActiveSymptoms.textContent = `Chief Complaint: ${serving.symptoms || 'General consultation'}`;
    } else {
      consoleActiveToken.textContent = 'None Active';
      consoleActivePatientName.textContent = 'Room is currently free';
      consoleActiveSymptoms.textContent = 'Click "Call Next Patient" to advance the queue.';
    }

    // Pacing Statistics
    const ewmaPace = doctor.ewmaDurationMinutes || doctor.baselineDurationMinutes;
    consoleEwmaText.textContent = `${ewmaPace} mins / pt`;
    consoleDelayText.textContent = `+${doctor.offsetDelayMinutes || 0} mins`;
    consoleHistoryText.textContent = (doctor.recentDurations || [12, 10, 14, 11, 13]).map(m => `${m}m`).join(', ');

    // Active Queue Table
    if (waitingTokens.length === 0) {
      consoleQueueTbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; color: var(--slate-400); padding: 2rem;">
            No patients waiting in queue.
          </td>
        </tr>
      `;
    } else {
      consoleQueueTbody.innerHTML = waitingTokens.map(t => {
        const estimate = estimator.estimateTokenWait(t, doctor, allTokens);
        return `
          <tr>
            <td>
              <strong style="color:var(--dark); font-size:0.95rem;">${t.formattedToken}</strong>
              ${t.isEmergency ? '<span style="font-size:0.65rem; background:#fee2e2; color:#b91c1c; padding:0.1rem 0.35rem; border-radius:999px; font-weight:800; margin-left:0.25rem;">EMERGENCY</span>' : ''}
            </td>
            <td>
              <strong>${t.patientName}</strong>
              <div style="font-size:0.75rem; color:var(--slate-500);">${t.phone}</div>
            </td>
            <td style="max-width:200px; font-size:0.8rem; color:var(--slate-600);">${t.symptoms}</td>
            <td>
              <span style="font-size:0.75rem; font-weight:700; color:${t.checkedIn ? 'var(--success)' : 'var(--slate-500)'};">
                ${t.checkedIn ? '● In Clinic' : `${t.distanceMeters}m away`}
              </span>
            </td>
            <td>
              <span class="est-wait-pill">~${estimate.estimatedMinutes}m</span>
            </td>
            <td>
              <button class="btn-console-secondary" style="padding:0.25rem 0.5rem; font-size:0.75rem;" onclick="window.docdashApp.skipToken('${t.id}')">
                Skip
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }

    // Absent / Skipped Holding Area
    const absentTokens = state.tokens.filter(t => t.doctorId === doctor.id && t.status === 'ABSENT');
    if (absentTokens.length > 0) {
      holdingQueueWrapper.style.display = 'block';
      holdingQueueList.innerHTML = absentTokens.map(t => `
        <div style="background:var(--white); border:1px solid #cbd5e1; border-radius:var(--radius-sm); padding:0.4rem 0.65rem; display:flex; align-items:center; gap:0.5rem; font-size:0.775rem;">
          <strong>${t.formattedToken}</strong>: ${t.patientName}
          <button style="border:none; background:#e0f2fe; color:#0369a1; padding:0.15rem 0.4rem; border-radius:4px; font-weight:700; cursor:pointer;" onclick="window.docdashApp.restoreToken('${t.id}')">
            Recall to Line
          </button>
        </div>
      `).join('');
    } else {
      holdingQueueWrapper.style.display = 'none';
    }
  }

  // Stopwatch for active consultation elapsed timer
  function startStopwatch() {
    if (consultationStopwatchInterval) clearInterval(consultationStopwatchInterval);
    consultationStopwatchInterval = setInterval(() => {
      const state = store.getState();
      const doctor = store.getDoctor(state.activeDoctorId);
      if (!doctor) return;

      const activeTokens = store.getActiveDoctorTokens(doctor.id);
      const serving = activeTokens.find(t => t.status === 'IN_CONSULTATION');

      if (serving && serving.consultationStartedAt) {
        const elapsedSecs = Math.floor((Date.now() - serving.consultationStartedAt) / 1000);
        const mins = String(Math.floor(elapsedSecs / 60)).padStart(2, '0');
        const secs = String(elapsedSecs % 60).padStart(2, '0');
        if (consoleTimer) {
          consoleTimer.textContent = `${mins}:${secs}`;
        }
      } else {
        if (consoleTimer) {
          consoleTimer.textContent = '00:00';
        }
      }
    }, 1000);
  }

  // ==========================================================================
  // VIEW 4: My Appointments & SMS Notification Simulator
  // ==========================================================================
  function setupGeolocationSlider() {
    geoDistanceSlider.addEventListener('input', (e) => {
      const meters = parseInt(e.target.value, 10);
      const myAppointments = store.getMyAppointments();
      if (myAppointments.length > 0) {
        const targetToken = myAppointments[0];
        store.simulateCheckIn(targetToken.id, meters);
      }
    });
  }

  function renderPatientView(state) {
    const myAppointments = store.getMyAppointments();

    if (myAppointments.length === 0) {
      patientActiveContainer.innerHTML = `
        <div style="text-align:center; padding:3rem 1rem;">
          <div style="font-size:3rem; margin-bottom:0.5rem;">🎟️</div>
          <h3 style="font-weight:800; color:var(--dark);">No Active Token</h3>
          <p style="color:var(--slate-500); font-size:0.875rem; margin-bottom:1.25rem;">
            You have not booked any virtual consultation tokens yet.
          </p>
          <button class="btn-modal-submit" onclick="window.docdashApp.openBookModal('doc-mehta')">
            Book Token with Dr. Mehta
          </button>
        </div>
      `;
      return;
    }

    // Default to the first booked token (Patient A)
    const myToken = myAppointments[0];
    const doctor = store.getDoctor(myToken.doctorId);
    const allTokens = store.getDoctorTokens(myToken.doctorId);

    const estimate = estimator.estimateTokenWait(myToken, doctor, allTokens);

    // Geolocation sync with slider
    geoDistanceSlider.value = myToken.distanceMeters || 1400;
    if (myToken.checkedIn) {
      geoStatusPill.className = 'queue-pill status-in-consultation';
      geoStatusPill.textContent = `Auto Checked In (${myToken.distanceMeters}m)`;
    } else {
      geoStatusPill.className = 'queue-pill status-delayed';
      geoStatusPill.textContent = `${myToken.distanceMeters}m Away`;
    }

    // Calculate queue progress percentage
    // Total in queue = (serving ? 1 : 0) + waiting
    const totalQueueLength = allTokens.filter(t => t.status === 'IN_CONSULTATION' || t.status === 'WAITING').length;
    let progressPercent = 30;
    if (estimate.queuePosition === 0) progressPercent = 100;
    else if (estimate.queuePosition === 1) progressPercent = 80;
    else if (estimate.queuePosition === 2) progressPercent = 60;
    else progressPercent = 35;

    // Render Live Patient Card
    patientActiveContainer.innerHTML = `
      <!-- Amber Alert Banner when patient is 2 tokens away -->
      ${estimate.isAmberAlert && estimate.queuePosition > 0 ? `
        <div class="amber-alert-banner">
          <div class="amber-alert-icon">⚠️</div>
          <div class="amber-alert-text">
            <h4>Immediate Action: Please Arrive At Clinic Now!</h4>
            <p>
              Dr. Mehta is currently seeing Token #${estimate.activeTokenNumber}.
              You are <strong>${estimate.patientsAhead} Patients Ahead</strong> with approximately <strong>${estimate.estimatedMinutes} minutes</strong> remaining.
            </p>
          </div>
        </div>
      ` : ''}

      <div class="ticket-header">
        <div>
          <span class="brand-badge">${myToken.shift} Shift Consultation</span>
          <h3 style="font-size:1.35rem; font-weight:800; color:var(--dark); margin-top:0.35rem;">
            ${doctor.name}
          </h3>
          <div style="font-size:0.825rem; color:var(--slate-500);">
            ${doctor.specialty} • ${doctor.roomNumber} (${doctor.clinicName})
          </div>
        </div>
        <div style="text-align:right;">
          <span class="queue-pill ${myToken.checkedIn ? 'status-in-consultation' : 'status-available'}">
            ${myToken.checkedIn ? '✅ Geofence Activated' : '📍 ' + myToken.distanceMeters + 'm Away'}
          </span>
        </div>
      </div>

      <!-- Ticket Hero: Large Token & Wait Time -->
      <div class="ticket-hero">
        <div class="ticket-token-box">
          <span class="token-sub-label">Your Consultation Token</span>
          <span class="token-big-highlight">${myToken.formattedToken}</span>
          <span style="font-size:0.75rem; color:var(--slate-500); margin-top:0.25rem;">
            Booked for: <strong>${myToken.patientName}</strong>
          </span>
        </div>

        <div class="live-countdown-box">
          <span class="countdown-label">Predicted Wait Time</span>
          <div class="countdown-digits">
            ${estimate.queuePosition === 0 ? 'Inside Now' : `~${estimate.estimatedMinutes} <span style="font-size:1.2rem; font-weight:600;">min</span>`}
          </div>
          <span style="font-size:0.75rem; color:var(--slate-500);">
            ${estimate.queuePosition === 0 ? 'Consultation In Progress' : 'Est. Call: ' + estimator.formatEstimatedClockTime(estimate.estimatedMinutes)}
          </span>
        </div>
      </div>

      <!-- Live Queue Progress Bar -->
      <div class="queue-progress-wrapper">
        <div class="progress-labels">
          <span>Active In Room: <strong>#${estimate.activeTokenNumber || '---'}</strong></span>
          <span>
            ${estimate.queuePosition === 0 ? '🎉 Your Turn Now' : `<strong>${estimate.patientsAhead}</strong> Patients Ahead of You`}
          </span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width: ${progressPercent}%;"></div>
        </div>
      </div>

      <!-- Additional Details & Print Pass -->
      <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px dashed var(--slate-200); padding-top:1rem; font-size:0.8rem; color:var(--slate-600);">
        <div>
          <span>Doctor Pacing: <strong>${estimate.pacingAverage} mins/patient</strong></span>
        </div>
        <button class="btn-console-secondary" onclick="window.docdashApp.openPassModal('${myToken.id}')">
          🖨️ View Full Token Pass
        </button>
      </div>
    `;
  }

  // Add message to SMS thread
  function addSmsMessage(text, isUrgent = false) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    simulatedSmsHistory.unshift({
      id: Date.now(),
      sender: 'DocDash-Alert',
      text,
      time,
      urgent: isUrgent
    });
    renderSmsChat();
  }

  function renderSmsChat() {
    if (!phoneChatStream) return;
    phoneChatStream.innerHTML = simulatedSmsHistory.map(msg => `
      <div class="sms-bubble ${msg.urgent ? 'urgent' : ''}">
        <div style="font-weight:700; font-size:0.7rem; color:${msg.urgent ? '#b45309' : '#0369a1'}; margin-bottom:0.2rem;">
          ${msg.sender}
        </div>
        <div>${msg.text}</div>
        <div class="sms-time">${msg.time}</div>
      </div>
    `).join('');
  }

  // ==========================================================================
  // VIEW 5: Split-Screen Live Demo Mode
  // ==========================================================================
  function renderSplitScreen(state) {
    const doctor = store.getDoctor('doc-mehta'); // Pin to Dr. Mehta for target demo
    if (!doctor) return;

    const allTokens = store.getDoctorTokens(doctor.id);
    const activeTokens = store.getActiveDoctorTokens(doctor.id);
    const serving = activeTokens.find(t => t.status === 'IN_CONSULTATION');
    const waitingTokens = activeTokens.filter(t => t.status === 'WAITING');

    // Split Left: Doctor Console
    splitDoctorPaneContent.innerHTML = `
      <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:var(--radius-sm); padding:1rem; margin-bottom:1rem;">
        <div style="font-size:0.725rem; font-weight:800; color:#15803d; text-transform:uppercase;">Currently In Room</div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:2rem; font-weight:900; color:#15803d;">
            ${serving ? serving.formattedToken : 'Free'}
          </span>
          <span style="font-weight:700; color:#166534;">
            ${serving ? serving.patientName : ''}
          </span>
        </div>
      </div>

      <div style="display:flex; flex-direction:column; gap:0.5rem; margin-bottom:1rem;">
        <button class="btn-console-primary" style="padding:0.75rem;" onclick="store.callNextPatient('doc-mehta')">
          ▶ Call Next Patient (Advances Token)
        </button>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem;">
          <button class="btn-console-secondary btn-delay" onclick="store.delayDoctor('doc-mehta', 10)">
            ⏳ Delay 10 Mins
          </button>
          <button class="btn-console-secondary" onclick="store.markCompleted('doc-mehta')">
            ✅ Mark Completed
          </button>
        </div>
      </div>

      <div style="font-size:0.8rem; font-weight:700; color:var(--slate-700); margin-bottom:0.4rem;">
        Waiting Line (${waitingTokens.length} Patients)
      </div>
      <div style="display:flex; flex-direction:column; gap:0.35rem; max-height:220px; overflow-y:auto;">
        ${waitingTokens.map((t, idx) => `
          <div style="background:var(--slate-50); border:1px solid var(--slate-200); padding:0.4rem 0.65rem; border-radius:4px; display:flex; justify-content:space-between; font-size:0.8rem;">
            <span><strong>#${idx + 1} ${t.formattedToken}</strong> (${t.patientName})</span>
            <span style="font-weight:700; color:var(--primary);">Pos: ${idx + 1}</span>
          </div>
        `).join('')}
      </div>
    `;

    // Split Right: Patient Tracker (Token #14)
    const myAppointments = store.getMyAppointments();
    const myToken = myAppointments[0] || state.tokens.find(t => t.id === 'tkn-mehta-14');

    if (!myToken) {
      splitPatientPaneContent.innerHTML = `<div>No token selected</div>`;
      return;
    }

    const estimate = estimator.estimateTokenWait(myToken, doctor, allTokens);

    splitPatientPaneContent.innerHTML = `
      ${estimate.isAmberAlert && estimate.queuePosition > 0 ? `
        <div class="amber-alert-banner" style="padding:0.75rem; margin-bottom:0.75rem;">
          <div class="amber-alert-icon">⚠️</div>
          <div class="amber-alert-text">
            <h4 style="font-size:0.85rem;">Amber Alert: Please Arrive At Clinic Now!</h4>
            <p style="font-size:0.75rem;">
              Dr. Mehta called Token #${estimate.activeTokenNumber}. Only <strong>${estimate.patientsAhead} Patients Ahead</strong> (Est. Wait: <strong>${estimate.estimatedMinutes} mins</strong>).
            </p>
          </div>
        </div>
      ` : ''}

      <div style="background:var(--slate-50); border:1px dashed var(--slate-300); border-radius:var(--radius-sm); padding:1rem; margin-bottom:1rem; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <div style="font-size:0.7rem; font-weight:700; color:var(--slate-500); text-transform:uppercase;">Your Token</div>
          <div style="font-size:2.25rem; font-weight:900; color:var(--primary); line-height:1;">
            ${myToken.formattedToken}
          </div>
          <div style="font-size:0.75rem; color:var(--slate-600); margin-top:0.25rem;">
            ${myToken.patientName}
          </div>
        </div>

        <div style="text-align:right;">
          <div style="font-size:0.7rem; font-weight:700; color:var(--slate-500); text-transform:uppercase;">Est. Wait</div>
          <div style="font-size:1.75rem; font-weight:800; color:var(--dark); line-height:1;">
            ${estimate.queuePosition === 0 ? 'Inside' : `~${estimate.estimatedMinutes}m`}
          </div>
          <div style="font-size:0.725rem; color:var(--slate-500);">
            ${estimate.patientsAhead} Patients Ahead
          </div>
        </div>
      </div>

      <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:var(--radius-sm); padding:0.75rem; font-size:0.775rem;">
        <strong style="color:#b45309;">📱 Live SMS Preview:</strong>
        <div style="margin-top:0.25rem; color:var(--slate-700);">
          ${simulatedSmsHistory[0] ? simulatedSmsHistory[0].text : 'No alerts yet'}
        </div>
      </div>
    `;
  }

  // ==========================================================================
  // MODALS & ACTIONS
  // ==========================================================================
  function setupModals() {
    // Book Modal
    btnCloseBookModal.addEventListener('click', closeBookModal);
    btnCancelBook.addEventListener('click', closeBookModal);

    shiftMorning.addEventListener('click', () => {
      selectedBookingShift = 'Morning';
      shiftMorning.classList.add('selected');
      shiftEvening.classList.remove('selected');
    });

    shiftEvening.addEventListener('click', () => {
      selectedBookingShift = 'Evening';
      shiftEvening.classList.add('selected');
      shiftMorning.classList.remove('selected');
    });

    formBookToken.addEventListener('submit', (e) => {
      e.preventDefault();
      const docId = bookDoctorId.value;
      const patientName = document.getElementById('book-patient-name').value;
      const phone = document.getElementById('book-phone').value;
      const age = document.getElementById('book-age').value;
      const symptoms = document.getElementById('book-symptoms').value;

      try {
        const token = store.bookToken({
          patientName,
          phone,
          age,
          doctorId: docId,
          shift: selectedBookingShift,
          symptoms
        });

        closeBookModal();
        openPassModal(token.id);

        addSmsMessage(`✅ Virtual Token #${token.formattedToken} confirmed for ${patientName}. You will receive SMS alerts as your turn approaches.`);
      } catch (err) {
        alert(err.message);
      }
    });

    // Pass Modal
    btnClosePassModal.addEventListener('click', () => modalPass.classList.remove('active'));
    btnDonePass.addEventListener('click', () => {
      modalPass.classList.remove('active');
      switchView('patient');
    });

    // Emergency Modal
    btnCloseEmergencyModal.addEventListener('click', closeEmergencyModal);
    btnCancelEmergency.addEventListener('click', closeEmergencyModal);

    formEmergencyEscalation.addEventListener('submit', (e) => {
      e.preventDefault();
      const state = store.getState();
      const patientName = document.getElementById('em-patient-name').value;
      const triageNotes = document.getElementById('em-triage-notes').value;

      store.injectEmergencyPatient({
        doctorId: state.activeDoctorId,
        patientName,
        triageNotes
      });

      closeEmergencyModal();
    });
  }

  function openBookModal(doctorId) {
    const doc = store.getDoctor(doctorId);
    if (!doc) return;

    bookDoctorId.value = doc.id;
    bookDoctorSummary.innerHTML = `
      <strong>${doc.name}</strong> • ${doc.specialty}
      <div style="color:var(--slate-500); font-size:0.75rem;">${doc.clinicName} (${doc.roomNumber}) — Fee: $${doc.consultationFee}</div>
    `;

    modalBook.classList.add('active');
  }

  function closeBookModal() {
    modalBook.classList.remove('active');
  }

  function openPassModal(tokenId) {
    const token = store.getState().tokens.find(t => t.id === tokenId);
    if (!token) return;

    const doc = store.getDoctor(token.doctorId);

    modalPassBody.innerHTML = `
      <div class="token-pass-card">
        <span class="brand-badge" style="background:#e0f2fe; color:#0369a1;">Outpatient Digital Token Pass</span>
        <div style="font-size:2.5rem; font-weight:900; color:var(--primary); margin:0.5rem 0;">
          ${token.formattedToken}
        </div>
        <div style="font-size:1.1rem; font-weight:700; color:var(--dark);">
          ${token.patientName} (Age: ${token.age})
        </div>
        <div style="font-size:0.85rem; color:var(--slate-500); margin-bottom:1rem;">
          ${doc.name} • ${doc.specialty} (${doc.roomNumber})
        </div>

        <div class="pass-qr-box">
          📱
        </div>

        <div style="font-size:0.8rem; color:var(--slate-600); line-height:1.4;">
          <strong>Clinic Branch:</strong> ${doc.clinicName}<br>
          <strong>Consultation Shift:</strong> ${token.shift} Shift<br>
          <strong>Reporting Advice:</strong> Please be within 500m of the clinic when 2 tokens remain.
        </div>
      </div>
    `;

    modalPass.classList.add('active');
  }

  function openEmergencyModal() {
    modalEmergency.classList.add('active');
  }

  function closeEmergencyModal() {
    modalEmergency.classList.remove('active');
  }

  // Toast Notification Helper
  function showToast(message, type = 'info') {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span>${type === 'success' ? '✅' : type === 'amber' ? '⚠️' : type === 'danger' ? '🚨' : 'ℹ️'}</span>
      <span>${message}</span>
    `;

    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // Expose global methods for inline HTML onclick handlers
  window.docdashApp = {
    openBookModal,
    openPassModal,
    skipToken: (tokenId) => {
      const state = store.getState();
      store.skipAbsentPatient(state.activeDoctorId, tokenId);
    },
    restoreToken: (tokenId) => {
      store.restoreAbsentPatient(tokenId);
    }
  };

  // Launch application on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
