// scripts/qr-generator.js - QR CODE GENERATION
const API_BASE_URL = 'https://zero0-1-r0xs.onrender.com';
// scanner.js
document.addEventListener('DOMContentLoaded', function() {
    let videoStream = null;
    let currentCamera = 'environment'; // 'environment' for back camera, 'user' for front
    let isScanning = false;
    let scanInterval = null;
    let flashEnabled = false;
    
    const video = document.getElementById('scannerVideo');
    const canvas = document.getElementById('scannerCanvas');
    const ctx = canvas.getContext('2d');
    const startBtn = document.getElementById('startScannerBtn');
    const stopBtn = document.getElementById('stopScannerBtn');
    const switchBtn = document.getElementById('switchCameraBtn');
    const flashBtn = document.getElementById('flashToggleBtn');
    const saveBtn = document.getElementById('saveAttendanceBtn');
    const scannerStatus = document.getElementById('scannerStatus');
    
    // Start Scanner
    startBtn.addEventListener('click', startScanner);
    
    // Stop Scanner
    stopBtn.addEventListener('click', stopScanner);
    
    // Switch Camera
    switchBtn.addEventListener('click', switchCamera);
    
    // Toggle Flash
    flashBtn.addEventListener('click', toggleFlash);
    
    // Save Attendance
    if (saveBtn) {
        saveBtn.addEventListener('click', saveAttendance);
    }
    
    // Functions
    async function startScanner() {
        try {
            const constraints = {
                video: {
                    facingMode: currentCamera,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };
            
            videoStream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = videoStream;
            video.play();
            
            // Set canvas dimensions
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            // Update UI
            startBtn.style.display = 'none';
            stopBtn.style.display = 'inline-block';
            scannerStatus.innerHTML = '<i class="fas fa-circle status-scanning"></i> Scanning...';
            
            isScanning = true;
            scanInterval = setInterval(scanQRCode, 100); // Scan every 100ms
            
        } catch (error) {
            console.error('Error accessing camera:', error);
            alert('Unable to access camera. Please check permissions.');
        }
    }
    
    function stopScanner() {
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
            videoStream = null;
        }
        
        if (scanInterval) {
            clearInterval(scanInterval);
            scanInterval = null;
        }
        
        // Update UI
        startBtn.style.display = 'inline-block';
        stopBtn.style.display = 'none';
        scannerStatus.innerHTML = '<i class="fas fa-circle status-idle"></i> Scanner stopped';
        
        isScanning = false;
    }
    
    function switchCamera() {
        currentCamera = currentCamera === 'environment' ? 'user' : 'environment';
        if (isScanning) {
            stopScanner();
            startScanner();
        }
    }
    
    function toggleFlash() {
        if (videoStream) {
            const track = videoStream.getVideoTracks()[0];
            if (track.getCapabilities && track.getCapabilities().torch) {
                flashEnabled = !flashEnabled;
                track.applyConstraints({
                    advanced: [{ torch: flashEnabled }]
                });
                flashBtn.innerHTML = flashEnabled ? 
                    '<i class="fas fa-lightbulb"></i> Flash ON' : 
                    '<i class="fas fa-lightbulb"></i> Flash';
            }
        }
    }
    
    function scanQRCode() {
        if (!isScanning) return;
        
        try {
            // Draw video frame to canvas
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Get image data
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            // Decode QR code
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert",
            });
            
            if (code) {
                // QR code detected
                handleQRCodeDetected(code.data);
            }
        } catch (error) {
            console.error('Scan error:', error);
        }
    }
    
    function handleQRCodeDetected(data) {
        try {
            // Parse QR data
            const qrData = JSON.parse(data);
            
            // Check if QR is expired
            const expiryTime = new Date(qrData.expires);
            const now = new Date();
            
            if (now > expiryTime) {
                showScanResult({
                    success: false,
                    message: "QR code has expired!",
                    qrData: qrData
                });
                return;
            }
            
            // Show successful scan
            showScanResult({
                success: true,
                message: "QR code scanned successfully!",
                qrData: qrData
            });
            
            // Stop scanning temporarily
            if (scanInterval) {
                clearInterval(scanInterval);
                setTimeout(() => {
                    if (isScanning) {
                        scanInterval = setInterval(scanQRCode, 100);
                    }
                }, 3000); // Resume after 3 seconds
            }
            
        } catch (error) {
            showScanResult({
                success: false,
                message: "Invalid QR code format!",
                error: error.message
            });
        }
    }
    
    function showScanResult(result) {
        const emptyState = document.getElementById('emptyScanResult');
        const scanDetails = document.getElementById('scanDetails');
        
        if (result.success) {
            // Hide empty state, show details
            emptyState.style.display = 'none';
            scanDetails.style.display = 'block';
            
            // Fill details
            document.getElementById('scanUnitName').textContent = result.qrData.unitName;
            document.getElementById('scanUnitCode').textContent = result.qrData.unitCode;
            document.getElementById('scanClassType').textContent = result.qrData.classType;
            document.getElementById('scanTopic').textContent = result.qrData.topic;
            document.getElementById('scanLecturer').textContent = result.qrData.lecturer;
            document.getElementById('scanTime').textContent = new Date().toLocaleString();
            
            // Get student info (from localStorage or session)
            const studentName = document.getElementById('userName').textContent || "Student";
            const studentId = localStorage.getItem('studentId') || "ST001";
            
            document.getElementById('scanStudentName').textContent = studentName;
            document.getElementById('scanStudentId').textContent = studentId;
            
            // Update scanner status
            scannerStatus.innerHTML = '<i class="fas fa-circle status-success"></i> QR code scanned successfully!';
            
            // Save to recent scans
            saveRecentScan(result.qrData);
            
            // Update attendance stats
            updateAttendanceStats();
            
        } else {
            // Show error
            alert(`Scan failed: ${result.message}`);
            scannerStatus.innerHTML = '<i class="fas fa-circle status-error"></i> Scan failed';
        }
    }
    
    async function saveAttendance() {
        const scanData = {
            studentId: document.getElementById('scanStudentId').textContent,
            studentName: document.getElementById('scanStudentName').textContent,
            unitCode: document.getElementById('scanUnitCode').textContent,
            unitName: document.getElementById('scanUnitName').textContent,
            classType: document.getElementById('scanClassType').textContent,
            lecturer: document.getElementById('scanLecturer').textContent,
            scanTime: new Date().toISOString(),
            status: 'present'
        };
        
        try {
            // Save to localStorage
            let attendanceRecords = JSON.parse(localStorage.getItem('attendanceRecords')) || [];
            attendanceRecords.push(scanData);
            localStorage.setItem('attendanceRecords', JSON.stringify(attendanceRecords));
            
            // Save to MongoDB
            const response = await fetch('https://your-backend-api.com/api/attendance', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(scanData)
            });
            
            if (response.ok) {
                alert('Attendance saved successfully!');
                // Update stats
                updateAttendanceStats();
                loadTodayScans();
            }
            
        } catch (error) {
            console.error('Error saving attendance:', error);
            alert('Failed to save attendance. Please try again.');
        }
    }
    
    function saveRecentScan(qrData) {
        let recentScans = JSON.parse(localStorage.getItem('recentScans')) || [];
        const scanRecord = {
            ...qrData,
            scanTime: new Date().toISOString(),
            studentName: document.getElementById('userName').textContent
        };
        
        recentScans.unshift(scanRecord);
        
        // Keep only last 20 scans
        if (recentScans.length > 20) {
            recentScans = recentScans.slice(0, 20);
        }
        
        localStorage.setItem('recentScans', JSON.stringify(recentScans));
    }
    
    function loadTodayScans() {
        const todayScansList = document.getElementById('todayScansList');
        const recentScans = JSON.parse(localStorage.getItem('recentScans')) || [];
        const today = new Date().toDateString();
        
        todayScansList.innerHTML = '';
        
        const todayScans = recentScans.filter(scan => {
            const scanDate = new Date(scan.scanTime).toDateString();
            return scanDate === today;
        });
        
        todayScans.forEach(scan => {
            const scanItem = document.createElement('div');
            scanItem.className = 'list-group-item';
            scanItem.innerHTML = `
                <div class="d-flex justify-content-between">
                    <div>
                        <h6>${scan.unitCode}</h6>
                        <small>${scan.unitName}</small>
                    </div>
                    <div class="text-right">
                        <small class="text-muted">${new Date(scan.scanTime).toLocaleTimeString()}</small>
                        <div><span class="badge badge-success">Present</span></div>
                    </div>
                </div>
            `;
            todayScansList.appendChild(scanItem);
        });
    }
    
    function updateAttendanceStats() {
        const attendanceRecords = JSON.parse(localStorage.getItem('attendanceRecords')) || [];
        
        // Calculate stats
        const totalClasses = 15; // This should come from your database
        const attendedClasses = attendanceRecords.length;
        const lateClasses = 0; // You can implement late detection
        const absentClasses = totalClasses - attendedClasses;
        
        // Update display
        document.getElementById('totalClasses').textContent = totalClasses;
        document.getElementById('attendedClasses').textContent = attendedClasses;
        document.getElementById('lateClasses').textContent = lateClasses;
        document.getElementById('absentClasses').textContent = absentClasses;
    }
    
    // Load today's scans on page load
    loadTodayScans();
    updateAttendanceStats();
    
    // Stop scanner when leaving page
    window.addEventListener('beforeunload', stopScanner);
});
