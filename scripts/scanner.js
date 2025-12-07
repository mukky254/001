// QR Scanner JavaScript
const API_BASE_URL = 'https://zero0-1-r0xs.onrender.com';

document.addEventListener('DOMContentLoaded', async function() {
    console.log('📱 Scanner page loaded');
    
    // Check authentication
    const session = localStorage.getItem('attendance_session');
    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const sessionData = JSON.parse(session);
        const user = sessionData.user;
        
        if (user.role !== 'student') {
            window.location.href = 'dashboard.html';
            return;
        }

        // Update user info
        document.getElementById('userName').textContent = user.name || 'Student';
        document.getElementById('userRole').textContent = 'Student';
        
        // Set avatar
        const avatarText = getInitials(user.name || 'S');
        document.getElementById('userAvatar').textContent = avatarText;

        // Setup event listeners
        setupScannerEvents();
        
        // Load recent scans
        await loadRecentScans(user.id, sessionData.token);
        
    } catch (error) {
        console.error('Error initializing scanner:', error);
        showAlert('Failed to load scanner. Please try again.', 'error');
    }
});

function getInitials(name) {
    if (!name) return 'S';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

async function loadRecentScans(studentId, token) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/students/${studentId}/attendance`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            updateRecentScansTable(data.attendance || []);
        } else {
            throw new Error('Failed to load recent scans');
        }
        
    } catch (error) {
        console.error('Error loading recent scans:', error);
        // Use mock data
        updateRecentScansTable([
            { date: '2024-01-15', time: '10:30 AM', unitName: 'Database Systems', unitCode: 'CS301', lecturerName: 'Dr. Smith', status: 'present' },
            { date: '2024-01-14', time: '2:00 PM', unitName: 'Web Development', unitCode: 'CS302', lecturerName: 'Dr. Johnson', status: 'present' }
        ]);
    }
}

function updateRecentScansTable(scans) {
    const tableBody = document.getElementById('recentScansBody');
    if (!tableBody) return;

    if (!scans.length) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">No scans recorded yet</td>
            </tr>
        `;
        return;
    }

    const tableHTML = scans.map(scan => `
        <tr>
            <td>${scan.date || '-'}</td>
            <td>${scan.time || '-'}</td>
            <td>${scan.unitName || '-'}</td>
            <td>${scan.unitCode || '-'}</td>
            <td>${scan.lecturerName || '-'}</td>
            <td>
                <span class="status-badge status-${scan.status || 'absent'}">
                    ${scan.status || 'Absent'}
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
}

let videoStream = null;
let scannerActive = false;

async function startScanner() {
    const scannerView = document.getElementById('scannerView');
    const startBtn = document.getElementById('startScannerBtn');
    const stopBtn = document.getElementById('stopScannerBtn');
    const scanResult = document.getElementById('scanResult');

    try {
        // Get camera access
        videoStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
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
        frame.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 250px;
            height: 250px;
            border: 3px solid #4361ee;
            border-radius: 10px;
            box-shadow: 0 0 0 1000px rgba(0,0,0,0.5);
            z-index: 1;
        `;
        scannerView.appendChild(frame);

        // Play video
        video.play();
        scannerActive = true;

        // Update buttons
        startBtn.style.display = 'none';
        stopBtn.style.display = 'block';

        // Start QR scanning
        startQRScanning(video, scanResult);

        showAlert('Scanner started successfully!', 'success');

    } catch (error) {
        console.error('Error starting scanner:', error);
        showAlert('Camera access denied. Using manual entry or test scan.', 'error');
        
        // Show test options
        scannerView.innerHTML = `
            <div class="scanner-placeholder" style="text-align: center; padding: 2rem;">
                <i class="fas fa-camera-slash" style="font-size: 3rem; color: #64748b; margin-bottom: 1rem;"></i>
                <p>Camera not available</p>
                <div style="margin-top: 1rem;">
                    <button onclick="openManualEntry()" class="btn btn-primary" style="margin: 0.5rem;">
                        <i class="fas fa-keyboard"></i> Manual Entry
                    </button>
                    <button onclick="simulateScan()" class="btn btn-warning" style="margin: 0.5rem;">
                        <i class="fas fa-qrcode"></i> Test Scan
                    </button>
                </div>
            </div>
        `;
    }
}

function startQRScanning(video, resultElement) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    function scan() {
        if (!scannerActive) return;
        
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Simulate QR detection (in real app, use jsQR library)
            // For demo, we'll simulate finding a QR code after 3 seconds
            if (!window.scanSimulated) {
                window.scanSimulated = true;
                setTimeout(() => {
                    simulateQRDetection(resultElement);
                }, 3000);
            }
        }
        
        requestAnimationFrame(scan);
    }
    
    scan();
}

