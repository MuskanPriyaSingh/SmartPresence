document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('video');
    const captureButton = document.getElementById('capture-btn');
    const canvas = document.getElementById('canvas');
    const photoInput = document.getElementById('photo');
    const signupForm = document.getElementById('signupForm'); // The signup form element


    // Start the camera
    navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
            video.srcObject = stream;
        })
        .catch((error) => {
            console.error("Error accessing the camera:", error);
        });

    // Capture photo when the button is clicked
    captureButton.addEventListener('click', () => {
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, canvas.width, canvas.height); // Draw the captured image on canvas

       

         // Convert the canvas image to data URL
         canvas.toBlob((blob) => {
            const file = new File([blob], 'face.png', { type: 'image/png' });

            // Assign the file to the hidden input field
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            photoInput.files = dataTransfer.files;

            alert('Face captured successfully!');
        }, 'image/png');

        // 
    });

    // Submit the form when the signup button is clicked
    signupForm.addEventListener('submit', (event) => {
        event.preventDefault(); // Prevent the default form submission to handle the file properly
        

        // Create a FormData object and append the form data, including the file
        const formData = new FormData(signupForm);
        
        for (const [key, value] of formData.entries()) {
            console.log(key, value); // Check if all fields are included
        }

        // Send the form data via a POST request to the server
        fetch('/signup', {
            method: 'POST',
            body: formData,
        })
        .then((response) => response.text())
        .then((data) => {
            console.log('Response from server:', data);
            alert('Registration successful!');
            window.location.href = 'employee_Dashboard.html';
        })
        .catch((error) => {
            console.error('Error submitting form:', error);
            alert('Error during signup.');
        });
    });
});





