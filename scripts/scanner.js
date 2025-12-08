// scripts/qr-generator.js - QR CODE GENERATION
const API_BASE_URL = 'https://zero0-1-r0xs.onrender.com';
// scanner.js - WORKING VERSION
document.addEventListener('DOMContentLoaded', function() {
    const API_BASE_URL = 'https://zero0-1-r0xs.onrender.com';
    
    let videoStream = null;
    let currentCamera = 'environment';
    let isScanning = false;
    let scanInterval = null;
    let flashEnabled = false;
    let lastScannedQR = null;
    
    const video = document.getElementById('scannerVideo');
    const canvas = document.getElementById('scannerCanvas');
    const ctx = canvas.getContext('2d');
    const startBtn = document.getElementById('startScannerBtn');
    const stopBtn = document.getElementById('stopScannerBtn');
    const switchBtn = document.getElementById('switchCameraBtn');
    const flashBtn = document.getElementById('flashToggleBtn');
    const saveBtn = document.getElementById('saveAttendanceBtn');
    const scannerStatus = document.getElementById('scannerStatus');
    const manualEntryBtn = document.getElementById('manualEntryBtn');
    const testScanBtn = document.getElementById('testScanBtn');
    
    // Check authentication
    checkAuth();
    
    // Event Listeners
    if (startBtn) startBtn.addEventListener('click', startScanner);
    if (stopBtn) stopBtn.addEventListener('click', stopScanner);
    if (switchBtn) switchBtn.addEventListener('click', switchCamera);
    if (flashBtn) flashBtn.addEventListener('click', toggleFlash);
    if (saveBtn) saveBtn.addEventListener('click', saveAttendance);
    if (manualEntryBtn) manualEntryBtn.addEventListener('click', manualEntry);
    if (testScanBtn) testScanBtn.addEventListener('click', testScan);
    
    // Load today's scans
    loadTodayScans();
    updateAttendanceStats();
    
    // Check for URL parameters (for testing)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('test')) {
        setTimeout(() => {
            testScan();
        }, 1000);
    }
    
    // Functions
    function checkAuth() {
        // For demo, create a default student if none exists
        if (!localStorage.getItem('user')) {
            localStorage.setItem('user', JSON.stringify({
                id: 'ST001',
                name: 'John Doe',
                role: 'Student',
                studentId: 'ST001',
                email: 'student@example.com'
            }));
        }
        
        const user = JSON.parse(localStorage.getItem('user'));
        document.getElementById('userName').textContent = user.name || 'Student';
        document.getElementById('userAvatar').textContent = getInitials(user.name);
        document.getElementById('miniAvatar').textContent = getInitials(user.name);
        document.getElementById('userRole').textContent = user.role || 'Student';
        document.getElementById('scanStudentName').textContent = user.name || 'Student';
        document.getElementById('scanStudentId').textContent = user.studentId || 'ST001';
    }
    
    function getInitials(name) {
        return name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : 'JD';
    }
    
    async function startScanner() {
        try {
            // Request camera access
            const constraints = {
                video: {
                    facingMode: currentCamera,
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                }
            };
            
            videoStream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = videoStream;
            
            // Wait for video to be ready
            video.onloadedmetadata = () => {
                video.play().then(() => {
                    // Set canvas dimensions
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    
                    // Update UI
                    startBtn.style.display = 'none';
                    if (stopBtn) stopBtn.style.display = 'inline-block';
                    scannerStatus.innerHTML = '<i class="fas fa-circle status-scanning"></i> Scanning...';
                    
                    isScanning = true;
                    scanInterval = setInterval(scanQRCode, 500); // Scan every 500ms
                    
                    showNotification('Camera started. Position QR code in frame.', 'info');
                });
            };
            
        } catch (error) {
            console.error('Error accessing camera:', error);
            let message = 'Unable to access camera. ';
            if (error.name === 'NotAllowedError') {
                message += 'Please allow camera access in your browser settings.';
            } else if (error.name === 'NotFoundError') {
                message += 'No camera found on your device.';
            } else if (error.name === 'NotSupportedError') {
                message += 'Your browser does not support camera access.';
            }
            showNotification(message, 'error');
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
        if (startBtn) startBtn.style.display = 'inline-block';
        if (stopBtn) stopBtn.style.display = 'none';
        scannerStatus.innerHTML = '<i class="fas fa-circle status-idle"></i> Scanner ready';
        
        isScanning = false;
        showNotification('Scanner stopped', 'info');
    }
    
    function switchCamera() {
        currentCamera = currentCamera === 'environment' ? 'user' : 'environment';
        if (isScanning) {
            stopScanner();
            setTimeout(() => startScanner(), 500);
        }
    }
    
    function toggleFlash() {
        if (videoStream) {
            const track = videoStream.getVideoTracks()[0];
            if (track.getCapabilities && track.getCapabilities().torch) {
                flashEnabled = !flashEnabled;
                track.applyConstraints({
                    advanced: [{ torch: flashEnabled }]
                }).then(() => {
                    flashBtn.innerHTML = flashEnabled ? 
                        '<i class="fas fa-lightbulb"></i> Flash ON' : 
                        '<i class="fas fa-lightbulb"></i> Flash';
                }).catch(err => {
                    console.error('Error toggling flash:', err);
                });
            }
        }
    }
    
    function scanQRCode() {
        if (!isScanning || !video.videoWidth || !video.videoHeight) return;
        
        try {
            // Draw video frame to canvas
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Get image data
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            // Decode QR code using jsQR
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert",
            });
            
            if (code && code.data) {
                // Avoid duplicate scans
                if (lastScannedQR === code.data) return;
                lastScannedQR = code.data;
                
                handleQRCodeDetected(code.data);
            }
        } catch (error) {
            console.error('Scan error:', error);
        }
    }
    
    async function handleQRCodeDetected(data) {
        try {
            console.log('QR Code detected:', data);
            
            // Parse QR data
            let qrData;
            try {
                qrData = JSON.parse(data);
            } catch (e) {
                // If it's already a stringified object inside a string
                if (data.startsWith('{"qrCodeId":"')) {
                    qrData = JSON.parse(data);
                } else {
                    throw new Error('Invalid QR code format');
                }
            }
            
            // Check if QR has required fields
            if (!qrData.qrCodeId) {
                throw new Error('Invalid QR code: Missing QR ID');
            }
            
            // Check if QR is expired
            const expiryTime = new Date(qrData.expiresAt);
            const now = new Date();
            
            if (now > expiryTime) {
                showScanResult({
                    success: false,
                    message: "QR code has expired!",
                    qrData: qrData
                });
                return;
            }
            
            // Check if QR is active
            if (qrData.isActive === false) {
                showScanResult({
                    success: false,
                    message: "QR code is no longer active!",
                    qrData: qrData
                });
                return;
            }
            
            // Verify QR code exists in backend
            const qrValid = await verifyQRCode(qrData.qrCodeId);
            if (!qrValid) {
                showScanResult({
                    success: false,
                    message: "Invalid QR code!",
                    qrData: qrData
                });
                return;
            }
            
            // Check if already attended
            const user = JSON.parse(localStorage.getItem('user'));
            const hasAttended = await checkAttendance(user.studentId, qrData.qrCodeId);
            
            if (hasAttended) {
                showScanResult({
                    success: false,
                    message: "You have already attended this class!",
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
            
            // Stop scanning temporarily to prevent multiple scans
            if (scanInterval) {
                clearInterval(scanInterval);
                isScanning = false;
            }
            
        } catch (error) {
            console.error('Error handling QR code:', error);
            showScanResult({
                success: false,
                message: error.message || "Invalid QR code!",
                error: error
            });
        }
    }
    
    async function verifyQRCode(qrCodeId) {
        try {
            console.log('Verifying QR code:', qrCodeId);
            const response = await fetch(`${API_BASE_URL}/api/qrcodes/${qrCodeId}`);
            
            if (response.ok) {
                const qrData = await response.json();
                console.log('QR code verified:', qrData);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error verifying QR code:', error);
            return false;
        }
    }
    
    async function checkAttendance(studentId, qrCodeId) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/attendance/check`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ studentId, qrCodeId })
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.attended || false;
            }
            return false;
        } catch (error) {
            console.error('Error checking attendance:', error);
            return false;
        }
    }
    
    function showScanResult(result) {
        const emptyState = document.getElementById('emptyScanResult');
        const scanDetails = document.getElementById('scanDetails');
        
        if (result.success) {
            // Hide empty state, show details
            if (emptyState) emptyState.style.display = 'none';
            if (scanDetails) scanDetails.style.display = 'block';
            
            // Fill details with actual QR data
            if (result.qrData) {
                document.getElementById('scanUnitName').textContent = result.qrData.unitName || 'Unknown';
                document.getElementById('scanUnitCode').textContent = result.qrData.unitCode || 'Unknown';
                document.getElementById('scanClassType').textContent = result.qrData.classType || 'Lecture';
                document.getElementById('scanTopic').textContent = result.qrData.topic || 'Not specified';
                document.getElementById('scanLecturer').textContent = result.qrData.lecturerName || result.qrData.lecturer || 'Unknown';
                document.getElementById('scanTime').textContent = new Date().toLocaleString();
                document.getElementById('qrCodeId').textContent = result.qrData.qrCodeId || 'Unknown';
            }
            
            // Update scanner status
            scannerStatus.innerHTML = '<i class="fas fa-circle status-success"></i> QR code validated!';
            
            // Auto-save attendance after 2 seconds
            setTimeout(() => {
                saveAttendance();
            }, 2000);
            
            showNotification('✅ QR code validated successfully!', 'success');
            
        } else {
            // Show error
            showNotification(`❌ ${result.message}`, 'error');
            scannerStatus.innerHTML = '<i class="fas fa-circle status-error"></i> Scan failed';
            
            // Resume scanning after 3 seconds
            setTimeout(() => {
                if (!isScanning) {
                    isScanning = true;
                    scanInterval = setInterval(scanQRCode, 500);
                }
            }, 3000);
        }
    }
    
    async function saveAttendance() {
        const user = JSON.parse(localStorage.getItem('user'));
        
        const attendanceData = {
            studentId: user.studentId,
            studentName: user.name,
            qrCodeId: document.getElementById('qrCodeId')?.textContent || lastScannedQR?.qrCodeId,
            unitCode: document.getElementById('scanUnitCode')?.textContent,
            unitName: document.getElementById('scanUnitName')?.textContent,
            classType: document.getElementById('scanClassType')?.textContent,
            lecturerName: document.getElementById('scanLecturer')?.textContent,
            scanTime: new Date(),
            status: 'present'
        };
        
        console.log('Saving attendance:', attendanceData);
        
        try {
            // Save to backend
            const response = await fetch(`${API_BASE_URL}/api/attendance`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(attendanceData)
            });
            
            if (response.ok) {
                const savedAttendance = await response.json();
                console.log('Attendance saved:', savedAttendance);
                
                // Save to localStorage
                saveToLocalStorage(savedAttendance);
                
                // Update stats
                updateAttendanceStats();
                loadTodayScans();
                
                showNotification('✅ Attendance recorded successfully!', 'success');
                
                // Auto-hide scan details after 5 seconds
                setTimeout(() => {
                    if (document.getElementById('emptyScanResult')) {
                        document.getElementById('emptyScanResult').style.display = 'block';
                    }
                    if (document.getElementById('scanDetails')) {
                        document.getElementById('scanDetails').style.display = 'none';
                    }
                    // Resume scanning
                    if (!isScanning) {
                        isScanning = true;
                        scanInterval = setInterval(scanQRCode, 500);
                    }
                }, 5000);
            } else {
                const errorText = await response.text();
                throw new Error(`Server error: ${response.status} - ${errorText}`);
            }
            
        } catch (error) {
            console.error('Error saving attendance:', error);
            showNotification('❌ Failed to save attendance. ' + error.message, 'error');
        }
    }
    
    function saveToLocalStorage(attendance) {
        let attendanceRecords = JSON.parse(localStorage.getItem('attendanceRecords')) || [];
        attendanceRecords.push(attendance);
        localStorage.setItem('attendanceRecords', JSON.stringify(attendanceRecords));
        
        // Save to recent scans
        let recentScans = JSON.parse(localStorage.getItem('recentScans')) || [];
        recentScans.unshift(attendance);
        if (recentScans.length > 20) recentScans = recentScans.slice(0, 20);
        localStorage.setItem('recentScans', JSON.stringify(recentScans));
    }
    
    async function loadTodayScans() {
        const todayScansList = document.getElementById('todayScansList');
        if (!todayScansList) return;
        
        const user = JSON.parse(localStorage.getItem('user'));
        
        todayScansList.innerHTML = '';
        
        try {
            // Try to load from backend
            const response = await fetch(`${API_BASE_URL}/api/attendance/student/${user.studentId}`);
            
            if (response.ok) {
                const allAttendance = await response.json();
                
                // Filter for today
                const today = new Date().toDateString();
                const todayScans = allAttendance.filter(scan => {
                    const scanDate = new Date(scan.scanTime).toDateString();
                    return scanDate === today;
                });
                
                if (todayScans.length > 0) {
                    todayScans.forEach(scan => {
                        const scanItem = createScanListItem(scan);
                        todayScansList.appendChild(scanItem);
                    });
                } else {
                    todayScansList.innerHTML = '<div class="text-center text-muted p-3">No scans today</div>';
                }
            } else {
                // Fallback to localStorage
                const recentScans = JSON.parse(localStorage.getItem('recentScans')) || [];
                const todayScans = recentScans.filter(scan => {
                    const scanDate = new Date(scan.scanTime).toDateString();
                    return scanDate === new Date().toDateString();
                });
                
                if (todayScans.length > 0) {
                    todayScans.forEach(scan => {
                        const scanItem = createScanListItem(scan);
                        todayScansList.appendChild(scanItem);
                    });
                } else {
                    todayScansList.innerHTML = '<div class="text-center text-muted p-3">No scans today</div>';
                }
            }
        } catch (error) {
            console.error('Error loading today\'s scans:', error);
            todayScansList.innerHTML = '<div class="text-center text-muted p-3">Failed to load scans</div>';
        }
    }
    
    function createScanListItem(scan) {
        const scanItem = document.createElement('div');
        scanItem.className = 'list-group-item';
        scanItem.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <h6 class="mb-1">${scan.unitCode || 'N/A'} - ${scan.unitName || 'Unknown Class'}</h6>
                    <small class="text-muted">${scan.classType || 'Lecture'}</small>
                </div>
                <div class="text-right">
                    <div class="badge badge-success">Present</div>
                    <div><small class="text-muted">${new Date(scan.scanTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</small></div>
                </div>
            </div>
        `;
        return scanItem;
    }
    
    async function updateAttendanceStats() {
        const user = JSON.parse(localStorage.getItem('user'));
        
        try {
            // Get attendance for this student
            const response = await fetch(`${API_BASE_URL}/api/attendance/student/${user.studentId}`);
            
            if (response.ok) {
                const attendanceRecords = await response.json();
                
                // Calculate stats
                const totalClasses = 15; // This should come from your course data
                const attendedClasses = attendanceRecords.length;
                const lateClasses = attendanceRecords.filter(a => a.status === 'late').length;
                const absentClasses = totalClasses - attendedClasses;
                
                // Update display
                document.getElementById('totalClasses').textContent = totalClasses;
                document.getElementById('attendedClasses').textContent = attendedClasses;
                document.getElementById('lateClasses').textContent = lateClasses;
                document.getElementById('absentClasses').textContent = absentClasses;
                
                // Calculate percentage
                const percentage = totalClasses > 0 ? 
                    Math.round((attendedClasses / totalClasses) * 100) : 0;
                
                // Add percentage to attended
                const attendedEl = document.getElementById('attendedClasses');
                if (attendedEl) {
                    attendedEl.innerHTML = `${attendedClasses} <small class="text-muted">(${percentage}%)</small>`;
                }
            }
        } catch (error) {
            console.error('Error loading stats:', error);
            // Fallback to localStorage
            const attendanceRecords = JSON.parse(localStorage.getItem('attendanceRecords')) || [];
            document.getElementById('attendedClasses').textContent = attendanceRecords.length;
        }
    }
    
    function manualEntry() {
        const qrCodeId = prompt('Enter QR Code ID:');
        if (qrCodeId) {
            // Simulate scanning
            handleQRCodeDetected(JSON.stringify({
                qrCodeId: qrCodeId,
                unitName: "Manual Entry",
                unitCode: "MAN001",
                classType: "lecture",
                topic: "Manual attendance",
                lecturerName: "System",
                expiresAt: new Date(Date.now() + 3600000).toISOString(),
                isActive: true
            }));
        }
    }
    
    function testScan() {
        // Use one of your actual QR codes from MongoDB
        const testQRData = {
            qrCodeId: "QR_3DF8CFEC04CE",
            unitName: "Calculus",
            unitCode: "Maths 120",
            classType: "lecture",
            topic: "",
            lecturerId: "ID1",
            lecturerName: "yusuf hassan",
            duration: 60,
            createdAt: "2025-12-08T04:30:46.167Z",
            expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
            isActive: true
        };
        
        handleQRCodeDetected(JSON.stringify(testQRData));
        showNotification('Test QR code scanned', 'info');
    }
    
    function showNotification(message, type) {
        // Remove existing notifications
        document.querySelectorAll('.notification').forEach(n => n.remove());
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 
                              type === 'error' ? 'exclamation-circle' : 
                              type === 'info' ? 'info-circle' : 'exclamation-triangle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    // Add CSS for scanner if not exists
    if (!document.querySelector('#scanner-styles')) {
        const style = document.createElement('style');
        style.id = 'scanner-styles';
        style.textContent = `
            .scanner-container {
                position: relative;
                margin: 0 auto;
                max-width: 500px;
            }
            .scanner-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                background: rgba(0, 0, 0, 0.5);
            }
            .scanner-frame {
                width: 250px;
                height: 250px;
                border: 3px solid #00ff00;
                border-radius: 10px;
                position: relative;
                animation: pulse 2s infinite;
            }
            @keyframes pulse {
                0% { border-color: #00ff00; }
                50% { border-color: #00cc00; }
                100% { border-color: #00ff00; }
            }
            .scanner-hint {
                color: white;
                margin-top: 20px;
                font-size: 16px;
                text-align: center;
            }
            .status-idle { color: #6c757d; }
            .status-scanning { color: #ffc107; animation: pulseStatus 1.5s infinite; }
            .status-success { color: #28a745; }
            .status-error { color: #dc3545; }
            @keyframes pulseStatus {
                0% { opacity: 1; }
                50% { opacity: 0.5; }
                100% { opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Stop scanner when leaving page
    window.addEventListener('beforeunload', stopScanner);
});