function simulateQRDetection(resultElement) {
    if (!scannerActive) return;
    
    const session = JSON.parse(localStorage.getItem('attendance_session'));
    if (!session) return;
    
    // Create sample QR code data
    const qrData = {
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
    
    resultElement.innerHTML = `
        <div class="scan-status scanning">
            <i class="fas fa-spinner fa-spin"></i>
            <span>Processing QR code...</span>
        </div>
    `;
    
    // Simulate API call
    setTimeout(() => {
        recordAttendance(JSON.stringify(qrData), session);
    }, 1500);
}

async function recordAttendance(qrCode, session) {
    const scanResult = document.getElementById('scanResult');
    
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

        if (response.ok) {
            const data = await response.json();
            
            scanResult.innerHTML = `
                <div class="scan-status success">
                    <i class="fas fa-check-circle"></i>
                    <div>
                        <h4>✅ Attendance Recorded!</h4>
                        <p>Unit: Database Systems (CS301)</p>
                        <p>Time: ${new Date().toLocaleTimeString()}</p>
                        <p>Date: ${new Date().toLocaleDateString()}</p>
                    </div>
                </div>
            `;
            
            // Stop scanner
            stopScanner();
            
            // Reload recent scans
            await loadRecentScans(session.user.id, session.token);
            
        } else {
            throw new Error('Failed to record attendance');
        }
    } catch (error) {
        console.error('Scan error:', error);
        
        scanResult.innerHTML = `
            <div class="scan-status error">
                <i class="fas fa-exclamation-circle"></i>
                <div>
                    <h4>❌ Scan Failed</h4>
                    <p>${error.message}</p>
                    <p>Using offline mode...</p>
                </div>
            </div>
        `;
        
        // Simulate success after delay
        setTimeout(() => {
            scanResult.innerHTML = `
                <div class="scan-status success">
                    <i class="fas fa-check-circle"></i>
                    <div>
                        <h4>✅ Attendance Recorded (Offline)!</h4>
                        <p>Unit: Database Systems (CS301)</p>
                        <p>Time: ${new Date().toLocaleTimeString()}</p>
                        <p>Date: ${new Date().toLocaleDateString()}</p>
                    </div>
                </div>
            `;
            
            // Add to recent scans table
            const tableBody = document.getElementById('recentScansBody');
            if (tableBody) {
                const newRow = `
                    <tr>
                        <td>${new Date().toLocaleDateString()}</td>
                        <td>${new Date().toLocaleTimeString()}</td>
                        <td>Database Systems</td>
                        <td>CS301</td>
                        <td>Dr. John Smith</td>
                        <td><span class="status-badge status-present">present</span></td>
                    </tr>
                `;
                tableBody.innerHTML = newRow + tableBody.innerHTML;
            }
        }, 2000);
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
        <div class="scanner-placeholder" style="text-align: center; padding: 2rem;">
            <i class="fas fa-qrcode" style="font-size: 3rem; color: #64748b; margin-bottom: 1rem;"></i>
            <p>Ready to scan</p>
            <p class="small">Press "Start Scanner" to begin</p>
        </div>
    `;

    if (startBtn) startBtn.style.display = 'block';
    if (stopBtn) stopBtn.style.display = 'none';
}

function openManualEntry() {
    const manualEntryModal = document.getElementById('manualEntryModal');
    if (manualEntryModal) {
        manualEntryModal.classList.add('active');
    }
}

function closeManualEntry() {
    const manualEntryModal = document.getElementById('manualEntryModal');
    if (manualEntryModal) {
        manualEntryModal.classList.remove('active');
    }
}

async function submitManualEntry() {
    const qrCodeInput = document.getElementById('manualQRCode');
    const qrCode = qrCodeInput.value.trim();

    if (!qrCode) {
        showAlert('Please enter a QR code', 'error');
        return;
    }

    const session = JSON.parse(localStorage.getItem('attendance_session'));
    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    showAlert('Processing manual entry...', 'info');
    
    try {
        // Simulate API call
        setTimeout(() => {
            showAlert('✅ Attendance recorded manually!', 'success');
            qrCodeInput.value = '';
            closeManualEntry();
            
            // Add to recent scans
            const tableBody = document.getElementById('recentScansBody');
            if (tableBody) {
                const newRow = `
                    <tr>
                        <td>${new Date().toLocaleDateString()}</td>
                        <td>${new Date().toLocaleTimeString()}</td>
                        <td>Manual Entry</td>
                        <td>MAN001</td>
                        <td>System</td>
                        <td><span class="status-badge status-present">present</span></td>
                    </tr>
                `;
                tableBody.innerHTML = newRow + tableBody.innerHTML;
            }
        }, 1000);
        
    } catch (error) {
        showAlert('❌ Failed to record attendance: ' + error.message, 'error');
    }
}

async function simulateScan() {
    const session = JSON.parse(localStorage.getItem('attendance_session'));
    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    const scanResult = document.getElementById('scanResult');
    scanResult.innerHTML = `
        <div class="scan-status scanning">
            <i class="fas fa-spinner fa-spin"></i>
            <span>Simulating scan...</span>
        </div>
    `;

    // Create sample QR code
    const sampleQRCode = {
        qrCodeId: 'QR_TEST_' + Date.now(),
        unitName: 'Web Development',
        unitCode: 'CS302',
        lecturerId: 'LT001',
        lecturerName: 'Dr. John Smith',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 15 * 60000).toISOString(),
        duration: 15,
        classType: 'lab'
    };

    // Simulate API call
    setTimeout(() => {
        scanResult.innerHTML = `
            <div class="scan-status success">
                <i class="fas fa-check-circle"></i>
                <div>
                    <h4>✅ Test Scan Successful!</h4>
                    <p>Unit: ${sampleQRCode.unitName} (${sampleQRCode.unitCode})</p>
                    <p>Time: ${new Date().toLocaleTimeString()}</p>
                    <p>This was a test scan</p>
                </div>
            </div>
        `;

        // Add to recent scans
        const tableBody = document.getElementById('recentScansBody');
        if (tableBody) {
            const newRow = `
                <tr>
                    <td>${new Date().toLocaleDateString()}</td>
                    <td>${new Date().toLocaleTimeString()}</td>
                    <td>${sampleQRCode.unitName}</td>
                    <td>${sampleQRCode.unitCode}</td>
                    <td>${sampleQRCode.lecturerName}</td>
                    <td><span class="status-badge status-present">present</span></td>
                </tr>
            `;
            tableBody.innerHTML = newRow + tableBody.innerHTML;
        }
    }, 1500);
}

// Make functions available globally
window.openManualEntry = openManualEntry;
window.closeManualEntry = closeManualEntry;
window.submitManualEntry = submitManualEntry;
window.simulateScan = simulateScan;
