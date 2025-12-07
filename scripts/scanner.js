// scripts/scanner.js - QR SCANNER
const API_BASE_URL = 'https://zero0-1-r0xs.onrender.com';

document.addEventListener('DOMContentLoaded', async function() {
    await initializeScanner();
    setupScannerEvents();
});

async function initializeScanner() {
    // Check authentication
    const sessionData = localStorage.getItem('attendance_session');
    if (!sessionData) {
        window.location.href = 'login.html';
        return;
    }

    const session = JSON.parse(sessionData);
    const { user, token } = session;
    
    if (!user || user.role !== 'student') {
        window.location.href = 'dashboard.html';
        return;
    }

    // Set user info
    document.getElementById('userName').textContent = user.name;
    document.getElementById('userRole').textContent = 'Student';
    
    // Set avatar
    const avatarText = getInitials(user.name);
    document.getElementById('userAvatar').textContent = avatarText;
    document.getElementById('miniAvatar').textContent = avatarText;

    // Load recent scans
    await loadRecentScans(user.id, token);
}

function getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

async function loadRecentScans(studentId, token) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/students/${studentId}/attendance`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load recent scans');
        }

        const data = await response.json();
        updateRecentScansTable(data.attendance || []);
        
    } catch (error) {
        console.error('Error loading recent scans:', error);
        showAlert('Failed to load recent scans', 'error');
    }
}

function updateRecentScansTable(scans) {
    const tableBody = document.getElementById('recentScansBody');
    if (!tableBody) return;

    if (!scans.length) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">No scans recorded yet</td>
            </tr>
        `;
        return;
    }

    const tableHTML = scans.map(scan => `
        <tr>
            <td>${scan.date || '-'}</td>
            <td>${scan.time || '-'}</td>
            <td>${scan.unitName || '-'}</td>
            <td>${scan.lecturerName || '-'}</td>
            <td>
                <span class="badge ${scan.status === 'present' ? 'bg-success' : scan.status === 'late' ? 'bg-warning' : 'bg-danger'}">
                    ${scan.status || 'absent'}
                </span>
            </td>
        </tr>
    `).join('');

    tableBody.innerHTML = tableHTML;
}

function setupScannerEvents() {
    // Start scanner button
    const startScannerBtn = document.getElementById('startScannerBtn');
    if (startScannerBtn) {
        startScannerBtn.addEventListener('click', startScanner);
    }

    // Stop scanner button
    const stopScannerBtn = document.getElementById('stopScannerBtn');
    if (stopScannerBtn) {
        stopScannerBtn.addEventListener('click', stopScanner);
    }

    // Manual entry button
    const manualEntryBtn = document.getElementById('manualEntryBtn');
    if (manualEntryBtn) {
        manualEntryBtn.addEventListener('click', openManualEntry);
    }

    // Test scan button
    const testScanBtn = document.getElementById('testScanBtn');
    if (testScanBtn) {
        testScanBtn.addEventListener('click', simulateScan);
    }

    // Refresh scans button
    const refreshScansBtn = document.getElementById('refreshScansBtn');
    if (refreshScansBtn) {
        refreshScansBtn.addEventListener('click', refreshScans);
    }
}

let videoStream = null;
let scannerActive = false;

