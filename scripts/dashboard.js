// Dashboard JavaScript
const API_BASE_URL = 'https://zero0-1-r0xs.onrender.com';

document.addEventListener('DOMContentLoaded', async function() {
    console.log('📊 Dashboard loaded');
    
    // Check authentication
    const session = localStorage.getItem('attendance_session');
    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const sessionData = JSON.parse(session);
        const user = sessionData.user;
        
        console.log('Logged in as:', user);
        
        // Update UI
        updateUserInfo(user);
        
        // Load dashboard data
        await loadDashboardData(user);
        
        // Setup event listeners
        setupDashboardEvents();
        
        // Initialize chart if exists
        if (typeof initializeChart === 'function') {
            initializeChart();
        }
        
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        showAlert('Failed to load dashboard. Please try again.', 'error');
    }
});

function updateUserInfo(user) {
    // Update user info in sidebar
    document.getElementById('userName').textContent = user.name || 'User';
    document.getElementById('userRole').textContent = (user.role || 'user').charAt(0).toUpperCase() + (user.role || 'user').slice(1);
    
    // Update page title
    document.getElementById('pageTitle').textContent = 'Dashboard';
    document.getElementById('pageSubtitle').textContent = `Welcome back, ${user.name || 'User'}!`;
    
    // Set avatar
    const avatarText = getInitials(user.name || 'U');
    document.getElementById('userAvatar').textContent = avatarText;
    document.getElementById('miniAvatar').textContent = avatarText;
    
    // Show role-specific menus
    showRoleMenu(user.role);
    
    // Show role-specific buttons
    if (user.role === 'student') {
        document.getElementById('quickScanBtn').style.display = 'flex';
    } else if (user.role === 'lecturer') {
        document.getElementById('quickQRBtn').style.display = 'flex';
        document.getElementById('qrCodesCard').style.display = 'block';
    } else if (user.role === 'admin') {
        document.getElementById('qrCodesCard').style.display = 'block';
    }
}

function getInitials(name) {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

function showRoleMenu(role) {
    // Hide all role menus
    document.getElementById('studentMenu').style.display = 'none';
    document.getElementById('lecturerMenu').style.display = 'none';
    document.getElementById('adminMenu').style.display = 'none';

    // Show appropriate menu
    switch(role) {
        case 'student':
            document.getElementById('studentMenu').style.display = 'block';
            break;
        case 'lecturer':
            document.getElementById('lecturerMenu').style.display = 'block';
            break;
        case 'admin':
            document.getElementById('adminMenu').style.display = 'block';
            break;
    }
}

async function loadDashboardData(user) {
    try {
        let dashboardData;
        const token = authModule.getToken();
        
        // Load data based on role
        switch(user.role) {
            case 'student':
                dashboardData = await fetchStudentDashboard(user.id, token);
                break;
            case 'lecturer':
                dashboardData = await fetchLecturerDashboard(user.id, token);
                break;
            case 'admin':
                dashboardData = await fetchAdminDashboard(token);
                break;
            default:
                dashboardData = { data: {} };
        }

        // Update UI with data
        updateDashboardUI(dashboardData, user.role);
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        // Use mock data for demo
        useMockData(user.role);
    }
}

async function fetchStudentDashboard(studentId, token) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/students/${studentId}/dashboard`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            return await response.json();
        } else {
            throw new Error('Failed to fetch student dashboard');
        }
    } catch (error) {
        console.error('Fetch student dashboard error:', error);
        throw error;
    }
}

async function fetchLecturerDashboard(lecturerId, token) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/lecturers/${lecturerId}/dashboard`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            return await response.json();
        } else {
            throw new Error('Failed to fetch lecturer dashboard');
        }
    } catch (error) {
        console.error('Fetch lecturer dashboard error:', error);
        throw error;
    }
}

