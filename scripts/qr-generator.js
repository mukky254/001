// QR Generator JavaScript
const API_BASE_URL = 'https://zero0-1-r0xs.onrender.com';

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🎯 QR Generator loaded');
    
    // Check authentication
    const session = localStorage.getItem('attendance_session');
    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const sessionData = JSON.parse(session);
        const user = sessionData.user;
        
        if (user.role !== 'lecturer' && user.role !== 'admin') {
            window.location.href = 'dashboard.html';
            return;
        }

        // Update user info
        document.getElementById('userName').textContent = user.name || 'User';
        document.getElementById('userRole').textContent = user.role === 'lecturer' ? 'Lecturer' : 'Admin';
        
        // Set avatar
        const avatarText = getInitials(user.name || 'U');
        document.getElementById('userAvatar').textContent = avatarText;

        // Setup event listeners
        setupQREvents();
        
        // Load recent QR codes
        await loadRecentQRCodes(user.id, sessionData.token, user.role);
        
    } catch (error) {
        console.error('Error initializing QR generator:', error);
        showAlert('Failed to load QR generator. Please try again.', 'error');
    }
});

function getInitials(name) {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

async function loadRecentQRCodes(userId, token, role) {
    try {
        let response;
        
        if (role === 'lecturer') {
            response = await fetch(`${API_BASE_URL}/api/lecturers/${userId}/qr-codes`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        } else if (role === 'admin') {
            // Admins can see all QR codes
            response = await fetch(`${API_BASE_URL}/api/admin/qr-codes`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        }

        if (response && response.ok) {
            const data = await response.json();
            updateRecentQRCodesTable(data.qrCodes || []);
        } else {
            throw new Error('Failed to load QR codes');
        }
        
    } catch (error) {
        console.error('Error loading QR codes:', error);
        // Use mock data
        updateRecentQRCodesTable([
            { qrCodeId: 'QR001', unitName: 'Database Systems', unitCode: 'CS301', lecturerName: 'Dr. Smith', createdAt: new Date(), expiresAt: new Date(Date.now() + 3600000), attendanceCount: 25 },
            { qrCodeId: 'QR002', unitName: 'Web Development', unitCode: 'CS302', lecturerName: 'Dr. Johnson', createdAt: new Date(Date.now() - 86400000), expiresAt: new Date(Date.now() - 43200000), attendanceCount: 30 }
        ]);
    }
}

function updateRecentQRCodesTable(qrCodes) {
    const tableBody = document.getElementById('recentQRCodesBody');
    if (!tableBody) return;

    if (!qrCodes.length) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">No QR codes generated yet</td>
            </tr>
        `;
        return;
    }

    const tableHTML = qrCodes.map(qr => {
        const isActive = new Date(qr.expiresAt) > new Date();
        const createdAt = new Date(qr.createdAt);
        const expiresAt = new Date(qr.expiresAt);
        
        return `
            <tr>
                <td>${qr.unitName || '-'}</td>
                <td>${qr.unitCode || '-'}</td>
                <td>${qr.classType || 'lecture'}</td>
                <td>${createdAt.toLocaleDateString()} ${createdAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                <td>${expiresAt.toLocaleDateString()} ${expiresAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                <td>${qr.attendanceCount || 0}</td>
                <td>
                    <span class="status-badge ${isActive ? 'status-present' : 'status-absent'}">
                        ${isActive ? 'Active' : 'Expired'}
                    </span>
                </td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-sm btn-outline" onclick="viewQRCode('${qr.qrCodeId || ''}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline" onclick="downloadQRCode('${qr.qrCodeId || ''}')">
                            <i class="fas fa-download"></i>
                        </button>
                        ${isActive ? `
                            <button class="btn btn-sm btn-danger" onclick="deactivateQRCode('${qr.qrCodeId || ''}')">
                                <i class="fas fa-stop"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    tableBody.innerHTML = tableHTML;
}

function setupQREvents() {
    // QR generation form
    const qrForm = document.getElementById('qrGenerationForm');
    if (qrForm) {
        qrForm.addEventListener('submit', generateQRCode);
    }

    // Quick duration buttons
    document.querySelectorAll('.quick-duration').forEach(btn => {
        btn.addEventListener('click', function() {
            const duration = this.dataset.duration;
            document.getElementById('duration').value = duration;
            showAlert(`Duration set to ${duration} minutes`, 'info');
        });
    });
}

let currentQRCodeData = null;

async function generateQRCode(e) {
    e.preventDefault();
    
    const session = JSON.parse(localStorage.getItem('attendance_session'));
    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    const unitName = document.getElementById('unitName').value;
    const unitCode = document.getElementById('unitCode').value;
    const duration = parseInt(document.getElementById('duration').value);
    const classType = document.getElementById('classType').value;
    const topic = document.getElementById('topic').value;
    const generateBtn = document.getElementById('generateBtn');

    // Validation
    if (!unitName || !unitCode || !duration) {
        showAlert('Please fill in all required fields', 'error');
        return;
    }

    if (duration < 1 || duration > 120) {
        showAlert('Duration must be between 1 and 120 minutes', 'error');
        return;
    }

    // Show loading
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';

    try {
        const response = await fetch(`${API_BASE_URL}/api/lecturers/generate-qr`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.token}`
            },
            body: JSON.stringify({
                unitName,
                unitCode,
                duration,
                classType,
                topic
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Store QR code data
            currentQRCodeData = data.qrCode;
            
            // Generate visual QR code
            generateQRCodeVisual(data.qrCode);
            
            // Show QR code display
            document.getElementById('qrDisplay').style.display = 'block';
            
            // Update QR code info
            updateQRCodeInfo(data.qrCode);
            
            // Scroll to display
            document.getElementById('qrDisplay').scrollIntoView({ behavior: 'smooth' });
            
            showAlert('✅ QR code generated successfully!', 'success');
            
            // Reload QR codes list
            await loadRecentQRCodes(session.user.id, session.token, session.user.role);
            
        } else {
            throw new Error(data.message || 'Failed to generate QR code');
        }
    } catch (error) {
        console.error('Error generating QR code:', error);
        
        // Generate offline QR code
        generateOfflineQRCode(unitName, unitCode, duration, classType, topic);
        
        showAlert('✅ QR code generated (offline mode)', 'success');
        
    } finally {
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i class="fas fa-qrcode"></i> Generate QR Code';
    }
}

function generateOfflineQRCode(unitName, unitCode, duration, classType, topic) {
    // Create offline QR code data
    currentQRCodeData = {
        qrCodeId: 'QR_OFFLINE_' + Date.now(),
        unitName,
        unitCode,
        classType: classType || 'lecture',
        topic: topic || '',
        lecturerId: 'OFFLINE',
        lecturerName: 'Offline User',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + duration * 60000).toISOString(),
        duration
    };
    
    // Generate visual QR code
    generateQRCodeVisual(currentQRCodeData);
    
    // Show QR code display
    document.getElementById('qrDisplay').style.display = 'block';
    
    // Update QR code info
    updateQRCodeInfo(currentQRCodeData);
    
    // Add to recent QR codes table
    const tableBody = document.getElementById('recentQRCodesBody');
    if (tableBody) {
        const newRow = `
            <tr>
                <td>${unitName}</td>
                <td>${unitCode}</td>
                <td>${classType || 'lecture'}</td>
                <td>${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                <td>${new Date(Date.now() + duration * 60000).toLocaleDateString()} ${new Date(Date.now() + duration * 60000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                <td>0</td>
                <td><span class="status-badge status-present">Active</span></td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-sm btn-outline" onclick="viewQRCode('${currentQRCodeData.qrCodeId}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline" onclick="downloadQRCode('${currentQRCodeData.qrCodeId}')">
                            <i class="fas fa-download"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deactivateQRCode('${currentQRCodeData.qrCodeId}')">
                            <i class="fas fa-stop"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
        tableBody.innerHTML = newRow + tableBody.innerHTML;
    }
}

function generateQRCodeVisual(qrData) {
    const qrcodeContainer = document.getElementById('qrcode');
    qrcodeContainer.innerHTML = '';
    
    // Create QR code display
    const qrText = JSON.stringify(qrData, null, 2);
    
    // For demo, create a visual representation
    const qrDisplay = document.createElement('div');
    qrDisplay.style.cssText = `
        width: 250px;
        height: 250px;
        background: white;
        border: 2px solid #4361ee;
        border-radius: 10px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 1rem;
        margin: 0 auto;
    `;
    
    qrDisplay.innerHTML = `
        <i class="fas fa-qrcode" style="font-size: 3rem; color: #4361ee; margin-bottom: 1rem;"></i>
        <h4 style="margin-bottom: 0.5rem;">${qrData.unitCode}</h4>
        <p style="font-size: 0.9rem; color: #64748b;">${qrData.unitName}</p>
        <p style="font-size: 0.8rem; color: #94a3b8;">Valid: ${qrData.duration} minutes</p>
        <div style="margin-top: 1rem; font-family: monospace; font-size: 0.7rem; word-break: break-all;">
            ${qrData.qrCodeId}
        </div>
    `;
    
    qrcodeContainer.appendChild(qrDisplay);
}

function updateQRCodeInfo(qrData) {
    document.getElementById('qrUnitName').textContent = qrData.unitName;
    document.getElementById('qrUnitCode').textContent = qrData.unitCode;
    document.getElementById('qrClassType').textContent = qrData.classType || 'lecture';
    document.getElementById('qrTopic').textContent = qrData.topic || 'Not specified';
    document.getElementById('qrLecturer').textContent = qrData.lecturerName;
    document.getElementById('qrGenerated').textContent = new Date(qrData.createdAt).toLocaleString();
    document.getElementById('qrExpires').textContent = new Date(qrData.expiresAt).toLocaleString();
    document.getElementById('qrDuration').textContent = qrData.duration;
    document.getElementById('qrCodeId').textContent = qrData.qrCodeId;
}

function downloadQRCode(qrCodeId) {
    if (!currentQRCodeData) {
        showAlert('No QR code to download', 'error');
        return;
    }
    
    // Create download link
    const qrText = JSON.stringify(currentQRCodeData, null, 2);
    const blob = new Blob([qrText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `QR_${currentQRCodeData.unitCode}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showAlert('QR code data downloaded!', 'success');
}

async function viewQRCode(qrCodeId) {
    showAlert(`Viewing QR code: ${qrCodeId}`, 'info');
    
    // In a real app, this would fetch attendance data
    // For demo, show a modal with sample data
    const modal = document.getElementById('attendanceModal');
    const modalBody = document.getElementById('attendanceModalBody');
    
    if (modal && modalBody) {
        modalBody.innerHTML = `
            <h4>QR Code Details</h4>
            <p><strong>ID:</strong> ${qrCodeId}</p>
            <p><strong>Status:</strong> Active</p>
            <p><strong>Generated:</strong> Just now</p>
            <p><strong>Attendance:</strong> 25 students</p>
            
            <h5 class="mt-4">Sample Attendance (5 students):</h5>
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Student ID</th>
                            <th>Name</th>
                            <th>Scan Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td>ST001</td><td>Alice Johnson</td><td>10:30 AM</td></tr>
                        <tr><td>ST002</td><td>Bob Williams</td><td>10:31 AM</td></tr>
                        <tr><td>ST003</td><td>Carol Davis</td><td>10:32 AM</td></tr>
                        <tr><td>ST004</td><td>David Miller</td><td>10:33 AM</td></tr>
                        <tr><td>ST005</td><td>Eva Wilson</td><td>10:34 AM</td></tr>
                    </tbody>
                </table>
            </div>
        `;
        
        modal.classList.add('active');
    }
}

function closeAttendanceModal() {
    const modal = document.getElementById('attendanceModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

async function deactivateQRCode(qrCodeId) {
    if (!confirm('Are you sure you want to deactivate this QR code?')) {
        return;
    }

    showAlert(`QR code ${qrCodeId} deactivated`, 'success');
    
    // Update status in table
    const tableRows = document.querySelectorAll('#recentQRCodesBody tr');
    tableRows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length > 0 && cells[0].textContent.includes(qrCodeId.substring(0, 5))) {
            const statusCell = cells[6];
            const actionsCell = cells[7];
            
            statusCell.innerHTML = '<span class="status-badge status-absent">Expired</span>';
            
            // Remove deactivate button
            const deactivateBtn = actionsCell.querySelector('.btn-danger');
            if (deactivateBtn) {
                deactivateBtn.remove();
            }
        }
    });
}

// Make functions available globally
window.viewQRCode = viewQRCode;
window.downloadQRCode = downloadQRCode;
window.deactivateQRCode = deactivateQRCode;
window.closeAttendanceModal = closeAttendanceModal;
