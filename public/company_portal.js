// Toggle dark/light mode
function toggleMode() {
  document.body.classList.toggle("light");
}

// HR Login
document.getElementById("hrLoginForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const spinner = document.getElementById("hrSpinner");
  spinner.style.display = "inline-block";

  const hrId = document.getElementById("hrIdInput").value.trim();
  const password = document.getElementById("hrPasswordInput").value.trim();

  setTimeout(() => {
    spinner.style.display = "none";
    if (hrId === "hr123" && password === "12345678") {
      alert("HR Login Successful!");
      window.location.href = "/hr.html";
    } else {
      alert("Invalid HR credentials");
    }
  }, 1500);
});

// Employee Login
const employeeLoginForm = document.getElementById("employeeLoginForm");

employeeLoginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const employeeId = document.querySelector("#employeeLoginForm input[placeholder='Employee ID']").value;
  const password = document.querySelector("#employeeLoginForm input[placeholder='Password']").value;

  try {
    const response = await fetch("/employeeLogin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ employee_id: employeeId, password: password }),
    });

    const result = await response.json();
    if (result.success) {
      alert("Login successful!");
      window.location.href = "/employeeDashboard";
    } else {
      alert(result.message || "Invalid credentials");
    }
  } catch (err) {
    console.error("Login error:", err);
    alert("Something went wrong. Please try again later.");
  }
});