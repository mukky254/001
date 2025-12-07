// QR Scanner JavaScript
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

    // Test scan button (for development)
    const testScanBtn = document.getElementById('testScanBtn');
    if (testScanBtn) {
        testScanBtn.addEventListener('click', simulateScan);
    }
}

let scanner = null;
let videoStream = null;

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
        scannerView.appendChild(frame);

        // Play video
        video.play();

        // Update buttons
        startBtn.style.display = 'none';
        stopBtn.style.display = 'block';

        // Initialize QR scanner
        scanner = new QRScanner(video, frame, scanResult);
        scanner.start();

        showAlert('Scanner started successfully!', 'success');

    } catch (error) {
        console.error('Error starting scanner:', error);
        showAlert(`Camera error: ${error.message}. Please ensure camera access is granted.`, 'error');
        
        // For testing without camera
        scannerView.innerHTML = `
            <div class="scanner-placeholder">
                <i class="fas fa-camera-slash"></i>
                <p>Camera not available</p>
                <button onclick="simulateScan()" class="btn btn-primary">
                    <i class="fas fa-qrcode"></i> Simulate Scan
                </button>
            </div>
        `;
    }
}

function stopScanner() {
    if (scanner) {
        scanner.stop();
        scanner = null;
    }

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

    startBtn.style.display = 'block';
    stopBtn.style.display = 'none';
}

class QRScanner {
    constructor(video, frame, resultElement) {
        this.video = video;
        this.frame = frame;
        this.resultElement = resultElement;
        this.canvas = document.createElement('canvas');
        this.context = this.canvas.getContext('2d');
        this.scanning = false;
        this.session = JSON.parse(localStorage.getItem('attendance_session'));
    }

    start() {
        this.scanning = true;
        this.scan();
    }

    stop() {
        this.scanning = false;
    }

    async scan() {
        if (!this.scanning || this.video.readyState !== this.video.HAVE_ENOUGH_DATA) {
            if (this.scanning) {
                requestAnimationFrame(() => this.scan());
            }
            return;
        }

        // Set canvas dimensions
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;

        // Draw video frame to canvas
        this.context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

        try {
            // Use jsQR to detect QR code
            const imageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);

            if (code) {
                // QR code found
                this.handleQRCode(code.data);
                return; // Stop scanning after successful scan
            }
        } catch (error) {
            console.error('Scan error:', error);
        }

        // Continue scanning
        if (this.scanning) {
            requestAnimationFrame(() => this.scan());
        }
    }

    async handleQRCode(qrData) {
        try {
            // Parse QR data
            const qrObject = JSON.parse(qrData);
            
            // Validate QR code
            if (!qrObject.qrCodeId || !qrObject.unitCode) {
                throw new Error('Invalid QR code format');
            }

            // Show scanning status
            this.resultElement.innerHTML = `
                <div class="scan-status scanning">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>Processing QR code...</span>
                </div>
            `;

            // Send scan to server
            const response = await fetch(`${API_BASE_URL}/api/attendance/scan`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.session.token}`
                },
                body: JSON.stringify({
                    qrCode: qrData,
                    scanTime: new Date().toISOString()
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Success
                this.resultElement.innerHTML = `
                    <div class="scan-status success">
                        <i class="fas fa-check-circle"></i>
                        <div>
                            <h4>Attendance Recorded!</h4>
                            <p>Unit: ${qrObject.unitName} (${qrObject.unitCode})</p>
                            <p>Time: ${new Date().toLocaleTimeString()}</p>
                            <p>Date: ${new Date().toLocaleDateString()}</p>
                        </div>
                    </div>
                `;

                // Play success sound
                this.playSuccessSound();

                // Vibrate (if supported)
                if (navigator.vibrate) {
                    navigator.vibrate([100, 50, 100]);
                }

                // Reload recent scans
                await this.reloadRecentScans();

                // Auto stop scanner after 3 seconds
                setTimeout(() => {
                    this.stop();
                    stopScanner();
                }, 3000);

            } else {
                throw new Error(data.message || 'Failed to record attendance');
            }

        } catch (error) {
            console.error('QR scan error:', error);
            
            this.resultElement.innerHTML = `
                <div class="scan-status error">
                    <i class="fas fa-exclamation-circle"></i>
                    <div>
                        <h4>Scan Failed</h4>
                        <p>${error.message}</p>
                    </div>
                </div>
            `;

            // Auto clear error after 5 seconds
            setTimeout(() => {
                this.resultElement.innerHTML = '';
                // Continue scanning
                if (this.scanning) {
                    requestAnimationFrame(() => this.scan());
                }
            }, 5000);
        }
    }

    playSuccessSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (error) {
            // Audio not supported, ignore
        }
    }

    async reloadRecentScans() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/students/${this.session.user.id}/attendance`, {
                headers: {
                    'Authorization': `Bearer ${this.session.token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                updateRecentScansTable(data.attendance || []);
            }
        } catch (error) {
            console.error('Error reloading scans:', error);
        }
    }
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
            showAlert('Attendance recorded manually!', 'success');
            qrCodeInput.value = '';
            closeManualEntry();
            
            // Reload recent scans
            await loadRecentScans(session.user.id, session.token);
        } else {
            throw new Error(data.message || 'Failed to record attendance');
        }
    } catch (error) {
        showAlert(error.message, 'error');
    }
}

async function simulateScan() {
    // Create a sample QR code for testing
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
                <div class="scan-status success">
                    <i class="fas fa-check-circle"></i>
                    <div>
                        <h4>Test Scan Successful!</h4>
                        <p>Unit: ${sampleQRCode.unitName} (${sampleQRCode.unitCode})</p>
                        <p>Time: ${new Date().toLocaleTimeString()}</p>
                        <p>This was a test scan</p>
                    </div>
                </div>
            `;

            // Reload recent scans
            await loadRecentScans(session.user.id, session.token);
        } else {
            throw new Error(data.message || 'Test scan failed');
        }
    } catch (error) {
        scanResult.innerHTML = `
            <div class="scan-status error">
                <i class="fas fa-exclamation-circle"></i>
                <div>
                    <h4>Test Scan Failed</h4>
                    <p>${error.message}</p>
                </div>
            </div>
        `;
    }
}

function showAlert(message, type = 'info') {
    // Create alert element
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;

    // Add to body
    document.body.appendChild(alert);

    // Position it
    alert.style.position = 'fixed';
    alert.style.top = '20px';
    alert.style.right = '20px';
    alert.style.zIndex = '9999';
    alert.style.maxWidth = '300px';

    // Remove after 5 seconds
    setTimeout(() => {
        alert.style.opacity = '0';
        alert.style.transform = 'translateX(100%)';
        setTimeout(() => {
            alert.remove();
        }, 300);
    }, 5000);

    // Click to dismiss
    alert.addEventListener('click', () => {
        alert.style.opacity = '0';
        alert.style.transform = 'translateX(100%)';
        setTimeout(() => {
            alert.remove();
        }, 300);
    });
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
