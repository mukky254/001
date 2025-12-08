// scanner.js - COMPLETE WORKING SCANNER WITH ANALYSIS
document.addEventListener('DOMContentLoaded', function() {
    const API_BASE_URL = 'https://zero0-1-r0xs.onrender.com';
    
    // Scanner variables
    let videoStream = null;
    let currentCamera = 'environment';
    let isScanning = false;
    let scanInterval = null;
    let flashEnabled = false;
    let lastScannedData = null;
    let scanAttempts = 0;
    let successfulScans = 0;
    let failedScans = 0;
    
    // DOM Elements
    const video = document.getElementById('scannerVideo');
    const canvas = document.getElementById('scannerCanvas');
    const ctx = canvas.getContext('2d');
    const scannerStatus = document.getElementById('scannerStatus');
    const startBtn = document.getElementById('startScannerBtn');
    const stopBtn = document.getElementById('stopScannerBtn');
    const switchBtn = document.getElementById('switchCameraBtn');
    const flashBtn = document.getElementById('flashToggleBtn');
    const manualEntryBtn = document.getElementById('manualEntryBtn');
    const testScanBtn = document.getElementById('testScanBtn');
    const scanResult = document.getElementById('scanResult');
    const qrDataDisplay = document.getElementById('qrDataDisplay');
    const qrFields = document.getElementById('qrFields');
    const saveAttendanceBtn = document.getElementById('saveAttendanceBtn');
    const scanAgainBtn = document.getElementById('scanAgainBtn');
    const refreshScansBtn = document.getElementById('refreshScansBtn');
    const recentScansBody = document.getElementById('recentScansBody');
    const totalScansToday = document.getElementById('totalScansToday');
    const successfulScansEl = document.getElementById('successfulScans');
    const failedScansEl = document.getElementById('failedScans');
    
    // QR Info Panel elements
    const noScanMessage = document.getElementById('noScanMessage');
    const qrDetails = document.getElementById('qrDetails');
    const qrInfoElements = {
        qrCodeId: document.getElementById('qrCodeId'),
        qrUnitName: document.getElementById('qrUnitName'),
        qrUnitCode: document.getElementById('qrUnitCode'),
        qrClassType: document.getElementById('qrClassType'),
        qrLecturer: document.getElementById('qrLecturer'),
        qrTopic: document.getElementById('qrTopic'),
        qrDuration: document.getElementById('qrDuration'),
        qrGenerated: document.getElementById('qrGenerated'),
        qrExpires: document.getElementById('qrExpires'),
        qrStatus: document.getElementById('qrStatus'),
        qrValidUntil: document.getElementById('qrValidUntil')
    };
    
    // Initialize scanner
    initScanner();
    
    // Event Listeners
    startBtn.addEventListener('click', startScanner);
    stopBtn.addEventListener('click', stopScanner);
    switchBtn.addEventListener('click', switchCamera);
    flashBtn.addEventListener('click', toggleFlash);
    manualEntryBtn.addEventListener('click', openManualEntry);
    testScanBtn.addEventListener('click', performTestScan);
    saveAttendanceBtn.addEventListener('click', saveAttendance);
    scanAgainBtn.addEventListener('click', scanAgain);
    if (refreshScansBtn) {
        refreshScansBtn.addEventListener('click', loadRecentScans);
    }
    
    // Initialize scanner
    function initScanner() {
        console.log('Initializing QR scanner...');
        
        // Initialize user data
        initializeUser();
        
        // Load statistics
        loadStatistics();
        loadRecentScans();
        
        // Test backend connection
        testBackendConnection();
        
        updateScannerStatus('ready', 'Scanner ready to start');
    }
    
    // Initialize user data
    function initializeUser() {
        if (!localStorage.getItem('studentUser')) {
            const defaultUser = {
                id: 'ST' + Date.now().toString().slice(-6),
                name: 'Alice Johnson',
                studentId: 'ST001',
                role: 'Student',
                email: 'alice@example.com'
            };
            localStorage.setItem('studentUser', JSON.stringify(defaultUser));
        }
        
        const user = JSON.parse(localStorage.getItem('studentUser'));
        updateUserDisplay(user);
    }
    
    // Update user display
    function updateUserDisplay(user) {
        document.getElementById('userName').textContent = user.name;
        document.getElementById('userAvatar').textContent = getInitials(user.name);
        document.getElementById('miniAvatar').textContent = getInitials(user.name);
        document.getElementById('userRole').textContent = user.role;
    }
    
    function getInitials(name) {
        return name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : 'AJ';
    }
    
    // Start scanner
    async function startScanner() {
        try {
            console.log('Starting scanner...');
            
            // Request camera access
            const constraints = {
                video: {
                    facingMode: currentCamera,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };
            
            videoStream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = videoStream;
            
            // Set up video
            await video.play();
            
            // Set canvas dimensions
            const track = videoStream.getVideoTracks()[0];
            const settings = track.getSettings();
            canvas.width = settings.width || video.videoWidth;
            canvas.height = settings.height || video.videoHeight;
            
            console.log(`Canvas dimensions: ${canvas.width}x${canvas.height}`);
            
            // Update UI
            startBtn.style.display = 'none';
            stopBtn.style.display = 'inline-block';
            updateScannerStatus('scanning', 'Scanning for QR codes...');
            
            // Start scanning loop
            isScanning = true;
            scanInterval = setInterval(scanFrame, 200); // Scan every 200ms
            
            showNotification('Scanner started successfully!', 'success');
            
        } catch (error) {
            console.error('Failed to start scanner:', error);
            handleScannerError(error);
        }
    }
    
    // Stop scanner
    function stopScanner() {
        console.log('Stopping scanner...');
        
        // Stop video stream
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
            videoStream = null;
        }
        
        // Stop scanning interval
        if (scanInterval) {
            clearInterval(scanInterval);
            scanInterval = null;
        }
        
        // Reset UI
        startBtn.style.display = 'inline-block';
        stopBtn.style.display = 'none';
        isScanning = false;
        
        updateScannerStatus('stopped', 'Scanner stopped');
        showNotification('Scanner stopped', 'info');
    }
    
    // Scan each frame
    function scanFrame() {
        if (!isScanning || !video.videoWidth) return;
        
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
                scanAttempts++;
                processQRCode(code.data);
            }
        } catch (error) {
            console.error('Scan error:', error);
        }
    }
    
    // Process QR code data
    async function processQRCode(data) {
        try {
            console.log('QR Code detected:', data.substring(0, 100) + '...');
            
            // Parse JSON data
            let qrData;
            try {
                qrData = JSON.parse(data);
            } catch (e) {
                // Try to clean and parse
                const cleanedData = data.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim();
                qrData = JSON.parse(cleanedData);
            }
            
            // Validate required fields
            if (!qrData.qrCodeId || !qrData.unitName || !qrData.unitCode) {
                throw new Error('Invalid QR code format');
            }
            
            // Check if this is a duplicate scan
            if (lastScannedData && lastScannedData.qrCodeId === qrData.qrCodeId) {
                return; // Ignore duplicate
            }
            
            lastScannedData = qrData;
            
            // Stop scanning temporarily
            if (scanInterval) {
                clearInterval(scanInterval);
                scanInterval = null;
                isScanning = false;
            }
            
            // Update scanner status
            updateScannerStatus('success', 'QR code detected!');
            
            // Analyze QR code
            await analyzeQRCode(qrData);
            
        } catch (error) {
            console.error('Error processing QR code:', error);
            failedScans++;
            updateStatistics();
            
            updateScannerStatus('error', 'Invalid QR code');
            showNotification('Invalid QR code format', 'error');
            
            // Resume scanning after 2 seconds
            setTimeout(() => {
                if (!isScanning) {
                    isScanning = true;
                    scanInterval = setInterval(scanFrame, 200);
                }
            }, 2000);
        }
    }
    
    // Analyze QR code
    async function analyzeQRCode(qrData) {
        console.log('Analyzing QR code:', qrData);
        
        // Display raw data
        displayRawData(qrData);
        
        // Extract and display fields
        extractAndDisplayFields(qrData);
        
        // Validate QR code
        const validation = validateQRCode(qrData);
        
        // Update info panel
        updateQRInfoPanel(qrData, validation);
        
        // Show scan result
        scanResult.style.display = 'block';
        saveAttendanceBtn.style.display = validation.isValid ? 'inline-block' : 'none';
        
        // Show notification
        if (validation.isValid) {
            successfulScans++;
            showNotification(`✅ Valid QR code: ${qrData.unitName}`, 'success');
        } else {
            failedScans++;
            showNotification(`❌ ${validation.message}`, 'error');
        }
        
        updateStatistics();
    }
    
    // Display raw QR data
    function displayRawData(qrData) {
        qrDataDisplay.innerHTML = `
            <div class="text-muted mb-2">Raw QR Data:</div>
            <pre style="margin: 0; white-space: pre-wrap;">${JSON.stringify(qrData, null, 2)}</pre>
        `;
    }
    
    // Extract and display fields
    function extractAndDisplayFields(qrData) {
        qrFields.innerHTML = '';
        
        const fields = [
            { label: 'QR Code ID', value: qrData.qrCodeId, icon: 'fa-qrcode' },
            { label: 'Unit Name', value: qrData.unitName, icon: 'fa-book' },
            { label: 'Unit Code', value: qrData.unitCode, icon: 'fa-hashtag' },
            { label: 'Class Type', value: qrData.classType, icon: 'fa-chalkboard-teacher' },
            { label: 'Lecturer', value: qrData.lecturerName || qrData.lecturer, icon: 'fa-user-tie' },
            { label: 'Topic', value: qrData.topic || 'Not specified', icon: 'fa-comment' },
            { label: 'Duration', value: qrData.duration ? qrData.duration + ' minutes' : 'N/A', icon: 'fa-clock' },
            { label: 'Created', value: formatDate(qrData.createdAt), icon: 'fa-calendar-plus' },
            { label: 'Expires', value: formatDate(qrData.expiresAt || qrData.expiryTime), icon: 'fa-calendar-times' },
            { label: 'Active', value: qrData.isActive ? 'Yes' : 'No', icon: 'fa-power-off' }
        ];
        
        fields.forEach(field => {
            const div = document.createElement('div');
            div.className = 'qr-field';
            div.innerHTML = `
                <span class="qr-label">
                    <i class="fas ${field.icon}"></i> ${field.label}:
                </span>
                <span class="qr-value">${field.value}</span>
            `;
            qrFields.appendChild(div);
        });
    }
    
    // Validate QR code
    function validateQRCode(qrData) {
        const now = new Date();
        const expiresAt = new Date(qrData.expiresAt || qrData.expiryTime);
        const isValidDate = now <= expiresAt;
        const isActive = qrData.isActive !== false;
        
        let isValid = true;
        let message = 'QR code is valid';
        
        if (!isValidDate) {
            isValid = false;
            message = 'QR code has expired';
        } else if (!isActive) {
            isValid = false;
            message = 'QR code is inactive';
        } else if (!qrData.qrCodeId || !qrData.unitName || !qrData.unitCode) {
            isValid = false;
            message = 'QR code is missing required information';
        }
        
        return { isValid, message, isValidDate, isActive };
    }
    
    // Update QR info panel
    function updateQRInfoPanel(qrData, validation) {
        // Hide "no scan" message
        noScanMessage.style.display = 'none';
        qrDetails.style.display = 'block';
        
        // Update all fields
        qrInfoElements.qrCodeId.textContent = qrData.qrCodeId || 'N/A';
        qrInfoElements.qrUnitName.textContent = qrData.unitName || 'N/A';
        qrInfoElements.qrUnitCode.textContent = qrData.unitCode || 'N/A';
        qrInfoElements.qrClassType.textContent = qrData.classType || 'Lecture';
        qrInfoElements.qrLecturer.textContent = qrData.lecturerName || qrData.lecturer || 'N/A';
        qrInfoElements.qrTopic.textContent = qrData.topic || 'Not specified';
        qrInfoElements.qrDuration.textContent = qrData.duration ? qrData.duration + ' minutes' : 'N/A';
        qrInfoElements.qrGenerated.textContent = formatDate(qrData.createdAt);
        qrInfoElements.qrExpires.textContent = formatDate(qrData.expiresAt || qrData.expiryTime);
        qrInfoElements.qrValidUntil.textContent = calculateTimeRemaining(qrData.expiresAt || qrData.expiryTime);
        
        // Update status with color
        let statusHtml = '';
        if (validation.isValid) {
            statusHtml = `<span class="valid-qr"><i class="fas fa-check-circle"></i> Valid</span>`;
        } else {
            statusHtml = `<span class="invalid-qr"><i class="fas fa-times-circle"></i> ${validation.message}</span>`;
        }
        qrInfoElements.qrStatus.innerHTML = statusHtml;
    }
    
    // Format date
    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleString();
    }
    
    // Calculate time remaining
    function calculateTimeRemaining(expiryDate) {
        if (!expiryDate) return 'N/A';
        
        const now = new Date();
        const expiry = new Date(expiryDate);
        const diffMs = expiry - now;
        
        if (diffMs <= 0) return 'Expired';
        
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMins / 60);
        const remainingMins = diffMins % 60;
        
        if (diffHours > 0) {
            return `${diffHours}h ${remainingMins}m remaining`;
        } else {
            return `${diffMins} minutes remaining`;
        }
    }
    
    // Save attendance
    async function saveAttendance() {
        if (!lastScannedData) {
            showNotification('No QR code data to save', 'error');
            return;
        }
        
        const user = JSON.parse(localStorage.getItem('studentUser'));
        
        const attendanceData = {
            studentId: user.studentId,
            studentName: user.name,
            qrCodeId: lastScannedData.qrCodeId,
            unitCode: lastScannedData.unitCode,
            unitName: lastScannedData.unitName,
            classType: lastScannedData.classType,
            lecturerName: lastScannedData.lecturerName || lastScannedData.lecturer,
            scanTime: new Date().toISOString(),
            status: 'present',
            validated: true
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
                
                // Show success
                showNotification('✅ Attendance recorded successfully!', 'success');
                
                // Update save button
                saveAttendanceBtn.innerHTML = '<i class="fas fa-check"></i> Attendance Saved';
                saveAttendanceBtn.className = 'btn btn-success';
                saveAttendanceBtn.disabled = true;
                
            } else {
                const errorText = await response.text();
                throw new Error(`Server error: ${errorText}`);
            }
            
        } catch (error) {
            console.error('Error saving attendance:', error);
            showNotification('❌ Failed to save attendance: ' + error.message, 'error');
        }
    }
    
    // Save to localStorage
    function saveToLocalStorage(attendance) {
        let attendanceRecords = JSON.parse(localStorage.getItem('attendanceRecords')) || [];
        attendanceRecords.push(attendance);
        localStorage.setItem('attendanceRecords', JSON.stringify(attendanceRecords));
        
        // Update today's scans in localStorage
        let todayScans = JSON.parse(localStorage.getItem('todayScans')) || [];
        todayScans.push(attendance);
        localStorage.setItem('todayScans', JSON.stringify(todayScans));
    }
    
    // Scan again
    function scanAgain() {
        // Reset UI
        scanResult.style.display = 'none';
        noScanMessage.style.display = 'block';
        qrDetails.style.display = 'none';
        saveAttendanceBtn.innerHTML = '<i class="fas fa-check-circle"></i> Mark Attendance';
        saveAttendanceBtn.className = 'btn btn-success';
        saveAttendanceBtn.disabled = false;
        saveAttendanceBtn.style.display = 'none';
        
        // Clear last scanned data
        lastScannedData = null;
        
        // Restart scanner
        if (!isScanning) {
            startScanner();
        }
    }
    
    // Switch camera
    function switchCamera() {
        currentCamera = currentCamera === 'environment' ? 'user' : 'environment';
        if (isScanning) {
            stopScanner();
            setTimeout(() => startScanner(), 500);
        }
    }
    
    // Toggle flash
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
    
    // Manual entry
    function openManualEntry() {
        document.getElementById('manualEntryModal').style.display = 'flex';
    }
    
    function closeManualEntry() {
        document.getElementById('manualEntryModal').style.display = 'none';
    }
    
    function submitManualEntry() {
        const manualQRCode = document.getElementById('manualQRCode');
        const data = manualQRCode.value.trim();
        
        if (!data) {
            showNotification('Please enter QR code data', 'error');
            return;
        }
        
        try {
            const qrData = JSON.parse(data);
            processQRCode(JSON.stringify(qrData));
            closeManualEntry();
        } catch (error) {
            showNotification('Invalid JSON format', 'error');
        }
    }
    
    // Test scan
    function performTestScan() {
        const testQRData = {
            qrCodeId: "QR_TEST_" + Date.now().toString().slice(-8),
            unitName: "Database Systems",
            unitCode: "CS301",
            classType: "lecture",
            topic: "Introduction to MongoDB",
            lecturerName: "Dr. Smith",
            lecturerId: "LEC001",
            duration: 60,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
            isActive: true
        };
        
        processQRCode(JSON.stringify(testQRData));
        showNotification('Test QR code scanned', 'info');
    }
    
    // Load recent scans
    async function loadRecentScans() {
        const user = JSON.parse(localStorage.getItem('studentUser'));
        
        try {
            // Try to get from backend
            const response = await fetch(`${API_BASE_URL}/api/attendance/student/${user.studentId}`);
            let scans = [];
            
            if (response.ok) {
                scans = await response.json();
            } else {
                // Fallback to localStorage
                scans = JSON.parse(localStorage.getItem('attendanceRecords')) || [];
            }
            
            // Display recent scans (last 10)
            displayRecentScans(scans.slice(-10).reverse());
            
        } catch (error) {
            console.error('Error loading recent scans:', error);
            const scans = JSON.parse(localStorage.getItem('attendanceRecords')) || [];
            displayRecentScans(scans.slice(-10).reverse());
        }
    }
    
    // Display recent scans
    function displayRecentScans(scans) {
        if (!scans.length) {
            recentScansBody.innerHTML = `
                <tr>
                    <td colspan="3" class="text-center text-muted">
                        No attendance records yet
                    </td>
                </tr>
            `;
            return;
        }
        
        let html = '';
        scans.forEach(scan => {
            const time = new Date(scan.scanTime).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
            html += `
                <tr>
                    <td>${time}</td>
                    <td>
                        <strong>${scan.unitCode}</strong><br>
                        <small class="text-muted">${scan.unitName}</small>
                    </td>
                    <td>
                        <span class="badge badge-success">Present</span>
                    </td>
                </tr>
            `;
        });
        
        recentScansBody.innerHTML = html;
    }
    
    // Load statistics
    function loadStatistics() {
        const todayScans = JSON.parse(localStorage.getItem('todayScans')) || [];
        totalScansToday.textContent = todayScans.length;
        successfulScansEl.textContent = todayScans.filter(s => s.validated).length;
        failedScansEl.textContent = todayScans.filter(s => !s.validated).length;
    }
    
    // Update statistics
    function updateStatistics() {
        totalScansToday.textContent = scanAttempts;
        successfulScansEl.textContent = successfulScans;
        failedScansEl.textContent = failedScans;
    }
    
    // Update scanner status
    function updateScannerStatus(status, message) {
        let statusClass = '';
        let icon = '';
        
        switch(status) {
            case 'ready':
                statusClass = 'status-idle';
                icon = 'fa-circle';
                break;
            case 'scanning':
                statusClass = 'status-scanning';
                icon = 'fa-sync fa-spin';
                break;
            case 'success':
                statusClass = 'status-success';
                icon = 'fa-check-circle';
                break;
            case 'error':
                statusClass = 'status-error';
                icon = 'fa-exclamation-circle';
                break;
            case 'stopped':
                statusClass = 'status-idle';
                icon = 'fa-stop-circle';
                break;
        }
        
        scannerStatus.innerHTML = `
            <span class="status-indicator ${statusClass}">
                <i class="fas ${icon}"></i> ${message}
            </span>
        `;
    }
    
    // Handle scanner errors
    function handleScannerError(error) {
        console.error('Scanner error:', error);
        
        let message = 'Scanner error: ';
        if (error.name === 'NotAllowedError') {
            message = 'Camera access denied. Please allow camera access in browser settings.';
        } else if (error.name === 'NotFoundError') {
            message = 'No camera found on this device.';
        } else if (error.name === 'NotSupportedError') {
            message = 'Camera not supported in this browser.';
        } else if (error.name === 'NotReadableError') {
            message = 'Camera is already in use by another application.';
        } else {
            message = error.message;
        }
        
        updateScannerStatus('error', 'Camera Error');
        showNotification(message, 'error');
    }
    
    // Test backend connection
    async function testBackendConnection() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/qrcodes`);
            if (response.ok) {
                console.log('Backend connection successful');
                showNotification('Connected to attendance system', 'success');
            } else {
                console.warn('Backend responded with status:', response.status);
                showNotification('Backend connection issue', 'warning');
            }
        } catch (error) {
            console.error('Backend connection failed:', error);
            showNotification('Cannot connect to server', 'error');
        }
    }
    
    // Show notification
    function showNotification(message, type) {
        // Remove existing notifications
        const existing = document.querySelector('.global-notification');
        if (existing) existing.remove();
        
        // Create notification
        const notification = document.createElement('div');
        notification.className = 'global-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#28a745' : 
                         type === 'error' ? '#dc3545' : 
                         type === 'warning' ? '#ffc107' : '#17a2b8'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 9999;
            animation: slideIn 0.3s ease;
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 
                           type === 'error' ? 'fa-exclamation-circle' : 
                           type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
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
        .stat-box {
            padding: 15px;
            border-radius: 8px;
            background: #f8f9fa;
        }
        .stat-box h3 {
            margin: 0;
            font-size: 24px;
            font-weight: 700;
        }
        .stat-box small {
            color: #6c757d;
            font-size: 12px;
        }
    `;
    document.head.appendChild(style);
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('manualEntryModal');
        if (event.target === modal) {
            closeManualEntry();
        }
    });
    
    // Clean up on page unload
    window.addEventListener('beforeunload', function() {
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
        }
        if (scanInterval) {
            clearInterval(scanInterval);
        }
    });
});
