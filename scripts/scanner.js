// scanner.js - UPDATED FOR YOUR HTML STRUCTURE
document.addEventListener('DOMContentLoaded', function() {
    const API_BASE_URL = 'https://zero0-1-r0xs.onrender.com';
    
    // Variables for scanner
    let videoStream = null;
    let currentCamera = 'environment'; // 'environment' for back camera
    let isScanning = false;
    let scanInterval = null;
    let lastScannedQR = null;
    
    // Get DOM elements
    const scannerView = document.getElementById('scannerView');
    const startBtn = document.getElementById('startScannerBtn');
    const stopBtn = document.getElementById('stopScannerBtn');
    const manualEntryBtn = document.getElementById('manualEntryBtn');
    const testScanBtn = document.getElementById('testScanBtn');
    const refreshScansBtn = document.getElementById('refreshScansBtn');
    const recentScansBody = document.getElementById('recentScansBody');
    const manualEntryModal = document.getElementById('manualEntryModal');
    const manualQRCodeInput = document.getElementById('manualQRCode');
    const scanResult = document.getElementById('scanResult');
    
    // Create video and canvas elements
    const video = document.createElement('video');
    video.setAttribute('playsinline', '');
    video.style.width = '100%';
    video.style.height = 'auto';
    video.style.borderRadius = '8px';
    
    const canvas = document.createElement('canvas');
    canvas.style.display = 'none';
    
    // Create canvas context
    const ctx = canvas.getContext('2d');
    
    // Initialize
    initScanner();
    loadRecentScans();
    
    // Event Listeners
    startBtn.addEventListener('click', startScanner);
    stopBtn.addEventListener('click', stopScanner);
    manualEntryBtn.addEventListener('click', openManualEntry);
    testScanBtn.addEventListener('click', performTestScan);
    if (refreshScansBtn) {
        refreshScansBtn.addEventListener('click', loadRecentScans);
    }
    
    // Initialize scanner
    function initScanner() {
        // Check if user is logged in
        checkAuth();
        
        // Hide scanner view until started
        scannerView.innerHTML = `
            <div class="scanner-placeholder">
                <i class="fas fa-qrcode fa-4x"></i>
                <p>Ready to scan</p>
                <p class="small text-muted">Press "Start Scanner" to begin</p>
            </div>
        `;
        
        // Create initial styles
        const style = document.createElement('style');
        style.textContent = `
            .scanner-placeholder {
                padding: 40px 20px;
                text-align: center;
                color: #6c757d;
            }
            .scanner-placeholder i {
                margin-bottom: 20px;
                color: #dee2e6;
            }
            .scanner-placeholder p {
                margin: 5px 0;
            }
            .scan-success {
                background-color: #d4edda;
                border-color: #c3e6cb;
                color: #155724;
                padding: 10px;
                border-radius: 5px;
                margin-top: 10px;
            }
            .scan-error {
                background-color: #f8d7da;
                border-color: #f5c6cb;
                color: #721c24;
                padding: 10px;
                border-radius: 5px;
                margin-top: 10px;
            }
            .scanner-active {
                position: relative;
                overflow: hidden;
                border-radius: 8px;
            }
            .scanner-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
            }
            .scanner-frame {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 250px;
                height: 250px;
                border: 3px solid #00ff00;
                border-radius: 8px;
                box-shadow: 0 0 0 10000px rgba(0, 0, 0, 0.5);
            }
            .scanner-hint {
                position: absolute;
                bottom: 20px;
                left: 0;
                width: 100%;
                text-align: center;
                color: white;
                font-weight: 500;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
            }
            @keyframes pulse {
                0% { border-color: #00ff00; }
                50% { border-color: #00cc00; }
                100% { border-color: #00ff00; }
            }
            .scanner-frame {
                animation: pulse 2s infinite;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Check authentication
    function checkAuth() {
        // For demo, create a default student if none exists
        if (!localStorage.getItem('studentUser')) {
            localStorage.setItem('studentUser', JSON.stringify({
                id: 'ST001',
                name: 'Alice Johnson',
                role: 'Student',
                studentId: 'ST001',
                email: 'alice@example.com'
            }));
        }
        
        const user = JSON.parse(localStorage.getItem('studentUser'));
        document.getElementById('userName').textContent = user.name || 'Student';
        document.getElementById('userAvatar').textContent = getInitials(user.name);
        document.getElementById('miniAvatar').textContent = getInitials(user.name);
        document.getElementById('userRole').textContent = user.role || 'Student';
    }
    
    function getInitials(name) {
        return name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : 'AJ';
    }
    
    // Start scanner
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
            
            console.log('Requesting camera access...');
            videoStream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = videoStream;
            
            // Set up video playback
            video.onloadedmetadata = () => {
                console.log('Video metadata loaded');
                video.play().then(() => {
                    console.log('Video playback started');
                    
                    // Set canvas dimensions
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    
                    // Update scanner view
                    scannerView.innerHTML = '';
                    scannerView.classList.add('scanner-active');
                    scannerView.appendChild(video);
                    scannerView.appendChild(canvas);
                    
                    // Add scanner overlay
                    const overlay = document.createElement('div');
                    overlay.className = 'scanner-overlay';
                    overlay.innerHTML = `
                        <div class="scanner-frame"></div>
                        <div class="scanner-hint">Position QR code inside the frame</div>
                    `;
                    scannerView.appendChild(overlay);
                    
                    // Update UI
                    startBtn.style.display = 'none';
                    stopBtn.style.display = 'inline-block';
                    
                    // Clear any previous scan results
                    scanResult.innerHTML = '';
                    
                    // Start scanning
                    isScanning = true;
                    scanInterval = setInterval(scanQRCode, 300); // Scan every 300ms
                    
                    showMessage('Scanner started. Position QR code inside frame.', 'info');
                    
                }).catch(err => {
                    console.error('Video play error:', err);
                    showMessage('Error starting video playback', 'error');
                });
            };
            
            video.onerror = (err) => {
                console.error('Video error:', err);
                showMessage('Error accessing camera', 'error');
            };
            
        } catch (error) {
            console.error('Camera access error:', error);
            let message = 'Unable to access camera. ';
            if (error.name === 'NotAllowedError') {
                message += 'Please allow camera access in your browser settings.';
            } else if (error.name === 'NotFoundError') {
                message += 'No camera found on your device.';
            } else if (error.name === 'NotSupportedError') {
                message += 'Your browser does not support camera access.';
            } else {
                message += error.message;
            }
            showMessage(message, 'error');
        }
    }
    
    // Stop scanner
    function stopScanner() {
        console.log('Stopping scanner...');
        
        // Stop video stream
        if (videoStream) {
            videoStream.getTracks().forEach(track => {
                track.stop();
            });
            videoStream = null;
        }
        
        // Stop scanning interval
        if (scanInterval) {
            clearInterval(scanInterval);
            scanInterval = null;
        }
        
        // Reset scanner view
        scannerView.classList.remove('scanner-active');
        scannerView.innerHTML = `
            <div class="scanner-placeholder">
                <i class="fas fa-qrcode fa-4x"></i>
                <p>Scanner stopped</p>
                <p class="small text-muted">Press "Start Scanner" to begin</p>
            </div>
        `;
        
        // Update UI
        startBtn.style.display = 'inline-block';
        stopBtn.style.display = 'none';
        
        isScanning = false;
        showMessage('Scanner stopped', 'info');
    }
    
    // Scan QR code
    function scanQRCode() {
        if (!isScanning || !video.videoWidth || !video.videoHeight) return;
        
        try {
            // Draw current video frame to canvas
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Get image data from canvas
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            // Try to decode QR code
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert",
            });
            
            if (code && code.data) {
                // Avoid duplicate scans
                if (lastScannedQR === code.data) {
                    return;
                }
                lastScannedQR = code.data;
                
                console.log('QR Code detected:', code.data);
                handleQRCodeDetected(code.data);
            }
        } catch (error) {
            console.error('Scan error:', error);
        }
    }
    
    // Handle detected QR code
    async function handleQRCodeDetected(data) {
        try {
            console.log('Processing QR data:', data);
            
            // Parse QR data
            let qrData;
            try {
                qrData = JSON.parse(data);
            } catch (parseError) {
                // If it's a stringified object within a string
                if (data.startsWith('{"') && data.endsWith('}')) {
                    try {
                        qrData = JSON.parse(data);
                    } catch (e) {
                        // Try to extract JSON from malformed string
                        const jsonMatch = data.match(/{.*}/);
                        if (jsonMatch) {
                            qrData = JSON.parse(jsonMatch[0]);
                        } else {
                            throw new Error('Invalid QR code format');
                        }
                    }
                } else {
                    throw new Error('Invalid QR code format');
                }
            }
            
            // Validate QR data structure
            if (!qrData.qrCodeId) {
                throw new Error('Invalid QR code: Missing QR ID');
            }
            
            // Check if QR code is expired
            const expiryTime = new Date(qrData.expiresAt || qrData.expiryTime);
            const now = new Date();
            
            if (now > expiryTime) {
                showScanResult(false, "QR code has expired!", qrData);
                return;
            }
            
            // Check if QR code is active
            if (qrData.isActive === false) {
                showScanResult(false, "QR code is no longer active!", qrData);
                return;
            }
            
            // Verify QR code exists in backend
            try {
                const isValid = await verifyQRCode(qrData.qrCodeId);
                if (!isValid) {
                    showScanResult(false, "Invalid QR code!", qrData);
                    return;
                }
            } catch (verifyError) {
                console.warn('QR verification failed, proceeding anyway:', verifyError);
            }
            
            // Check if student has already attended
            const user = JSON.parse(localStorage.getItem('studentUser'));
            const hasAttended = await checkAttendance(user.studentId, qrData.qrCodeId);
            
            if (hasAttended) {
                showScanResult(false, "You have already attended this class!", qrData);
                return;
            }
            
            // Show successful scan
            showScanResult(true, "QR code scanned successfully!", qrData);
            
            // Stop scanning temporarily
            if (scanInterval) {
                clearInterval(scanInterval);
                isScanning = false;
            }
            
            // Auto-save attendance
            setTimeout(() => {
                saveAttendance(qrData);
            }, 1000);
            
        } catch (error) {
            console.error('Error handling QR code:', error);
            showScanResult(false, error.message || "Invalid QR code!", null);
        }
    }
    
    // Verify QR code with backend
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
            console.error('QR verification error:', error);
            return false;
        }
    }
    
    // Check if student has already attended
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
            console.error('Attendance check error:', error);
            return false;
        }
    }
    
    // Show scan result
    function showScanResult(success, message, qrData) {
        const resultClass = success ? 'scan-success' : 'scan-error';
        const icon = success ? 'fa-check-circle' : 'fa-exclamation-circle';
        
        let resultHTML = `
            <div class="${resultClass}">
                <i class="fas ${icon}"></i> ${message}
            </div>
        `;
        
        if (success && qrData) {
            resultHTML += `
                <div class="mt-2">
                    <strong>Class:</strong> ${qrData.unitName || 'Unknown'} (${qrData.unitCode || 'N/A'})<br>
                    <strong>Lecturer:</strong> ${qrData.lecturerName || qrData.lecturer || 'Unknown'}<br>
                    <strong>Type:</strong> ${qrData.classType || 'Lecture'}<br>
                    <small class="text-muted">Recording attendance...</small>
                </div>
            `;
        }
        
        scanResult.innerHTML = resultHTML;
    }
    
    // Save attendance to backend
    async function saveAttendance(qrData) {
        const user = JSON.parse(localStorage.getItem('studentUser'));
        
        const attendanceData = {
            studentId: user.studentId,
            studentName: user.name,
            qrCodeId: qrData.qrCodeId,
            unitCode: qrData.unitCode,
            unitName: qrData.unitName,
            classType: qrData.classType,
            lecturerName: qrData.lecturerName || qrData.lecturer,
            scanTime: new Date().toISOString(),
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
                
                // Update recent scans
                loadRecentScans();
                
                // Show success message
                showScanResult(true, "✅ Attendance recorded successfully!", qrData);
                
                // Resume scanning after 5 seconds
                setTimeout(() => {
                    if (!isScanning) {
                        startScanner();
                    }
                }, 5000);
                
            } else {
                const errorText = await response.text();
                throw new Error(`Server error: ${response.status}`);
            }
            
        } catch (error) {
            console.error('Error saving attendance:', error);
            showScanResult(false, "Failed to save attendance. Please try again.", null);
        }
    }
    
    // Save to localStorage
    function saveToLocalStorage(attendance) {
        // Save to attendance records
        let attendanceRecords = JSON.parse(localStorage.getItem('attendanceRecords')) || [];
        attendanceRecords.push(attendance);
        localStorage.setItem('attendanceRecords', JSON.stringify(attendanceRecords));
        
        // Save to recent scans
        let recentScans = JSON.parse(localStorage.getItem('recentScans')) || [];
        recentScans.unshift(attendance);
        if (recentScans.length > 20) recentScans = recentScans.slice(0, 20);
        localStorage.setItem('recentScans', JSON.stringify(recentScans));
    }
    
    // Load recent scans
    async function loadRecentScans() {
        const user = JSON.parse(localStorage.getItem('studentUser'));
        
        try {
            // Try to load from backend
            const response = await fetch(`${API_BASE_URL}/api/attendance/student/${user.studentId}`);
            
            let scans = [];
            
            if (response.ok) {
                scans = await response.json();
            } else {
                // Fallback to localStorage
                scans = JSON.parse(localStorage.getItem('recentScans')) || [];
            }
            
            // Display recent scans
            displayRecentScans(scans.slice(0, 10)); // Show last 10 scans
            
        } catch (error) {
            console.error('Error loading recent scans:', error);
            // Fallback to localStorage
            const scans = JSON.parse(localStorage.getItem('recentScans')) || [];
            displayRecentScans(scans.slice(0, 10));
        }
    }
    
    // Display recent scans in table
    function displayRecentScans(scans) {
        if (!recentScansBody) return;
        
        if (scans.length === 0) {
            recentScansBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted">
                        No attendance records yet
                    </td>
                </tr>
            `;
            return;
        }
        
        let html = '';
        
        scans.forEach(scan => {
            const scanDate = new Date(scan.scanTime || scan.createdAt);
            const dateStr = scanDate.toLocaleDateString();
            const timeStr = scanDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            html += `
                <tr>
                    <td>${dateStr}</td>
                    <td>${timeStr}</td>
                    <td>${scan.unitCode || 'N/A'}<br><small class="text-muted">${scan.unitName || ''}</small></td>
                    <td>${scan.lecturerName || 'Unknown'}</td>
                    <td><span class="badge badge-success">Present</span></td>
                </tr>
            `;
        });
        
        recentScansBody.innerHTML = html;
    }
    
    // Manual entry functions
    function openManualEntry() {
        // Populate with example QR data
        const exampleQR = {
            qrCodeId: "QR_TEST_123",
            unitName: "Database Systems",
            unitCode: "CS301",
            classType: "lecture",
            lecturerName: "Dr. Smith",
            expiresAt: new Date(Date.now() + 3600000).toISOString(),
            isActive: true
        };
        
        manualQRCodeInput.value = JSON.stringify(exampleQR, null, 2);
        manualEntryModal.style.display = 'block';
    }
    
    function closeManualEntry() {
        manualEntryModal.style.display = 'none';
        manualQRCodeInput.value = '';
    }
    
    function submitManualEntry() {
        const qrDataString = manualQRCodeInput.value.trim();
        
        if (!qrDataString) {
            showMessage('Please enter QR code data', 'error');
            return;
        }
        
        try {
            const qrData = JSON.parse(qrDataString);
            handleQRCodeDetected(JSON.stringify(qrData));
            closeManualEntry();
        } catch (error) {
            showMessage('Invalid JSON format. Please check your input.', 'error');
        }
    }
    
    // Test scan function
    function performTestScan() {
        // Use your actual QR code data from database
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
        
        // Simulate scanning
        handleQRCodeDetected(JSON.stringify(testQRData));
        showMessage('Test scan performed with sample QR code', 'info');
    }
    
    // Show message
    function showMessage(message, type) {
        console.log(`${type}: ${message}`);
        
        // Create notification if not exists
        let notification = document.querySelector('.global-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.className = 'global-notification';
            document.body.appendChild(notification);
        }
        
        const bgColor = type === 'error' ? '#dc3545' : 
                       type === 'success' ? '#28a745' : 
                       type === 'info' ? '#17a2b8' : '#6c757d';
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${bgColor};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 9999;
            animation: slideIn 0.3s ease;
        `;
        
        notification.innerHTML = `
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 
                               type === 'success' ? 'check-circle' : 
                               'info-circle'}"></i>
            <span style="margin-left: 10px;">${message}</span>
        `;
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    // Add CSS for notifications
    const notificationStyle = document.createElement('style');
    notificationStyle.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(notificationStyle);
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === manualEntryModal) {
            closeManualEntry();
        }
    });
    
    // Add logout function
    window.logout = function() {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('studentUser');
            window.location.href = 'login.html';
        }
    };
    
    // Stop scanner when leaving page
    window.addEventListener('beforeunload', function() {
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
        }
        if (scanInterval) {
            clearInterval(scanInterval);
        }
    });
    
    // Initial test of backend connection
    async function testBackendConnection() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/qrcodes`);
            console.log('Backend connection test:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('Backend has', data.length, 'QR codes');
                showMessage(`Connected to backend (${data.length} QR codes found)`, 'success');
            } else {
                console.warn('Backend responded with status:', response.status);
                showMessage('Backend connection issue', 'warning');
            }
        } catch (error) {
            console.error('Backend connection failed:', error);
            showMessage('Cannot connect to backend server', 'error');
        }
    }
    
    // Test backend connection on load
    setTimeout(testBackendConnection, 1000);
});
