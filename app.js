// Initialize Date Constraint
document.addEventListener('DOMContentLoaded', () => {
  const dateInput = document.getElementById('desired-date');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
  }
});

// Mock LocalStorage Keys
const APPOINTMENTS_KEY = 'counseling_appointments';

// Helper: Get appointments
function getAppointments() {
  const data = localStorage.getItem(APPOINTMENTS_KEY);
  return data ? JSON.parse(data) : [];
}

// Helper: Save appointments
function saveAppointments(appts) {
  localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(appts));
}

// 1. Submit Application
const applyForm = document.getElementById('consultation-form');
if (applyForm) {
  applyForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const studentId = document.getElementById('student-id').value.trim();
    const name = document.getElementById('student-name').value.trim();
    const date = document.getElementById('desired-date').value;
    const time = document.getElementById('desired-time').value;

    const appointments = getAppointments();

    // Check conflict (Same date and time)
    const isConflict = appointments.some(appt => appt.date === date && appt.time === time);
    if (isConflict) {
      alert('죄송합니다. 선택하신 날짜와 시간에는 이미 예약된 상담이 존재합니다. 다른 시간대를 선택해주세요.');
      return;
    }

    // Check if the student already has an active counseling reservation
    const hasActive = appointments.some(appt => appt.studentId === studentId && appt.status !== 'completed');
    if (hasActive) {
      alert('이미 진행 중이거나 대기 중인 상담 신청이 존재합니다. 상담 완료 후 새 상담을 예약해주세요.');
      return;
    }

    // Create appointment object
    const newAppt = {
      id: 'appt_' + Date.now(),
      studentId: studentId,
      name: name,
      date: date,
      time: time,
      status: 'pending', // pending, confirmed, completed
      createdAt: new Date().toISOString()
    };

    appointments.push(newAppt);
    saveAppointments(appointments);

    alert('상담 신청이 성공적으로 접수되었습니다. 교사의 승인/확정 후 일정이 결정됩니다.');
    applyForm.reset();
  });
}

// 2. Lookup Appointment Status
const lookupForm = document.getElementById('lookup-form');
const lookupResult = document.getElementById('lookup-result');

if (lookupForm && lookupResult) {
  lookupForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const studentId = document.getElementById('lookup-id').value.trim();
    const name = document.getElementById('lookup-name').value.trim();

    const appointments = getAppointments();
    
    // Find active appointments for the student (sorted by date/time ascending)
    const studentAppts = appointments
      .filter(appt => appt.studentId === studentId && appt.name === name)
      .sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));

    if (studentAppts.length === 0) {
      alert('등록된 상담 신청 내역을 찾을 수 없습니다. 학번과 이름을 다시 확인해 주세요.');
      lookupResult.style.display = 'none';
      return;
    }

    // Show lookup result box
    lookupResult.style.display = 'block';

    // Mask student info for security
    const maskedName = name.length > 2 
      ? name[0] + '*'.repeat(name.length - 2) + name[name.length - 1] 
      : name[0] + '*';
    const maskedId = studentId.substring(0, 3) + '**';
    document.getElementById('res-student-info').textContent = `${maskedId} / ${maskedName}`;

    // Get the most relevant next appointment (the one that is pending or confirmed, or the latest completed one if none active)
    const activeAppt = studentAppts.find(appt => appt.status !== 'completed') || studentAppts[studentAppts.length - 1];

    // Status Badge mapping
    const statusBadge = document.getElementById('res-status-badge');
    statusBadge.className = 'badge';
    
    if (activeAppt.status === 'pending') {
      statusBadge.textContent = '대기 중';
      statusBadge.classList.add('badge-pending');
      document.getElementById('res-schedule-time').textContent = `${activeAppt.date} ${activeAppt.time} (교사 승인 대기)`;
    } else if (activeAppt.status === 'confirmed') {
      statusBadge.textContent = '상담 확정';
      statusBadge.classList.add('badge-confirmed');
      document.getElementById('res-schedule-time').textContent = `${activeAppt.date} ${activeAppt.time} (상담 예정)`;
    } else if (activeAppt.status === 'completed') {
      statusBadge.textContent = '상담 완료';
      statusBadge.classList.add('badge-completed');
      document.getElementById('res-schedule-time').textContent = '다음 상담 일정이 없습니다. 새로 신청해주세요.';
    }
  });
}

// 3. Modal Policy Logic
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  const contentAreaId = modalId === 'privacy-modal' ? 'privacy-content-area' : 'terms-content-area';
  const filePath = modalId === 'privacy-modal' ? 'privacy.html' : 'terms.html';

  // Fetch file content and insert into modal
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

// Close modal if user clicks outside of it
window.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) {
    e.target.style.display = 'none';
  }
});
