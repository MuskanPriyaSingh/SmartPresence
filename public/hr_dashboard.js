// Fetch and render all attendance records
function fetchAllAttendance() {
  fetch('/getAllAttendance')
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        window.originalAttendanceData = data.attendance; // store for filtering
        document.getElementById('attendanceSearch').addEventListener('keydown', e => {
          if (e.key === 'Enter') applyAttendanceFilters();
        });
        renderAttendanceTable(data.attendance); // render table
        fetchCounts(); // fetch present, absent, late counts
      } else {
        document.getElementById('attendanceTableBody').innerHTML =
          '<tr><td colspan="5" class="text-center">No attendance records found</td></tr>';
      }
    })
    .catch(err => {
      console.error('Error loading attendance:', err);
    });
}

// Render the attendance data into the table
function renderAttendanceTable(attendance) {
  const tableBody = document.getElementById('attendanceTableBody');
  const activityLog = document.getElementById('activityLog');
  tableBody.innerHTML = '';
  activityLog.innerHTML = '';
  const activities = [];

  attendance.forEach(record => {

    const row = `<tr>
      <td>${record.employee_id}</td>
      <td>${record.username}</td>
      <td>${record.date}</td>
      <td>${record.time}</td>
      <td>
        <span class="badge ${record.status === 'Check-In' ? 'bg-success' : 'bg-danger'}">
          ${record.status}
        </span>
      </td>
      <td>
          <span class="${record.punctuality === 'On Time' ? 'text-success fw-bold' : 'text-danger fw-bold'}">
          ${record.punctuality}
          </span>
      </td>
      <td>${record.working_hours}</td>
    </tr>`;

    tableBody.innerHTML += row;

    const log = `<li class="list-group-item activity-item">
      ${record.username} marked ${record.status} on ${record.date} at ${record.time}
    </li>`;
    activities.push(log);
  });

  renderActivities(activities, false);
  window.allActivities = activities;
}

// Fetch present, absent, and late counts
function fetchCounts() {
  fetch('/countPresentToday')
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        document.getElementById('presentCount').innerText = data.presentToday;
      }
    });

  fetch('/countAbsentToday')
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        document.getElementById('absentCount').innerText = data.absentToday;
      }
    });

  fetch('/countLateComers')
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        document.getElementById('lateCount').innerText = data.lateComers;
      }
    });

  document.getElementById('leaveCount').innerText = 3; // optional static
}

// Filter attendance by employee_id or name
function applyAttendanceFilters() {
  const searchInput = document.getElementById('attendanceSearch').value.toLowerCase().trim();
  const selectedDate = document.getElementById('filterDate').value.trim(); // 'YYYY-MM-DD'

  const filtered = window.originalAttendanceData.filter(record => {
    const recordDateFormatted = convertDDMMYYYYtoYYYYMMDD(record.date); // Convert your data date

    const matchesSearch =
      !searchInput ||
      record.username.toLowerCase().includes(searchInput) ||
      record.employee_id.toLowerCase().includes(searchInput);

    const matchesDate =
      !selectedDate || recordDateFormatted === selectedDate;

    return matchesSearch && matchesDate;
  });

  renderAttendanceTable(filtered);
}
function convertDDMMYYYYtoYYYYMMDD(dateStr) {
  const [day, month, year] = dateStr.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}


// Reset filters to original view
function resetAttendanceFilters() {
  document.getElementById('attendanceSearch').value = '';
  document.getElementById('filterDate').value = '';
  renderAttendanceTable(window.originalAttendanceData);
}

// Export Attendance Record
function exportAttendanceToExcel(filename = 'Attendance_Report.csv') {
  const table = document.getElementById('attendanceTableBody');
  if (!table || table.rows.length === 0) {
    alert('No data to export.');
    return;
  }

  const csv = ['Employee ID,Username,Date,Time,Status,Punctuality,Working Hours'];

  Array.from(table.rows).forEach(row => {
    const cells = Array.from(row.cells).map(cell =>
      `"${cell.textContent.trim().replace(/"/g, '""')}"`
    );
    csv.push(cells.join(','));
  });

  const csvContent = csv.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}



function renderActivities(data, showAll = false) {
  const activityLog = document.getElementById('activityLog');
  activityLog.innerHTML = '';

  const itemsToShow = showAll ? data : data.slice(0, 4);
  itemsToShow.forEach(item => {
    activityLog.innerHTML += item;
  });

  const toggleBtn = document.getElementById('showAllBtn');
  toggleBtn.innerText = showAll ? 'See Less' : 'See More';
  toggleBtn.dataset.expanded = showAll;
}

function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  document.querySelector('main').classList.toggle('dark-mode');
  document.querySelectorAll('.card').forEach(c => c.classList.toggle('dark-mode'));
  document.querySelectorAll('.card-header').forEach(c => c.classList.toggle('dark-mode'));
  document.querySelector('footer').classList.toggle('dark-mode');
  document.querySelector('.sidebar').classList.toggle('dark-mode');
  document.querySelectorAll('.sidebar .nav-link').forEach(link => link.classList.toggle('dark-mode'));
  document.querySelector('table').classList.toggle('dark-mode');
}

window.addEventListener("DOMContentLoaded", () => {
  fetchAllAttendance();

  const logoutButtons = document.querySelectorAll(".btn-logout, .sidebar-logout");

  logoutButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      window.location.href = "/logout";
    });
  });

  // Toggle See More / Less
  const showAllBtn = document.getElementById("showAllBtn");
  showAllBtn.addEventListener("click", () => {
    const expanded = showAllBtn.dataset.expanded === "true";
    renderActivities(window.allActivities, !expanded);
  });

  // Dark Mode toggle
  const darkToggleBtn = document.getElementById("darkModeToggle");
  darkToggleBtn.addEventListener("click", toggleDarkMode);
});

// Chart setup
const chartOptions = {
  series: [{ name: 'Attendance', data: [95, 90, 85, 80, 70, 95, 100] }],
  chart: { height: 280, type: 'line' },
  xaxis: { categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] }
};

const chart = new ApexCharts(document.querySelector("#attendanceChart"), chartOptions);
chart.render();


