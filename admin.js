// LocalStorage Keys
const APPOINTMENTS_KEY = 'counseling_appointments';
const CONFIG_KEY = 'counseling_config';

let calendar = null;
let selectedApptId = null;

// Mock Google Calendar API Log Helper
function logGoogleCalendarAction(action, appt) {
  const isSyncEnabled = document.getElementById('sync-google-cal').checked;
  if (!isSyncEnabled) return;

  const colorMap = {
    pending: 'Amber (Color ID: 5)',
    confirmed: 'Emerald (Color ID: 10)',
    completed: 'Slate (Color ID: 8)'
  };

  console.log(`[Google Calendar API Sync] Action: ${action}`);
  console.log(`- Event ID: gcal_${appt.id}`);
  console.log(`- Summary: [상담 신청] ${appt.studentId} ${appt.name}`);
  console.log(`- Time: ${appt.date}T${appt.time}:00`);
  console.log(`- Status Color: ${colorMap[appt.status]}`);
  console.log(`- Status: ${appt.status}`);
}

// Dom Elements
const noSelectionMsg = document.getElementById('no-selection-msg');
const selectionDetails = document.getElementById('selection-details');
const apptListBody = document.getElementById('appt-list-body');
const searchInput = document.getElementById('admin-search-input');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadConfig();
  initCalendar();
  renderApptList();
  setupEventListeners();
});

// Load Config from LocalStorage
function loadConfig() {
  const config = JSON.parse(localStorage.getItem(CONFIG_KEY)) || {
    purpose: 'admin-only',
    googleSync: false,
    clientId: '',
    apiKey: ''
  };

  // Set purpose
  const radio = document.querySelector(`input[name="use-purpose"][value="${config.purpose}"]`);
  if (radio) radio.checked = true;

  // Set google sync
  const syncCheck = document.getElementById('sync-google-cal');
  if (syncCheck) {
    syncCheck.checked = config.googleSync;
    toggleGoogleSettings(config.googleSync);
  }

  // Set client ID and api key
  document.getElementById('g-client-id').value = config.clientId || '';
  document.getElementById('g-api-key').value = config.apiKey || '';
}

// Save Config to LocalStorage
function saveConfig() {
  const purpose = document.querySelector('input[name="use-purpose"]:checked').value;
  const googleSync = document.getElementById('sync-google-cal').checked;
  const clientId = document.getElementById('g-client-id').value.trim();
  const apiKey = document.getElementById('g-api-key').value.trim();

  const config = { purpose, googleSync, clientId, apiKey };
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

// Toggle Google Settings View
function toggleGoogleSettings(show) {
  const settingsDiv = document.getElementById('google-cal-settings');
  if (settingsDiv) {
    settingsDiv.style.display = show ? 'block' : 'none';
  }
}

// Helper: Get appointments
function getAppointments() {
  const data = localStorage.getItem(APPOINTMENTS_KEY);
  return data ? JSON.parse(data) : [];
}

// Helper: Save appointments
function saveAppointments(appts) {
  localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(appts));
}

// Initialize FullCalendar
function initCalendar() {
  const calendarEl = document.getElementById('calendar');
  if (!calendarEl) return;

  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    locale: 'ko',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek'
    },
    events: getCalendarEvents(),
    eventClick: function(info) {
      loadAppointmentDetails(info.event.id);
    },
    dateClick: function(info) {
      // Handled if we wanted to auto-create on teacher side, but main request is student-facing.
    }
  });

  calendar.render();
}

// Format appointments to FullCalendar events
function getCalendarEvents() {
  const appts = getAppointments();
  const colorMap = {
    pending: '#f59e0b',    // Amber / 대기
    confirmed: '#10b981',  // Emerald / 확정
    completed: '#94a3b8'   // Slate 400 / 완료
  };

  return appts.map(appt => ({
    id: appt.id,
    title: `[${appt.studentId}] ${appt.name}`,
    start: `${appt.date}T${appt.time}`,
    backgroundColor: colorMap[appt.status] || '#4f46e5',
    borderColor: 'transparent'
  }));
}