async function startScanner() {
    const scannerView = document.getElementById('scannerView');
    const startBtn = document.getElementById('startScannerBtn');
    const stopBtn = document.getElementById('stopScannerBtn');

    try {
        // Get camera access
        videoStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment',
                width: { ideal: 640 },
                height: { ideal: 480 }
            }
        });

        // Set up video element
        const video = document.createElement('video');
        video.id = 'scannerVideo';
        video.srcObject = videoStream;
        video.setAttribute('playsinline', 'true');
        video.style.width = '100%';
        video.style.height = '100%';
        video.style.objectFit = 'cover';

        // Clear scanner view and add video
        scannerView.innerHTML = '';
        scannerView.appendChild(video);
        
        // Add scanner frame
        const frame = document.createElement('div');
        frame.className = 'scanner-frame';
        scannerView.appendChild(frame);

        // Play video
        video.play();

        // Update buttons
        startBtn.style.display = 'none';
        stopBtn.style.display = 'inline-block';

        // Start scanning
        scannerActive = true;
        scanQRCode(video, frame);

        showAlert('✅ Scanner started successfully!', 'success');

    } catch (error) {
        console.error('Error starting scanner:', error);
        showAlert('⚠️ Camera access denied. Please allow camera access.', 'error');
        
        // For testing without camera
        scannerView.innerHTML = `
            <div class="scanner-placeholder">
                <i class="fas fa-camera-slash"></i>
                <p>Camera not available</p>
                <button onclick="simulateScan()" class="btn btn-primary mt-2">
                    <i class="fas fa-bolt"></i> Simulate Scan
                </button>
            </div>
        `;
    }
}

function stopScanner() {
    scannerActive = false;

    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }

    const scannerView = document.getElementById('scannerView');
    const startBtn = document.getElementById('startScannerBtn');
    const stopBtn = document.getElementById('stopScannerBtn');

    scannerView.innerHTML = `
        <div class="scanner-placeholder">
            <i class="fas fa-qrcode"></i>
            <p>Ready to scan</p>
            <p class="small">Press "Start Scanner" to begin</p>
        </div>
    `;

    startBtn.style.display = 'inline-block';
    stopBtn.style.display = 'none';
}

async function scanQRCode(video, frame) {
    if (!scannerActive || video.readyState !== video.HAVE_ENOUGH_DATA) {
        if (scannerActive) {
            requestAnimationFrame(() => scanQRCode(video, frame));
        }
        return;
    }

    // Create canvas for scanning
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
        // Use jsQR to detect QR code
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
            // QR code found
            handleQRCode(code.data);
            return; // Stop scanning after successful scan
        }
    } catch (error) {
        console.error('Scan error:', error);
    }

    // Continue scanning
    if (scannerActive) {
        requestAnimationFrame(() => scanQRCode(video, frame));
    }
}

