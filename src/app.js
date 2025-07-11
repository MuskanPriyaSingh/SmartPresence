const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const express = require('express');
const multer = require('multer');
const { exec } = require('child_process');
const mysql = require('mysql2');
const fs = require('fs');
const session = require('express-session');

// Initialize Express app
const app = express();


// Add this middleware
app.use(session({
    secret: 'your-secret-key', // change this to a strong secret in production
    resave: false,
    saveUninitialized: false,
}));


// Static files (public folder)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '../public'), {
    setHeaders: (res, path) => {
        res.setHeader('Cache-Control', 'no-store');
    },
}));


// Setup multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'uploads');
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    },
});
const upload = multer({ storage });

// Setup MySQL connection
const db = mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL');
});

// Route to serve the HTML file
// Serve the dashboard file by default
app.get('/', (req, res) => {
    console.log('Serving company-portal.html');
    res.sendFile(path.join(__dirname, '../public/company-portal.html')); 
});


app.get('/login', (req, res) => {
    const filePath = path.join(__dirname, '../public', 'login.html');
    console.log('Serving login page from:', filePath); 
    res.sendFile(filePath);
});
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) console.error("Logout error:", err);
        res.redirect('/');
    });
});

app.get('/getEmployeeInfo', (req, res) => {

    if (req.session?.username && req.session?.employee_id) {
        return res.json({
            success: true,
            username: req.session.username,
            employee_id: req.session.employee_id
        });
    } else {
        return res.status(401).json({ success: false, message: 'Not logged in' });
    }
});


// Route to fetch employees details in hr_dashboard's record table
app.get('/getAllAttendance', (req, res) => {
    const fetchSql = `
    SELECT 
      u.username, 
      u.employee_id,
      DATE(a.time) AS date,
      a.time AS time,
      CASE 
        WHEN a.time = daily_times.first_time THEN 'Check-In'
        WHEN a.time = daily_times.last_time THEN 'Check-Out'
      END AS status,
      CASE 
        WHEN a.time = daily_times.first_time THEN
          CASE 
            WHEN TIME(a.time) <= '10:00:00' THEN 'On Time'
            WHEN TIME(a.time) > '10:00:00' THEN CONCAT(
              'Late by ',
              LPAD(HOUR(TIMEDIFF(TIME(a.time), '10:00:00')), 2, '0'), ':',
              LPAD(MINUTE(TIMEDIFF(TIME(a.time), '10:00:00')), 2, '0')
            )
          END
        ELSE ''
      END AS punctuality,
      daily_times.first_time,
      daily_times.last_time
    FROM attendance a
    JOIN users u ON u.employee_id = a.employee_id
    JOIN (
      SELECT 
        employee_id, 
        DATE(time) AS date,
        MIN(time) AS first_time,
        MAX(time) AS last_time
      FROM attendance
      GROUP BY employee_id, DATE(time)
    ) AS daily_times
    ON a.employee_id = daily_times.employee_id 
    AND DATE(a.time) = daily_times.date
    AND (a.time = daily_times.first_time OR a.time = daily_times.last_time)
    ORDER BY a.time DESC;
  `;

    db.query(fetchSql, (err, records) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch attendance records',
                attendance: []
            });
        }

        const formattedRecords = records.map(record => {
            const dateObj = new Date(record.date);
            const timeObj = new Date(record.time);

            let working_hours = '';
            if (record.status === 'Check-Out' && record.first_time && record.last_time) {
                const inTime = new Date(record.first_time);
                const outTime = new Date(record.last_time);
                const durationMs = outTime - inTime;

                const hours = Math.floor(durationMs / (1000 * 60 * 60));
                const minutes = Math.floor((durationMs / (1000 * 60)) % 60);
                working_hours = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            }

            return {
                username: record.username,
                employee_id: record.employee_id,
                date: dateObj.toLocaleDateString('en-IN'),
                time: timeObj.toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                }),
                status: record.status,
                punctuality: record.punctuality || '',
                working_hours
            };
        });

        res.json({
            success: true,
            message: 'Filtered attendance fetched successfully',
            attendance: formattedRecords
        });
    });
});


