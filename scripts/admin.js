// Admin Panel JavaScript
const API_BASE_URL = 'https://zero0-1-r0xs.onrender.com';

document.addEventListener('DOMContentLoaded', async function() {
    console.log('👑 Admin panel loaded');
    
    // Check authentication
    const session = localStorage.getItem('attendance_session');
    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const sessionData = JSON.parse(session);
        const user = sessionData.user;
        
        if (user.role !== 'admin') {
            window.location.href = 'dashboard.html';
            return;
        }

        // Update user info
        document.getElementById('userName').textContent = user.name || 'Admin';
        document.getElementById('userRole').textContent = 'Administrator';
        
        // Set avatar
        const avatarText = getInitials(user.name || 'A');
        document.getElementById('userAvatar').textContent = avatarText;
        document.getElementById('miniAvatar').textContent = avatarText;

        // Load admin data
        await loadAdminData(sessionData.token);
        
        // Setup event listeners
        setupAdminEvents();
        
    } catch (error) {
        console.error('Error initializing admin panel:', error);
        showAlert('Failed to load admin panel. Using demo data.', 'warning');
        useMockAdminData();
    }
});

function getInitials(name) {
    if (!name) return 'A';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

async function loadAdminData(token) {
    try {
        // Load dashboard data
        const dashboardRes = await fetch(`${API_BASE_URL}/api/admin/dashboard`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (dashboardRes.ok) {
            const dashboardData = await dashboardRes.json();
            updateAdminDashboard(dashboardData.data);
        }

        // Load students
        const studentsRes = await fetch(`${API_BASE_URL}/api/admin/students`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (studentsRes.ok) {
            const studentsData = await studentsRes.json();
            updateStudentsTable(studentsData.students || []);
        }

        // Load QR codes
        const qrCodesRes = await fetch(`${API_BASE_URL}/api/admin/qr-codes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (qrCodesRes.ok) {
            const qrCodesData = await qrCodesRes.json();
            updateQRCodesTable(qrCodesData.qrCodes || []);
        }

    } catch (error) {
        console.error('Error loading admin data:', error);
        throw error;
    }
}

function useMockAdminData() {
    // Mock dashboard data
    const mockDashboard = {
        data: {
            totalStudents: 150,
            totalLecturers: 15,
            totalCourses: 25,
            overallAttendance: 85,
            todayRecords: 45,
            weekRecords: 320,
            monthRecords: 1250,
            recentActivity: [
                { timestamp: '10:30 AM', userName: 'Alice Johnson', action: 'Scanned QR', details: 'Database Systems (CS301)' },
                { timestamp: '10:15 AM', userName: 'Dr. Smith', action: 'Generated QR', details: 'Web Development - 60min' },
                { timestamp: '09:45 AM', userName: 'Bob Williams', action: 'Scanned QR', details: 'Mathematics (MATH101)' }
            ]
        }
    };

    // Mock students data
    const mockStudents = [
        { id: 'ST001', name: 'Alice Johnson', email: 'alice@student.edu', phone: '+254712345678', course: 'Computer Science', year: 2, attendanceCount: 45, attendancePercentage: 90 },
        { id: 'ST002', name: 'Bob Williams', email: 'bob@student.edu', phone: '+254723456789', course: 'Software Engineering', year: 3, attendanceCount: 40, attendancePercentage: 80 },
        { id: 'ST003', name: 'Carol Davis', email: 'carol@student.edu', phone: '+254734567890', course: 'Information Technology', year: 1, attendanceCount: 35, attendancePercentage: 70 }
    ];

    // Mock QR codes data
    const mockQRCodes = [
        { qrCodeId: 'QR001', unitName: 'Database Systems', unitCode: 'CS301', lecturerName: 'Dr. Smith', createdAt: new Date(), expiresAt: new Date(Date.now() + 3600000), attendanceCount: 25 },
        { qrCodeId: 'QR002', unitName: 'Web Development', unitCode: 'CS302', lecturerName: 'Dr. Johnson', createdAt: new Date(Date.now() - 86400000), expiresAt: new Date(Date.now() - 43200000), attendanceCount: 30 }
    ];

    updateAdminDashboard(mockDashboard.data);
    updateStudentsTable(mockStudents);
    updateQRCodesTable(mockQRCodes);
}

function updateAdminDashboard(data) {
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
                <span class="badge ${(student.attendancePercentage || 0) >= 75 ? 'bg-success' : 'bg-warning'}">
                    ${student.attendancePercentage || 0}%
                </span>
            </td>
            <td>
                <div class="table-actions">
                    <button class="btn btn-sm btn-outline" onclick="viewStudentDetails('${student.id || ''}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline" onclick="editStudent('${student.id || ''}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteStudent('${student.id || ''}')">
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
                        <button class="btn btn-sm btn-outline" onclick="viewQRCode('${qr.qrCodeId || ''}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteQRCode('${qr.qrCodeId || ''}')" ${!isActive ? 'disabled' : ''}>
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
    // Tabs
    const tabButtons = document.querySelectorAll('.admin-tab');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            switchAdminTab(tabId);
        });
    });

    // Refresh data
    const refreshDataBtn = document.getElementById('refreshDataBtn');
    if (refreshDataBtn) {
        refreshDataBtn.addEventListener('click', refreshAdminData);
    }

    // Generate reports
    const generateReportBtn = document.getElementById('generateReportBtn');
    if (generateReportBtn) {
        generateReportBtn.addEventListener('click', generateReport);
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

async function refreshAdminData() {
    const session = JSON.parse(localStorage.getItem('attendance_session'));
    if (!session) return;

    const refreshBtn = document.getElementById('refreshDataBtn');
    const originalHTML = refreshBtn.innerHTML;
    
    refreshBtn.disabled = true;
    refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';

    try {
        await loadAdminData(session.token);
        showAlert('✅ Data refreshed successfully', 'success');
    } catch (error) {
        showAlert('❌ Failed to refresh data', 'error');
    } finally {
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = originalHTML;
    }
}

async function generateReport() {
    showAlert('📊 Generating report...', 'info');
    
    // Simulate report generation
    setTimeout(() => {
        showAlert('✅ Report generated successfully!', 'success');
        
        // Create a simple CSV download
        const csvData = [
            ['Student ID', 'Name', 'Email', 'Course', 'Attendance %'],
            ['ST001', 'Alice Johnson', 'alice@student.edu', 'Computer Science', '90%'],
            ['ST002', 'Bob Williams', 'bob@student.edu', 'Software Engineering', '80%'],
            ['ST003', 'Carol Davis', 'carol@student.edu', 'Information Technology', '70%']
        ].map(row => row.join(',')).join('\n');
        
        const blob = new Blob([csvData], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'attendance_report.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 2000);
}

function viewStudentDetails(studentId) {
    showAlert(`Viewing student details for ID: ${studentId}`, 'info');
    
    // In a real app, this would fetch student details
    // For demo, show a modal with sample data
    const modal = document.getElementById('studentDetailsModal');
    const modalBody = document.getElementById('studentDetailsBody');
    
    if (modal && modalBody) {
        modalBody.innerHTML = `
            <div class="student-profile">
                <div class="profile-header">
                    <div class="profile-avatar">${getInitials('Test Student')}</div>
                    <h4>Test Student</h4>
                    <p>${studentId} • Computer Science Year 2</p>
                </div>
                
                <div class="profile-stats">
                    <div class="stat">
                        <span class="stat-label">Attendance Rate</span>
                        <span class="stat-value">85%</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Classes Attended</span>
                        <span class="stat-value">42/50</span>
                    </div>
               