async function fetchAdminDashboard(token) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/dashboard`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            return await response.json();
        } else {
            throw new Error('Failed to fetch admin dashboard');
        }
    } catch (error) {
        console.error('Fetch admin dashboard error:', error);
        throw error;
    }
}

function useMockData(role) {
    // Mock data for demo
    let mockData = {
        data: {
            totalClasses: 15,
            attendedClasses: 12,
            missedClasses: 3,
            attendancePercentage: 80,
            recentAttendance: [
                { date: '2024-01-15', time: '10:30 AM', unitName: 'Database Systems', unitCode: 'CS301', status: 'present' },
                { date: '2024-01-14', time: '2:00 PM', unitName: 'Web Development', unitCode: 'CS302', status: 'present' },
                { date: '2024-01-13', time: '9:00 AM', unitName: 'Mathematics', unitCode: 'MATH101', status: 'absent' }
            ],
            todaysClasses: [
                { name: 'Database Systems', code: 'CS301', time: '10:00 AM', period: '60 min', room: 'Room 101', status: 'upcoming' },
                { name: 'Web Development', code: 'CS302', time: '2:00 PM', period: '90 min', room: 'Lab 201', status: 'upcoming' }
            ]
        }
    };
    
    if (role === 'lecturer' || role === 'admin') {
        mockData.data.recentQRCodes = [
            { id: 'QR001', unitName: 'Database Systems', unitCode: 'CS301', createdAt: new Date(), expiresAt: new Date(Date.now() + 3600000), attendanceCount: 25 },
            { id: 'QR002', unitName: 'Web Development', unitCode: 'CS302', createdAt: new Date(Date.now() - 86400000), expiresAt: new Date(Date.now() - 43200000), attendanceCount: 30 }
        ];
    }
    
    updateDashboardUI(mockData, role);
}

function updateDashboardUI(data, role) {
    console.log('Updating dashboard with data:', data);
    
    // Update stats cards
    updateStatsCards(data.data, role);
    
    // Update recent activity
    updateRecentActivity(data.data.recentActivity || []);
    
    // Update attendance table
    updateAttendanceTable(data.data.recentAttendance || []);
    
    // Update quick actions
    updateQuickActions(role);
    
    // Update classes list
    updateClassesList(data.data.todaysClasses || []);
    
    // Update QR codes list (for lecturers/admins)
    if (role !== 'student' && data.data.recentQRCodes) {
        updateQRCodesList(data.data.recentQRCodes);
    }
}

function updateStatsCards(data, role) {
    const statsRow = document.getElementById('statsRow');
    if (!statsRow) return;

    let statsHTML = '';

    switch(role) {
        case 'student':
            statsHTML = `
                <div class="stat-card">
                    <div class="stat-icon stat-icon-primary">
                        <i class="fas fa-book"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${data.totalClasses || 0}</h3>
                        <p>Total Classes</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon stat-icon-success">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${data.attendedClasses || 0}</h3>
                        <p>Classes Attended</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon stat-icon-warning">
                        <i class="fas fa-percentage"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${data.attendancePercentage || 0}%</h3>
                        <p>Attendance Rate</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon stat-icon-danger">
                        <i class="fas fa-times-circle"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${data.missedClasses || 0}</h3>
                        <p>Classes Missed</p>
                    </div>
                </div>
            `;
            break;

        case 'lecturer':
            statsHTML = `
                <div class="stat-card">
                    <div class="stat-icon stat-icon-primary">
                        <i class="fas fa-chalkboard-teacher"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${data.totalClasses || 0}</h3>
                        <p>Classes Conducted</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon stat-icon-success">
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${data.totalStudents || 0}</h3>
                        <p>Total Students</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon stat-icon-warning">
                        <i class="fas fa-clock"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${data.avgAttendance || 0}%</h3>
                        <p>Avg Attendance</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon stat-icon-danger">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${data.activeQRCodes || 0}</h3>
                        <p>Active QR Codes</p>
                    </div>
                </div>
            `;
            break;

        case 'admin':
            statsHTML = `
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
            break;
    }

    statsRow.innerHTML = statsHTML;
}