// Route to fetch attendance detail in employee_dashboard's table
app.get('/getAttendance', (req, res) => {
    if (!req.session || !req.session.employee_id) {
        return res.status(401).json({ success: false, message: 'Unauthorized: No session' });
    }

    const employee_id = req.session.employee_id;

    const fetchSql = `
    SELECT 
      u.username,
      u.employee_id,
      a.time
    FROM attendance a
    JOIN users u ON a.employee_id = u.employee_id
    WHERE a.employee_id = ?
    ORDER BY a.time DESC
  `;

    db.query(fetchSql, [employee_id], (err, records) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch attendance records',
                attendance: []
            });
        }

        // Group records by date
        const groupedByDate = {};

        records.forEach(record => {
            const timeObj = new Date(record.time);
            const dateStr = timeObj.toLocaleDateString('en-IN');

            if (!groupedByDate[dateStr]) groupedByDate[dateStr] = [];

            groupedByDate[dateStr].push({
                ...record,
                date: dateStr,
                time: timeObj.toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                }),
                rawTime: timeObj,
                status: '' // default blank
            });
        });

        // Add check-in/check-out tags per date
        Object.values(groupedByDate).forEach(entries => {
            const sortedAsc = [...entries].sort((a, b) => a.rawTime - b.rawTime);
            if (sortedAsc.length > 0) {
                sortedAsc[0].status = 'Check-In';
                sortedAsc[sortedAsc.length - 1].status = 'Check-Out';
            }
        });

        // Combine and keep DESC order
        const finalList = Object.values(groupedByDate).flat();

        // Keep finalList in overall descending time order
        finalList.sort((a, b) => b.rawTime - a.rawTime);

        res.json({
            success: true,
            message: 'Attendance fetched successfully',
            attendance: finalList
        });
    });
});


app.get('/employeeDashboard', (req, res) => {
    if (req.session.username && req.session.employee_id) {
        console.log('Serving dashboard for:', req.session.username);
        const filePath = path.join(__dirname, '../public', 'employee_dashboard.html');
        // Optional: prevent caching
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        res.sendFile(filePath);


    } else {
        console.log('User not logged in');
        res.redirect('/'); // Redirect to login if not logged in
    }
});


