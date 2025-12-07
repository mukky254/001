// Admin Panel JavaScript
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
        // Load all data in parallel
        const [dashboardRes, studentsRes, qrCodesRes] = await Promise.all([
            fetch(`${API_BASE_URL}/api/admin/dashboard`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch(`${API_BASE_URL}/api/admin/students`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch(`${API_BASE_URL}/api/admin/qr-codes`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
        ]);

        if (!dashboardRes.ok || !studentsRes.ok) {
            throw new Error('Failed to load admin data');
        }

        const dashboardData = await dashboardRes.json();
        const studentsData = await studentsRes.json();
        const qrCodesData = qrCodesRes.ok ? await qrCodesRes.json() : { qrCodes: [] };

        // Update UI
        updateAdminDashboard(dashboardData.data);
        updateStudentsTable(studentsData.students || []);
        updateQRCodesTable(qrCodesData.qrCodes || []);
        
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

function updateStudentsTable(students) {
    const tableBody = document.getElementById('studentsTableBody');
    if (!tableBody) return;

    if (!students.length) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">No students found</td>
            </tr>
        `;
        return;
    }

    const tableHTML = students.map(student => `
        <tr>
            <td>${student.id || '-'}</td>
            <td>
                <div class="student-avatar">${getInitials(student.name)}</div>
                ${student.name || '-'}
            </td>
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
                <td>${qr.unitName || '-'}</td>
                <td>${qr.unitCode || '-'}</td>
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
    // Add student modal
    const addStudentBtn = document.getElementById('addStudentBtn');
    if (addStudentBtn) {
        addStudentBtn.addEventListener('click', () => {
            document.getElementById('addStudentModal').classList.add('active');
        });
    }

    // Generate reports
    const generateReportBtn = document.getElementById('generateReportBtn');
    if (generateReportBtn) {
        generateReportBtn.addEventListener('click', generateReport);
    }

    // Refresh data
    const refreshDataBtn = document.getElementById('refreshDataBtn');
    if (refreshDataBtn) {
        refreshDataBtn.addEventListener('click', refreshAdminData);
    }

    // Tabs
    const tabButtons = document.querySelectorAll('.admin-tab');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            switchAdminTab(tabId);
        });
    });
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

async function refreshAdminData() {
    const session = getCurrentSession();
    if (!session) return;

    const refreshBtn = document.getElementById('refreshDataBtn');
    const originalHTML = refreshBtn.innerHTML;
    
    refreshBtn.disabled = true;
    refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';

    await loadAdminData(session.token);
    
    refreshBtn.disabled = false;
    refreshBtn.innerHTML = originalHTML;
    showAlert('Data refreshed successfully', 'success');
}

async function generateReport() {
    const session = getCurrentSession();
    if (!session) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/generate-report`, {
            headers: { 'Authorization': `Bearer ${session.token}` }
        });

        if (response.ok) {
            const data = await response.json();
            // In a real app, this would download a file
            showAlert('Report generated successfully! Download started.', 'success');
        } else {
            throw new Error('Failed to generate report');
        }
    } catch (error) {
        showAlert(error.message, 'error');
    }
}

async function viewStudentDetails(studentId) {
    const session = getCurrentSession();
    if (!session) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/students/${studentId}/analytics`, {
            headers: { 'Authorization': `Bearer ${session.token}` }
        });

        if (response.ok) {
            const data = await response.json();
            showStudentModal(data);
        } else {
            throw new Error('Failed to load student details');
        }
    } catch (error) {
        showAlert(error.message, 'error');
    }
}

function showStudentModal(data) {
    const modal = document.getElementById('studentDetailsModal');
    const modalBody = document.getElementById('studentDetailsBody');
    
    if (!modal || !modalBody) return;

    modalBody.innerHTML = `
        <div class="student-profile">
            <div class="profile-header">
                <div class="profile-avatar">${getInitials(data.student.name)}</div>
                <h4>${data.student.name}</h4>
                <p>${data.student.id} • ${data.student.course} Year ${data.student.year}</p>
            </div>
            
            <div class="profile-stats">
                <div class="stat">
                    <span class="stat-label">Attendance Rate</span>
                    <span class="stat-value">${data.attendancePercentage}%</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Classes Attended</span>
                    <span class="stat-value">${data.attendedClasses}/${data.totalClasses}</span>
                </div>
            </div>
            
            <div class="attendance-history">
                <h5>Recent Attendance</h5>
                ${data.attendance && data.attendance.length > 0 ? `
                    <div class="table-responsive">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Unit</th>
                                    <th>Lecturer</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.attendance.map(record => `
                                    <tr>
                                        <td>${record.date}</td>
                                        <td>${record.unitName}</td>
                                        <td>${record.lecturerName}</td>
                                        <td><span class="badge ${record.status === 'present' ? 'bg-success' : 'bg-danger'}">${record.status}</span></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : '<p>No attendance records found</p>'}
            </div>
        </div>
    `;

    modal.classList.add('active');
}

function getCurrentSession() {
    const sessionData = localStorage.getItem('attendance_session');
    return sessionData ? JSON.parse(sessionData) : null;
}

// Admin-specific functions
window.viewStudentDetails = viewStudentDetails;
window.refreshAdminData = refreshAdminData;
window.generateReport = generateReport;

// Make logout available
window.logout = function() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('attendance_session');
        window.location.href = 'index.html';
    }
};