function updateRecentActivity(activities) {
    const activityList = document.getElementById('activityList');
    if (!activityList) return;

    if (!activities || activities.length === 0) {
        // Use mock activities
        activities = [
            { timestamp: '10:30 AM', userName: 'You', action: 'Scanned QR', details: 'Database Systems (CS301)' },
            { timestamp: 'Yesterday', userName: 'Dr. Smith', action: 'Generated QR', details: 'Web Development - 60min' }
        ];
    }

    const activityHTML = activities.map(activity => `
        <div class="activity-item">
            <div class="activity-icon">
                <i class="fas fa-${activity.action.includes('Scanned') ? 'qrcode' : 'qrcode'}"></i>
            </div>
            <div class="activity-content">
                <div class="activity-title">${activity.details || 'Activity'}</div>
                <div class="activity-time">${activity.timestamp || 'Just now'}</div>
            </div>
        </div>
    `).join('');

    activityList.innerHTML = activityHTML;
}

function updateAttendanceTable(attendance) {
    const tableBody = document.getElementById('attendanceTableBody');
    if (!tableBody) return;

    if (!attendance || attendance.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">No attendance records found</td>
            </tr>
        `;
        return;
    }

    const tableHTML = attendance.map(record => `
        <tr>
            <td>${record.date || '-'}</td>
            <td>${record.time || '-'}</td>
            <td>${record.unitName || '-'}</td>
            <td>${record.unitCode || '-'}</td>
            <td>
                <span class="status-badge status-${record.status || 'absent'}">
                    ${record.status || 'Absent'}
                </span>
            </td>
            <td>
                <div class="table-actions">
                    <button class="btn btn-sm btn-outline" onclick="viewAttendanceDetails('${record.id || ''}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    tableBody.innerHTML = tableHTML;
}

function updateQuickActions(role) {
    const quickActions = document.getElementById('quickActions');
    if (!quickActions) return;

    let actionsHTML = '';

    switch(role) {
        case 'student':
            actionsHTML = `
                <div class="quick-action" onclick="window.location.href='scanner.html'">
                    <i class="fas fa-qrcode"></i>
                    <span>Scan QR Code</span>
                </div>
                <div class="quick-action" onclick="window.location.href='profile.html'">
                    <i class="fas fa-user"></i>
                    <span>My Profile</span>
                </div>
                <div class="quick-action" onclick="showAlert('Feature coming soon!', 'info')">
                    <i class="fas fa-history"></i>
                    <span>Attendance History</span>
                </div>
                <div class="quick-action" onclick="showAlert('Feature coming soon!', 'info')">
                    <i class="fas fa-book"></i>
                    <span>My Courses</span>
                </div>
            `;
            break;

        case 'lecturer':
            actionsHTML = `
                <div class="quick-action" onclick="window.location.href='qr-generator.html'">
                    <i class="fas fa-qr-code"></i>
                    <span>Generate QR</span>
                </div>
                <div class="quick-action" onclick="showAlert('Feature coming soon!', 'info')">
                    <i class="fas fa-list"></i>
                    <span>My QR Codes</span>
                </div>
                <div class="quick-action" onclick="showAlert('Feature coming soon!', 'info')">
                    <i class="fas fa-chart-bar"></i>
                    <span>Reports</span>
                </div>
                <div class="quick-action" onclick="showAlert('Feature coming soon!', 'info')">
                    <i class="fas fa-chalkboard-teacher"></i>
                    <span>My Classes</span>
                </div>
            `;
            break;

        case 'admin':
            actionsHTML = `
                <div class="quick-action" onclick="window.location.href='admin.html'">
                    <i class="fas fa-users"></i>
                    <span>Manage Students</span>
                </div>
                <div class="quick-action" onclick="showAlert('Feature coming soon!', 'info')">
                    <i class="fas fa-chalkboard-teacher"></i>
                    <span>Manage Lecturers</span>
                </div>
                <div class="quick-action" onclick="showAlert('Feature coming soon!', 'info')">
                    <i class="fas fa-chart-pie"></i>
                    <span>Analytics</span>
                </div>
                <div class="quick-action" onclick="showAlert('Feature coming soon!', 'info')">
                    <i class="fas fa-cog"></i>
                    <span>Settings</span>
                </div>
            `;
            break;
    }

    quickActions.innerHTML = actionsHTML;
}

function updateClassesList(classes) {
    const classesList = document.getElementById('classesList');
    if (!classesList) return;

    if (!classes || classes.length === 0) {
        classesList.innerHTML = '<div class="empty-state">No classes today</div>';
        return;
    }

    const classesHTML = classes.map(cls => `
        <div class="class-item">
            <div class="class-time">
                <span class="time">${cls.time || '--:--'}</span>
                <span class="period">${cls.period || ''}</span>
            </div>
            <div class="class-info">
                <div class="class-name">${cls.name || 'Unnamed Class'}</div>
                <div class="class-room">
                    <i class="fas fa-map-marker-alt"></i> ${cls.room || 'TBA'}
                </div>
            </div>
            <div class="class-status">
                <span class="badge ${cls.status === 'upcoming' ? 'bg-warning' : 'bg-success'}">
                    ${cls.status || 'Upcoming'}
                </span>
            </div>
        </div>
    `).join('');

    classesList.innerHTML = classesHTML;
}

function updateQRCodesList(qrCodes) {
    const qrCodesList = document.getElementById('qrCodesList');
    if (!qrCodesList) return;

    if (!qrCodes || qrCodes.length === 0) {
        qrCodesList.innerHTML = '<div class="empty-state">No QR codes generated yet</div>';
        return;
    }

    const qrCodesHTML = qrCodes.map(qr => {
        const isActive = new Date(qr.expiresAt) > new Date();
        return `
            <div class="qr-code-item" onclick="viewQRCodeDetails('${qr.id}')">
                <div class="qr-code-icon">
                    <i class="fas fa-qrcode"></i>
                </div>
                <div class="qr-code-info">
                    <div class="qr-code-name">${qr.unitName || 'Unnamed'}</div>
                    <div class="qr-code-meta">${qr.unitCode || ''} • ${formatTime(qr.createdAt)}</div>
                </div>
                <div class="qr-code-status ${isActive ? 'active' : 'expired'}">
                    ${isActive ? 'Active' : 'Expired'}
                </div>
            </div>
        `;
    }).join('');

    qrCodesList.innerHTML = qrCodesHTML;
}

function formatTime(dateString) {
    try {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        return '--:--';
    }
}

function setupDashboardEvents() {
    // Menu toggle
    const menuToggle = document.getElementById('menuToggle');
    const sidebarClose = document.getElementById('sidebarClose');
    const sidebar = document.getElementById('sidebar');

    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.add('active');
        });
    }

    if (sidebarClose) {
        sidebarClose.addEventListener('click', () => {
            sidebar.classList.remove('active');
        });
    }

    // Notifications
    const notificationsBtn = document.getElementById('notificationsBtn');
    const notificationsPanel = document.getElementById('notificationsPanel');
    const closeNotifications = document.getElementById('closeNotifications');

    if (notificationsBtn) {
        notificationsBtn.addEventListener('click', () => {
            notificationsPanel.classList.add('active');
        });
    }

    if (closeNotifications) {
        closeNotifications.addEventListener('click', () => {
            notificationsPanel.classList.remove('active');
        });
    }

    // Quick scan
    const quickScanBtn = document.getElementById('quickScanBtn');
    if (quickScanBtn) {
        quickScanBtn.addEventListener('click', () => {
            window.location.href = 'scanner.html';
        });
    }

    // Quick QR
    const quickQRBtn = document.getElementById('quickQRBtn');
    if (quickQRBtn) {
        quickQRBtn.addEventListener('click', () => {
            window.location.href = 'qr-generator.html';
        });
    }

    // Export button
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            showAlert('Export feature coming soon!', 'info');
        });
    }

    // Chart period selector
    const chartPeriod = document.getElementById('chartPeriod');
    if (chartPeriod) {
        chartPeriod.addEventListener('change', () => {
            showAlert('Chart updated', 'info');
        });
    }
}

// Global functions for action buttons
window.viewAttendanceDetails = function(id) {
    showAlert(`Viewing attendance details for ID: ${id || 'unknown'}`, 'info');
};

window.viewQRCodeDetails = function(id) {
    showAlert(`Viewing QR code details for ID: ${id || 'unknown'}`, 'info');
};

// Make logout available
window.logout = function() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('attendance_session');
        window.location.href = 'index.html';
    }
};
