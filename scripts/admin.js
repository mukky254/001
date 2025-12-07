// scripts/admin.js - ADMIN PANEL
const API_BASE_URL = 'https://zero0-1-r0xs.onrender.com';

document.addEventListener('DOMContentLoaded', async function() {
    await initializeAdminPanel();
    setupAdminEvents();
});

async function initializeAdminPanel() {
    // Check authentication
    const sessionData = localStorage.getItem('attendance_session');
    if (!sessionData) {
        window.location.href = 'login.html';
        return;
    }

    const session = JSON.parse(sessionData);
    const { user, token } = session;
    
    if (!user || user.role !== 'admin') {
        window.location.href = 'dashboard.html';
        return;
    }

    // Set user info
    document.getElementById('userName').textContent = user.name;
    document.getElementById('userRole').textContent = 'Administrator';
    
    // Set avatar
    const avatarText = getInitials(user.name);
    document.getElementById('userAvatar').textContent = avatarText;
    document.getElementById('miniAvatar').textContent = avatarText;

    // Load admin data
    await loadAdminData(token);
}

function getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

async function loadAdminData(token) {
    try {
        // Load dashboard data
        const response = await fetch(`${API_BASE_URL}/api/admin/dashboard`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error('Failed to load admin data');
        }

        const data = await response.json();
        updateAdminDashboard(data.data);
        
        // Load students
        await loadStudents(token);
        
        // Load QR codes
        await loadQRCodes(token);
        
    } catch (error) {
        console.error('Error loading admin data:', error);
        showAlert('Failed to load admin data. Please try again.', 'error');
    }
}

function updateAdminDashboard(data) {
    // Update stats
    const statsRow = document.getElementById('statsRow');
    if (statsRow) {
        statsRow.innerHTML = `
            <div class="stat-card">
                <div class="stat-icon stat-icon-primary">
                    <i class="fas fa-users"></i>
                </div>
                <div class="stat-info">
                    <h3>${data.totalStudents || 0}</h3>
                    <p>Total Students</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon stat-icon-success">
                    <i class="fas fa-chalkboard-teacher"></i>
                </div>
                <div class="stat-info">
                    <h3>${data.totalLecturers || 0}</h3>
                    <p>Total Lecturers</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon stat-icon-warning">
                    <i class="fas fa-book"></i>
                </div>
                <div class="stat-info">
                    <h3>${data.totalCourses || 0}</h3>
                    <p>Total Courses</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon stat-icon-danger">
                    <i class="fas fa-chart-line"></i>
                </div>
                <div class="stat-info">
                    <h3>${data.overallAttendance || 0}%</h3>
                    <p>Overall Attendance</p>
                </div>
            </div>
        `;
    }
}