async function handleQRCode(qrData) {
    try {
        // Parse QR data
        let qrObject;
        try {
            qrObject = JSON.parse(qrData);
        } catch (error) {
            qrObject = {
                qrCodeId: 'QR_TEST_' + Date.now(),
                unitName: 'Test Class',
                unitCode: 'TEST101',
                lecturerName: 'Test Lecturer'
            };
        }

        // Show scanning status
        const scanResult = document.getElementById('scanResult');
        scanResult.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Processing QR code...</span>
            </div>
        `;

        // Get session
        const session = JSON.parse(localStorage.getItem('attendance_session'));
        if (!session) {
            window.location.href = 'login.html';
            return;
        }

        // Send scan to server
        const response = await fetch(`${API_BASE_URL}/api/attendance/scan`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.token}`
            },
            body: JSON.stringify({
                qrCode: qrData,
                scanTime: new Date().toISOString()
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Success
            scanResult.innerHTML = `
                <div class="alert alert-success">
                    <i class="fas fa-check-circle"></i>
                    <div>
                        <h4>✅ Attendance Recorded!</h4>
                        <p><strong>Unit:</strong> ${data.attendance.unitName} (${data.attendance.unitCode})</p>
                        <p><strong>Time:</strong> ${data.attendance.time}</p>
                        <p><strong>Date:</strong> ${data.attendance.date}</p>
                    </div>
                </div>
            `;

            // Vibrate (if supported)
            if (navigator.vibrate) {
                navigator.vibrate(100);
            }

            // Stop scanner
            stopScanner();

            // Refresh recent scans
            await refreshScans();

        } else {
            throw new Error(data.message || 'Failed to record attendance');
        }

    } catch (error) {
        console.error('QR scan error:', error);
        
        const scanResult = document.getElementById('scanResult');
        scanResult.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle"></i>
                <div>
                    <h4>❌ Scan Failed</h4>
                    <p>${error.message}</p>
                </div>
            </div>
        `;
    }
}

function openManualEntry() {
    const modal = document.getElementById('manualEntryModal');
    modal.style.display = 'block';
    modal.classList.add('active');
}

function closeManualEntry() {
    const modal = document.getElementById('manualEntryModal');
    modal.style.display = 'none';
    modal.classList.remove('active');
}

async function submitManualEntry() {
    const qrCodeInput = document.getElementById('manualQRCode');
    const qrCode = qrCodeInput.value.trim();

    if (!qrCode) {
        showAlert('Please enter QR code data', 'error');
        return;
    }

    const session = JSON.parse(localStorage.getItem('attendance_session'));
    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/attendance/scan`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.token}`
            },
            body: JSON.stringify({
                qrCode: qrCode,
                scanTime: new Date().toISOString()
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showAlert('✅ Attendance recorded manually!', 'success');
            qrCodeInput.value = '';
            closeManualEntry();
            
            // Refresh recent scans
            await refreshScans();
        } else {
            throw new Error(data.message || 'Failed to record attendance');
        }
    } catch (error) {
        showAlert('❌ ' + error.message, 'error');
    }
}

async function simulateScan() {
    const session = JSON.parse(localStorage.getItem('attendance_session'));
    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    // Create a sample QR code
    const sampleQRCode = {
        qrCodeId: 'QR_TEST_' + Date.now(),
        unitName: 'Database Systems',
        unitCode: 'CS301',
        lecturerId: 'LT001',
        lecturerName: 'Dr. John Smith',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 15 * 60000).toISOString(),
        duration: 15,
        classType: 'lecture'
    };

    const scanResult = document.getElementById('scanResult');
    scanResult.innerHTML = `
        <div class="alert alert-info">
            <i class="fas fa-spinner fa-spin"></i>
            <span>Simulating scan...</span>
        </div>
    `;

    try {
        const response = await fetch(`${API_BASE_URL}/api/attendance/scan`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.token}`
            },
            body: JSON.stringify({
                qrCode: JSON.stringify(sampleQRCode),
                scanTime: new Date().toISOString()
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            scanResult.innerHTML = `
                <div class="alert alert-success">
                    <i class="fas fa-check-circle"></i>
                    <div>
                        <h4>✅ Test Scan Successful!</h4>
                        <p><strong>Unit:</strong> ${sampleQRCode.unitName} (${sampleQRCode.unitCode})</p>
                        <p><strong>Time:</strong> ${new Date().toLocaleTimeString()}</p>
                        <p><em>This was a test scan</em></p>
                    </div>
                </div>
            `;

            // Refresh recent scans
            await refreshScans();
        } else {
            throw new Error(data.message || 'Test scan failed');
        }
    } catch (error) {
        scanResult.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle"></i>
                <div>
                    <h4>❌ Test Scan Failed</h4>
                    <p>${error.message}</p>
                </div>
            </div>
        `;
    }
}

async function refreshScans() {
    const session = JSON.parse(localStorage.getItem('attendance_session'));
    if (!session) return;

    const refreshBtn = document.getElementById('refreshScansBtn');
    const originalText = refreshBtn.innerHTML;
    
    refreshBtn.disabled = true;
    refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';

    await loadRecentScans(session.user.id, session.token);
    
    refreshBtn.disabled = false;
    refreshBtn.innerHTML = originalText;
}

// Make functions available globally
window.openManualEntry = openManualEntry;
window.closeManualEntry = closeManualEntry;
window.submitManualEntry = submitManualEntry;
window.simulateScan = simulateScan;
window.logout = function() {
    localStorage.removeItem('attendance_session');
    window.location.href = 'index.html';
};