// Load Details into Right Card
function loadAppointmentDetails(id) {
  const appts = getAppointments();
  const appt = appts.find(a => a.id === id);
  if (!appt) return;

  selectedApptId = id;
  noSelectionMsg.style.display = 'none';
  selectionDetails.style.display = 'flex';

  document.getElementById('detail-student-id').textContent = appt.studentId;
  document.getElementById('detail-name').textContent = appt.name;
  document.getElementById('detail-time').textContent = `${appt.date} ${appt.time}`;
  document.getElementById('detail-appt-id').value = appt.id;
  document.getElementById('detail-status').value = appt.status;
}

// Close Appointment details card
function clearAppointmentDetails() {
  selectedApptId = null;
  noSelectionMsg.style.display = 'block';
  selectionDetails.style.display = 'none';
}

// Render Appointment list table
function renderApptList(searchQuery = '') {
  if (!apptListBody) return;

  const appts = getAppointments();
  apptListBody.innerHTML = '';

  const query = searchQuery.trim().toLowerCase();
  
  // Filter appointments
  const filtered = appts.filter(appt => {
    return appt.studentId.includes(query) || appt.name.toLowerCase().includes(query);
  });

  if (filtered.length === 0) {
    apptListBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">신청된 상담 내역이 없습니다.</td></tr>`;
    return;
  }

  // Sort by date/time ascending
  filtered.sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));

  filtered.forEach(appt => {
    const tr = document.createElement('tr');
    
    let badgeClass = 'badge-pending';
    let statusText = '대기 중';
    if (appt.status === 'confirmed') {
      badgeClass = 'badge-confirmed';
      statusText = '상담 확정';
    } else if (appt.status === 'completed') {
      badgeClass = 'badge-completed';
      statusText = '상담 완료';
    }

    tr.innerHTML = `
      <td>${appt.studentId}</td>
      <td>${appt.name}</td>
      <td>${appt.date} ${appt.time}</td>
      <td><span class="badge ${badgeClass}">${statusText}</span></td>
      <td>
        <button class="nav-btn" style="padding: 4px 10px; font-size: 0.8rem;" onclick="loadAppointmentDetails('${appt.id}')">보기</button>
      </td>
    `;
    apptListBody.appendChild(tr);
  });
}