async function loadStudents(token) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/students`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            updateStudentsTable(data.students || []);
        }
    } catch (error) {
        console.error('Error loading students:', error);
    }
}

function updateStudentsTable(students) {
    const tableBody = document.getElementById('studentsTableBody');
    if (!tableBody) return;

    if (!students.length) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center">No students found</td>
            </tr>
        `;
        return;
    }

    const tableHTML = students.map(student => `
        <tr>
            <td>${student.id || '-'}</td>
            <td>${student.name || '-'}</td>
            <td>${student.email || '-'}</td>
            <td>${student.phone || '-'}</td>
            <td>${student.course || '-'}</td>
            <td>Year ${student.year || '-'}</td>
            <td>
                <span class="badge ${student.attendancePercentage >= 75 ? 'bg-success' : 'bg-warning'}">
                    ${student.attendancePercentage || 0}%
                </span>
            </td>
            <td>
                <div class="table-actions">
                    <button class="btn btn-sm btn-outline" onclick="viewStudentDetails('${student.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline" onclick="editStudent('${student.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteStudent('${student.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    tableBody.innerHTML = tableHTML;
}

async function loadQRCodes(token) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/qr-codes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            updateQRCodesTable(data.qrCodes || []);
        }
    } catch (error) {
        console.error('Error loading QR codes:', error);
    }
}

function updateQRCodesTable(qrCodes) {
    const tableBody = document.getElementById('qrCodesTableBody');
    if (!tableBody) return;

    if (!qrCodes.length) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center">No QR codes found</td>
            </tr>
        `;
        return;
    }

    const tableHTML = qrCodes.map(qr => {
        const isActive = new Date(qr.expiresAt) > new Date();
        return `
            <tr>
                <td>${qr.qrCodeId || '-'}</td>
                <td>${qr.unitName || '-'} (${qr.unitCode || '-'})</td>
                <td>${qr.lecturerName || '-'}</td>
                <td>${new Date(qr.createdAt).toLocaleDateString()}</td>
                <td>${new Date(qr.expiresAt).toLocaleDateString()}</td>
                <td>${qr.attendanceCount || 0}</td>
                <td>
                    <span class="badge ${isActive ? 'bg-success' : 'bg-danger'}">
                        ${isActive ? 'Active' : 'Expired'}
                    </span>
                </td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-sm btn-outline" onclick="viewQRCode('${qr.qrCodeId}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteQRCode('${qr.qrCodeId}')" ${!isActive ? 'disabled' : ''}>
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    tableBody.innerHTML = tableHTML;
}

function setupAdminEvents() {
    // Tab switching
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.dataset.tab;
            switchAdminTab(tabId);
        });
    });

    // Add student button
    const addStudentBtn = document.getElementById('addStudentBtn');
    if (addStudentBtn) {
        addStudentBtn.addEventListener('click', () => {
            document.getElementById('addStudentModal').style.display = 'block';
            document.getElementById('addStudentModal').classList.add('active');
        });
    }

    // Generate report button
    const generateReportBtn = document.getElementById('generateReportBtn');
    if (generateReportBtn) {
        generateReportBtn.addEventListener('click', generateReport);
    }

    // Refresh button
    const refreshDataBtn = document.getElementById('refreshDataBtn');
    if (refreshDataBtn) {
        refreshDataBtn.addEventListener('click', refreshAdminData);
    }
}

function switchAdminTab(tabId) {
    // Update active tab
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabId);
    });

    // Show corresponding content
    document.querySelectorAll('.admin-tab-content').forEach(content => {
        content.classList.toggle('active', content.id === tabId + 'Content');
    });
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.style.display = 'none';
    modal.classList.remove('active');
}

async function addStudent() {
    const session = JSON.parse(localStorage.getItem('attendance_session'));
    if (!session) return;

    const studentData = {
        role: 'student',
        id: document.getElementById('newStudentId').value,
        name: document.getElementById('newStudentName').value,
        email: document.getElementById('newStudentEmail').value,
        phone: document.getElementById('newStudentPhone').value,
        course: document.getElementById('newStudentCourse').value,
        year: document.getElementById('newStudentYear').value,
        password: document.getElementById('newStudentPassword').value
    };

    // Validation
    for (const key in studentData) {
        if (!studentData[key]) {
            showAlert('Please fill in all fields', 'error');
            return;
        }
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(studentData)
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showAlert('✅ Student added successfully', 'success');
            closeModal('addStudentModal');
            
            // Refresh students list
            await loadStudents(session.token);
            
            // Clear form
            document.getElementById('addStudentForm').reset();
        } else {
            throw new Error(data.message || 'Failed to add student');
        }
    } catch (error) {
        showAlert('❌ ' + error.message, 'error');
    }
}

async function generateReport() {
    const session = JSON.parse(localStorage.getItem('attendance_session'));
    if (!session) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/generate-report`, {
            headers: { 'Authorization': `Bearer ${session.token}` }
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'attendance_report.csv';
            document.body.appendChild(a);
            a.click();
            a.remove();
            
            showAlert('✅ Report generated and downloaded', 'success');
        } else {
            throw new Error('Failed to generate report');
        }
    } catch (error) {
        showAlert('❌ ' + error.message, 'error');
    }
}

function viewStudentDetails(studentId) {
    showAlert(`Viewing details for student: ${studentId}`, 'info');
}

function editStudent(studentId) {
    showAlert(`Editing student: ${studentId}`, 'info');
}

async function deleteStudent(studentId) {
    if (!confirm(`Are you sure you want to delete student ${studentId}?`)) return;

    const session = JSON.parse(localStorage.getItem('attendance_session'));
    if (!session) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/users/${studentId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${session.token}`
            }
        });

        if (response.ok) {
            showAlert('✅ Student deleted successfully', 'success');
            await loadStudents(session.token);
        } else {
            throw new Error('Failed to delete student');
        }
    } catch (error) {
        showAlert('❌ ' + error.message, 'error');
    }
}

function viewQRCode(qrCodeId) {
    showAlert(`Viewing QR Code: ${qrCodeId}`, 'info');
}

async function deleteQRCode(qrCodeId) {
    if (!confirm(`Are you sure you want to delete QR code ${qrCodeId}?`)) return;

    showAlert('QR code deletion would be implemented here', 'info');
}

async function refreshAdminData() {
    const session = JSON.parse(localStorage.getItem('attendance_session'));
    if (!session) return;

    showAlert('Refreshing data...', 'info');
    await loadAdminData(session.token);
}

// Make functions available globally
window.viewStudentDetails = viewStudentDetails;
window.editStudent = editStudent;
window.deleteStudent = deleteStudent;
window.viewQRCode = viewQRCode;
window.deleteQRCode = deleteQRCode;
window.addStudent = addStudent;
window.generateReport = generateReport;
window.refreshAdminData = refreshAdminData;
window.logout = function() {
    localStorage.removeItem('attendance_session');
    window.location.href = 'index.html';
};
