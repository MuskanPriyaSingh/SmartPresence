
document.addEventListener("DOMContentLoaded", () => {
  const faceRecognitionButton = document.getElementById("faceRecognitionAttendance");
  const attendanceList = document.getElementById("attendanceList");
  const employeeName = document.getElementById("employeeName");
  // Optional: set employee name from localStorage/sessionStorage
  const storedUsername = localStorage.getItem("username") || "Employee Name";
  const storedEmployeeId = localStorage.getItem("employee_id") || "EMP001";
  employeeName.textContent = storedUsername;

  // Fetch employee info from the server
  fetch('/getEmployeeInfo')
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        // Update employee name and ID
        employeeName.textContent = data.username;
        document.getElementById('empId').textContent = data.employee_id;

        // Optionally, store in localStorage for later use
        localStorage.setItem("username", data.username);
        localStorage.setItem("employee_id", data.employee_id);
      } else {
        alert("You are not logged in.");
        window.location.href = '/';
      }
    })
    .catch(err => {
      console.error('Error fetching employee info:', err);
    });


  function loadAttendanceRecords() {
    fetch('/getAttendance')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          attendanceList.innerHTML = ""; 

          data.attendance.forEach(record => {
            const row = document.createElement("tr");

            let statusClass = '';
            if (record.status === 'Check-In') statusClass = 'text-success fw-bold';
            else if (record.status === 'Check-Out') statusClass = 'text-danger fw-bold';

            row.innerHTML = `
              <td>${record.employee_id}</td>
              <td>${record.username}</td>
              <td>${record.date}</td>
              <td>${record.time}</td>
              <td class="${statusClass}">${record.status || ''}</td>
            `;

            attendanceList.appendChild(row);
          });

        }
        else {
          alert("Failed to fetch attendance: " + data.message);
        }
      })
      .catch(err => {
        console.error('Error fetching attendance:', err);
      });
  }

  const logoutButton = document.getElementById("logoutButton");
  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      window.location.href = "/logout";  
    });
  }
  faceRecognitionButton.addEventListener("click", () => {
    window.location.href = "login.html";
  });

  loadAttendanceRecords();

  // ===============================
  // Profile Edit/Save Functionality
  // ===============================

  const profilePhoto = document.getElementById("profilePhoto");
  const uploadPhoto = document.getElementById("uploadPhoto");
  const editButton = document.getElementById("editProfile");

  const profileFields = document.getElementById("profileFields");
  const editFields = document.getElementById("editFields");

  const nameSpan = document.getElementById("employeeName");
  const empIdSpan = document.getElementById("empId");
  const departmentSpan = document.getElementById("department");
  const positionSpan = document.getElementById("position");

  const editName = document.getElementById("editName");
  const editEmpId = document.getElementById("editEmpId");
  const editDepartment = document.getElementById("editDepartment");
  const editPosition = document.getElementById("editPosition");

  // Load profile data from localStorage
  function loadProfileData() {
    const profile = JSON.parse(localStorage.getItem("employeeProfile")) || {};
    if (profile.name) nameSpan.textContent = profile.name;
    if (profile.empId) empIdSpan.textContent = profile.empId;
    if (profile.department) departmentSpan.textContent = profile.department;
    if (profile.position) positionSpan.textContent = profile.position;
    if (profile.photo) profilePhoto.src = profile.photo;
  }

  // Toggle edit mode
  let isEditing = false;
  editButton.addEventListener("click", () => {
    if (!isEditing) {
      // Enable editing
      isEditing = true;
      editButton.innerHTML = '<i class="fas fa-save me-2"></i>Save Profile';
      profileFields.classList.add("d-none");
      editFields.classList.remove("d-none");
      uploadPhoto.click(); // open file chooser

      // Prefill inputs
      editName.value = nameSpan.textContent;
      editEmpId.value = empIdSpan.textContent;
      editDepartment.value = departmentSpan.textContent;
      editPosition.value = positionSpan.textContent;

    } else {
      // Save changes
      isEditing = false;
      editButton.innerHTML = '<i class="fas fa-edit me-2"></i>Edit Profile';
      profileFields.classList.remove("d-none");
      editFields.classList.add("d-none");

      // Update spans
      nameSpan.textContent = editName.value;
      empIdSpan.textContent = editEmpId.value;
      departmentSpan.textContent = editDepartment.value;
      positionSpan.textContent = editPosition.value;

      // Save to localStorage
      const profile = {
        name: editName.value,
        empId: editEmpId.value,
        department: editDepartment.value,
        position: editPosition.value,
        photo: profilePhoto.src
      };
      localStorage.setItem("employeeProfile", JSON.stringify(profile));
    }
  });

  // Handle profile photo upload
  uploadPhoto.addEventListener("change", () => {
    const file = uploadPhoto.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        profilePhoto.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  });

  // Load saved profile on page load
  loadProfileData();
  loadAttendanceRecords(); // Fetch attendance records from server


  // ========== DARK MODE TOGGLE BUTTON ========== //
  const darkModeButton = document.getElementById("darkModeToggle");

  // Apply stored theme or default
  const currentTheme = localStorage.getItem("theme") || "light";
  document.body.classList.add(currentTheme + "-mode");
  if (currentTheme === "dark") {
    darkModeButton.textContent = "☀️ Light Mode";
  } else {
    darkModeButton.textContent = "🌙 Dark Mode";
  }

  // Toggle theme on button click
  darkModeButton.addEventListener("click", () => {
    if (document.body.classList.contains("light-mode")) {
      document.body.classList.replace("light-mode", "dark-mode");
      darkModeButton.textContent = "☀️ Light Mode";
      localStorage.setItem("theme", "dark");
    } else {
      document.body.classList.replace("dark-mode", "light-mode");
      darkModeButton.textContent = "🌙 Dark Mode";
      localStorage.setItem("theme", "light");
    }
  });

  // Dynamic Greeting
  const greeting = document.createElement("h4");
  greeting.className = "mb-3 text-success";
  const hour = new Date().getHours();
  greeting.textContent = hour < 12 ? "Good Morning!" :
    hour < 18 ? "Good Afternoon!" : "Good Evening!";
  document.querySelector("main").prepend(greeting);

  // Live Clock
  setInterval(() => {
    const now = new Date();
    document.getElementById("liveClock").textContent = now.toLocaleTimeString();
  }, 1000);


});