// employee Login API
app.post('/employeeLogin', (req, res) => {
    const { employee_id, password } = req.body;
    const query = 'SELECT * FROM users WHERE employee_id = ? AND password = ?';

    db.query(query, [employee_id, password], (err, results) => {
        if (err) return res.status(500).send('Server error');
        if (results.length > 0) {
            const user = results[0];

            // Store session data
            req.session.username = user.username;
            req.session.employee_id = user.employee_id;

            // Send success response
            return res.status(200).json({ success: true, user });


        } else {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    });

});



// Define /signup route
app.post('/signup', upload.single('faceData'), (req, res) => {
    console.log('Received request at /signup');
    console.log('Request body:', req.body);
    console.log('Uploaded file:', req.file);

    const { username, employee_id, password } = req.body;
    const faceData = req.file ? req.file.filename : null;

    // Ensure that username is properly set
    if (!username) {
        return res.status(400).send('Username is required');
    }

    const datasetPath = path.join(__dirname, 'datasets', username);

    // Make sure the dataset folder exists
    if (!fs.existsSync(datasetPath)) {
        fs.mkdirSync(datasetPath);
    }

    // Path to Python script for face detection
    const pythonScriptPath = path.join(__dirname, 'python', 'face_detection.py');

    // Command to execute the script for face detection
    const pythonCommand = `python "${pythonScriptPath}" "${datasetPath}" "${req.file.path}"`;

    exec(pythonCommand, (error, stdout, stderr) => {
        if (error) {
            console.error('Error running Python script:', error);
            return res.status(500).send('Error processing face data');
        }
        console.log('Python script output:', stdout);

        // Save user details to MySQL database
        const sql = 'INSERT INTO users (username, employee_id, password, face_data) VALUES (?, ?, ?, ?)';
        db.query(sql, [username, employee_id, password, faceData], (err, result) => {
            if (err) {
                console.error('Error inserting data:', err);
                return res.status(500).send('Database error');

            }
            console.log('User signed up:', result);


            // Clear any existing session
            req.session.regenerate((err) => {
                if (err) {
                    console.error('Session regeneration error:', err);
                    return res.status(500).send('Session error');
                }

                // Set new session data for the newly signed-up user
                req.session.username = username;

                // Redirect to employee dashboard
                res.redirect('/employeeDashboard');
            });

        });
    });
    //});
});



// Define /login route for attendance
app.post('/login', upload.single('faceData'), (req, res) => {
    console.log('Received request at /login');
    console.log('Request body:', req.body);
    console.log('Uploaded file:', req.file);

    const { username } = req.body;
    const faceData = req.file ? req.file.filename : null;

    // Ensure that username is properly set
    if (!username) {
        return res.status(400).send('Username is required');
    }

    // Path to your Python script for face recognition
    const pythonScriptPath = path.join(__dirname, 'python', 'face_recognition_script.py');
    console.log(pythonScriptPath)
    // Ensure that the file exists at the given path
    if (!fs.existsSync(pythonScriptPath)) {
        console.error('Python script not found at:', pythonScriptPath);
        return res.status(500).json({ success: false, message: 'Python script not found' });

    }

    // Execute Python script for face recognition
    const pythonCommand = `python "${pythonScriptPath}" "${username}" "${req.file.path}"`;

    exec(pythonCommand, (error, stdout, stderr) => {
        if (error) {
            console.error('Error running Python script:', error);
            return res.status(500).json({ success: false, message: 'Error verifying face data' });

        }
        console.log('Python script output:', stdout);



        //new attendance record
        if (stdout.includes('Face match: True')) {
            // Get employee_id for the username
            const userSql = 'SELECT employee_id FROM users WHERE username = ?';
            db.query(userSql, [username], (err, userResult) => {
                if (err || userResult.length === 0) {
                    return res.status(500).json({ success: false, message: 'User not found' });
                }

                const employee_id = userResult[0].employee_id;
                req.session.username = username;
                req.session.employee_id = employee_id;

                const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

                // Insert into attendance
                const attendanceSql = 'INSERT INTO attendance (employee_id, date) VALUES (?, ?)';
                db.query(attendanceSql, [employee_id, today], (err, result) => {
                    if (err) {
                        return res.status(500).json({ success: false, message: 'Attendance marking failed' });
                    }

                    // Fetch full attendance with JOIN
                    const fetchSql = `
                SELECT u.username, u.employee_id, a.date, a.time
                FROM attendance a
                JOIN users u ON a.employee_id = u.employee_id
                WHERE u.username = ?
                ORDER BY a.time DESC
            `;


                    db.query(fetchSql, [username], (err, records) => {
                        if (err) {
                            return res.status(500).json({
                                success: true,
                                message: 'Login success, but failed to fetch attendance',
                                attendance: []
                            });
                        }

                        res.json({
                            success: true,
                            message: 'Login and attendance successful',
                            attendance: records,
                            username
                        });
                    });
                });
            });
        } else {
            res.status(401).json({ success: false, message: 'Face recognition failed' });
        }
    });
});


// Route to count number of employees present today
app.get('/countPresentToday', (req, res) => {
    const sql = `
    SELECT COUNT(DISTINCT employee_id) AS present_today
    FROM attendance
    WHERE DATE(time) = CURDATE()
  `;

    db.query(sql, (err, result) => {
        if (err) {
            console.error('Error fetching present count:', err);
            return res.status(500).json({ success: false, message: 'Failed to fetch present count' });
        }
        res.json({
            success: true,
            presentToday: result[0].present_today
        });
    });
});

// Route to count number of employees absent today
app.get('/countAbsentToday', (req, res) => {
    const sql = `
    SELECT COUNT(*) AS absent_today
    FROM users
    WHERE employee_id NOT IN (
    SELECT DISTINCT employee_id
    FROM attendance
    WHERE DATE(time) = CURDATE()
    );
  `;

    db.query(sql, (err, result) => {
        if (err) {
            console.error('Error fetching present count:', err);
            return res.status(500).json({ success: false, message: 'Failed to fetch present count' });
        }
        res.json({
            success: true,
            absentToday: result[0].absent_today
        });
    });
});

// Route to count number of employees late comers today
app.get('/countLateComers', (req, res) => {
    const sql = `
    SELECT COUNT(DISTINCT employee_id) AS late_comers
    FROM attendance
    WHERE DATE(time) = CURDATE()
    AND TIME(time) > '10:00:00';
    `;

    db.query(sql, (err, result) => {
        if (err) {
            console.error('Error fetching present count:', err);
            return res.status(500).json({ success: false, message: 'Failed to fetch present count' });
        }
        res.json({
            success: true,
            lateComers: result[0].late_comers
        });
    });
});



// Start the server
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});