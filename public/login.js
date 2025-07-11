document.addEventListener('DOMContentLoaded', () => {
    const faceLoginBtn = document.getElementById('face-login-btn');
    const faceLoginSection = document.getElementById('face-login-section');
    const video = document.getElementById('video');
    const captureButton = document.getElementById('capture-btn');
    const canvas = document.getElementById('canvas');
    const photoInput = document.getElementById('photo');
    const loginForm = document.getElementById('loginForm');
    // Toggle between Face Login 
    faceLoginBtn.addEventListener('click', () => {
        faceLoginSection.style.display = 'block';
        faceLoginBtn.classList.add('active');
 
    });
    // Start the camera
    navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
            video.srcObject = stream;
        })
        .catch((error) => {
            console.error("Error accessing the camera:", error);
        });

    // Capture face
    captureButton.addEventListener('click', () => {
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, canvas.width, canvas.height); 

        // Convert canvas image to file and set it to the hidden input field
        canvas.toBlob((blob) => {
            const file = new File([blob], 'face.png', { type: 'image/png' });
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            photoInput.files = dataTransfer.files;
            alert('Face captured successfully!');
        }, 'image/png');
    });

     // Submit the form for facial login

    loginForm.addEventListener('submit', (event) => {
        event.preventDefault();
    
        const formData = new FormData(loginForm);
    
        fetch('/login', {
            method: 'POST',
            body: formData,
        })
        .then(response => {
            console.log('Raw response:', response);  // Log the raw response
            return response.json();  // Parse JSON
        })
        .then(data => {
            console.log('Parsed response data:', data);  // Log parsed JSON
    
            if (data.success) {  
                console.log("Face matched! Marking attendance...");


                const now = new Date();
                const date = now.toLocaleDateString();
                const time = now.toLocaleTimeString();
                const username = data.username || "Sarita";
                const employee_id = data.employee_id || "EMP001"; 

                // Load old records or create a new list
                const oldRecords = JSON.parse(localStorage.getItem("attendanceRecords")) || [];
                // Add new record
                oldRecords.push({ employee_id, username,date, time });
                // Save back to localStorage
                localStorage.setItem("attendanceRecords", JSON.stringify(oldRecords));
                // Optionally save username
                localStorage.setItem("username", data.username || "User");


                window.location.href = '/employeeDashboard';

            } else {
                // alert(data.message);  
                alert(data.message || 'Face not matched! Please try again.');
            }
        })
        .catch(error => {
            console.error('Error during login:', error);
            alert('Something went wrong. Please try again.');
        });
    });
    
});