// Setup Event Listeners
function setupEventListeners() {
  // Search
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      renderApptList(e.target.value);
    });
  }

  const btnSearchClear = document.getElementById('btn-search-clear');
  if (btnSearchClear) {
    btnSearchClear.addEventListener('click', () => {
      searchInput.value = '';
      renderApptList();
    });
  }

  // Status Update Submit
  const statusForm = document.getElementById('status-update-form');
  if (statusForm) {
    statusForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!selectedApptId) return;

      const appts = getAppointments();
      const index = appts.findIndex(a => a.id === selectedApptId);
      if (index === -1) return;

      const oldStatus = appts[index].status;
      const newStatus = document.getElementById('detail-status').value;
      appts[index].status = newStatus;
      
      saveAppointments(appts);
      
      // Log external Google Calendar simulation API call
      logGoogleCalendarAction('UPDATE_STATUS', appts[index]);

      // Refresh UI
      if (calendar) {
        calendar.getEvents().forEach(evt => evt.remove());
        getCalendarEvents().forEach(evt => calendar.addEvent(evt));
      }
      renderApptList(searchInput ? searchInput.value : '');
      loadAppointmentDetails(selectedApptId);

      alert('상태가 정상적으로 저장되었습니다.');
    });
  }

  // Delete appointment
  const btnDelete = document.getElementById('btn-delete-appt');
  if (btnDelete) {
    btnDelete.addEventListener('click', () => {
      if (!selectedApptId) return;
      if (!confirm('정말로 이 상담 일정을 삭제하시겠습니까? (삭제된 정보는 복구할 수 없습니다)')) return;

      const appts = getAppointments();
      const filtered = appts.filter(a => a.id !== selectedApptId);
      
      // Log external Google Calendar simulation API call
      const deletedAppt = appts.find(a => a.id === selectedApptId);
      if (deletedAppt) {
        logGoogleCalendarAction('DELETE_EVENT', deletedAppt);
      }

      saveAppointments(filtered);

      if (calendar) {
        calendar.getEvents().forEach(evt => evt.remove());
        getCalendarEvents().forEach(evt => calendar.addEvent(evt));
      }
      renderApptList(searchInput ? searchInput.value : '');
      clearAppointmentDetails();

      alert('일정이 삭제되었습니다.');
    });
  }

  // Settings Save (radio/checkbox changes)
  const syncCheck = document.getElementById('sync-google-cal');
  if (syncCheck) {
    syncCheck.addEventListener('change', (e) => {
      toggleGoogleSettings(e.target.checked);
      saveConfig();
    });
  }

  const clientIdInput = document.getElementById('g-client-id');
  const apiKeyInput = document.getElementById('g-api-key');
  if (clientIdInput) clientIdInput.addEventListener('change', saveConfig);
  if (apiKeyInput) apiKeyInput.addEventListener('change', saveConfig);

  const radios = document.querySelectorAll('input[name="use-purpose"]');
  radios.forEach(radio => {
    radio.addEventListener('change', saveConfig);
  });

  // Purge Data
  const btnPurge = document.getElementById('btn-purge-data');
  if (btnPurge) {
    btnPurge.addEventListener('click', () => {
      if (!confirm('경고! 본 시스템에 저장된 모든 학생 상담 신청 데이터가 즉시 영구 파기됩니다. 계속하시겠습니까?')) return;
      
      localStorage.removeItem(APPOINTMENTS_KEY);
      
      if (calendar) {
        calendar.getEvents().forEach(evt => evt.remove());
      }
      renderApptList();
      clearAppointmentDetails();
      
      alert('모든 개인정보 및 상담 일정 데이터가 영구적으로 파기되었습니다.');
    });
  }

  // Export CSV
  const btnExport = document.getElementById('btn-export-csv');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      const appts = getAppointments();
      if (appts.length === 0) {
        alert('내보낼 상담 데이터가 존재하지 않습니다.');
        return;
      }

      // Create CSV content (including BOM for Excel compatibility with Korean characters)
      let csvContent = '\uFEFF';
      csvContent += '학번,이름,상담일자,상담시간,진행상태,신청접수일시\n';

      const statusMap = {
        pending: '대기 중',
        confirmed: '상담 확정',
        completed: '상담 완료'
      };

      appts.forEach(appt => {
        const row = [
          appt.studentId,
          appt.name,
          appt.date,
          appt.time,
          statusMap[appt.status] || appt.status,
          appt.createdAt ? appt.createdAt.replace('T', ' ').substring(0, 19) : ''
        ].join(',');
        csvContent += row + '\n';
      });

      // Create File Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `학생상담신청대장_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }
}

// Modal policy logic for admin
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  const contentAreaId = modalId === 'privacy-modal' ? 'privacy-content-area' : 'terms-content-area';
  const filePath = modalId === 'privacy-modal' ? 'privacy.html' : 'terms.html';

  fetch(filePath)
    .then(response => {
      if (!response.ok) {
        throw new Error('문서를 불러오는 데 실패했습니다.');
      }
      return response.text();
    })
    .then(html => {
      document.getElementById(contentAreaId).innerHTML = html;
    })
    .catch(err => {
      document.getElementById(contentAreaId).innerHTML = `<p style="color:red;">오류: ${err.message}</p>`;
    });

  modal.style.display = 'flex';
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'none';
  }
}

// Window click helper for modals
window.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) {
    e.target.style.display = 'none';
  }
});
