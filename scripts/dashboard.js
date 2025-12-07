// Dashboard JavaScript
document.addEventListener('DOMContentLoaded', async function() {
    await initializeDashboard();
    setupDashboardEvents();
});

async function initializeDashboard() {
    // Check authentication
    const sessionData = localStorage.getItem('attendance_session');
    if (!sessionData) {
        window.location.href = 'login.html';
        return;
    }

    const session = JSON.parse(sessionData);
    const { user, token } = session;
    
    if (!user || !token) {
        window.location.href = 'login.html';
        return;
    }

    // Set user info
    document.getElementById('userName').textContent = user.name;
    document.getElementById('userRole').textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);
    document.getElementById('pageSubtitle').textContent = `Welcome back, ${user.name}!`;
    
    // Set avatar
    const avatarText = getInitials(user.name);
    document.getElementById('userAvatar').textContent = avatarText;
    document.getElementById('miniAvatar').textContent = avatarText;

    // Show role-specific menus
    showRoleMenu(user.role);

    // Load dashboard data
    await loadDashboardData(user, token);
    
    // Initialize chart
    initializeChart();
}

function showRoleMenu(role) {
    // Hide all role menus first
    document.getElementById('studentMenu').style.display = 'none';
    document.getElementById('lecturerMenu').style.display = 'none';
    document.getElementById('adminMenu').style.display = 'none';

    // Show appropriate menu
    switch(role) {
        case 'student':
            document.getElementById('studentMenu').style.display = 'block';
            document.getElementById('quickScanBtn').style.display = 'flex';
            break;
        case 'lecturer':
            document.getElementById('lecturerMenu').style.display = 'block';
            document.getElementById('quickQRBtn').style.display = 'flex';
            document.getElementById('qrCodesCard').style.display = 'block';
            break;
        case 'admin':
            document.getElementById('adminMenu').style.display = 'block';
            document.getElementById('qrCodesCard').style.display = 'block';
            break;
    }
}

function getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

async function loadDashboardData(user, token) {
    try {
        let dashboardData;
        
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
        }

        // Update UI with data
        updateDashboardUI(dashboardData, user.role);
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showAlert('Failed to load dashboard data. Please refresh the page.', 'error');
    }
}

async function fetchStudentDashboard(studentId, token) {
    const response = await fetch(`${API_BASE_URL}/api/students/${studentId}/dashboard`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error('Failed to fetch student dashboard');
    }

    return await response.json();
}

async function fetchLecturerDashboard(lecturerId, token) {
    const response = await fetch(`${API_BASE_URL}/api/lecturers/${lecturerId}/dashboard`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error('Failed to fetch lecturer dashboard');
    }

    return await response.json();
}

async function fetchAdminDashboard(token) {
    const response = await fetch(`${API_BASE_URL}/api/admin/dashboard`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error('Failed to fetch admin dashboard');
    }

    return await response.json();
}

function updateDashboardUI(data, role) {
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
    if (!activityList || !activities.length) {
        activityList.innerHTML = '<div class="empty-state">No recent activity</div>';
        return;
    }

    const activityHTML = activities.map(activity => `
        <div class="activity-item">
            <div class="activity-icon">
                <i class="fas fa-${activity.action.includes('Scanned') ? 'qrcode' : 'qrcode'}"></i>
            </div>
            <div class="activity-content">
                <div class="activity-title">${activity.details}</div>
                <div class="activity-meta">
                    <span class="activity-user">${activity.userName}</span>
                    <span class="activity-time">${activity.timestamp}</span>
                </div>
            </div>
        </div>
    `).join('');

    activityList.innerHTML = activityHTML;
}

function updateAttendanceTable(attendance) {
    const tableBody = document.getElementById('attendanceTableBody');
    if (!tableBody) return;

    if (!attendance.length) {
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
                    <button class="btn btn-sm btn-outline" onclick="viewAttendanceDetails('${record.id}')">
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
                <div class="quick-action" onclick="openQuickScan()">
                    <i class="fas fa-qrcode"></i>
                    <span>Scan QR Code</span>
                </div>
                <div class="quick-action" onclick="window.location.href='profile.html'">
                    <i class="fas fa-user"></i>
                    <span>My Profile</span>
                </div>
                <div class="quick-action" onclick="viewAttendanceHistory()">
                    <i class="fas fa-history"></i>
                    <span>Attendance History</span>
                </div>
                <div class="quick-action" onclick="viewCourses()">
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
                <div class="quick-action" onclick="viewMyQRCodes()">
                    <i class="fas fa-list"></i>
                    <span>My QR Codes</span>
                </div>
                <div class="quick-action" onclick="viewAttendanceReports()">
                    <i class="fas fa-chart-bar"></i>
                    <span>Reports</span>
                </div>
                <div class="quick-action" onclick="viewMyClasses()">
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
                <div class="quick-action" onclick="manageLecturers()">
                    <i class="fas fa-chalkboard-teacher"></i>
                    <span>Manage Lecturers</span>
                </div>
                <div class="quick-action" onclick="viewAnalytics()">
                    <i class="fas fa-chart-pie"></i>
                    <span>Analytics</span>
                </div>
                <div class="quick-action" onclick="systemSettings()">
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

    if (!classes.length) {
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
    if (!qrCodesList || !qrCodes.length) {
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
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function initializeChart() {
    const ctx = document.getElementById('attendanceChart');
    if (!ctx) return;

    new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            datasets: [{
                label: 'Attendance',
                data: [85, 90, 88, 92, 87, 0],
                borderColor: '#4361ee',
                backgroundColor: 'rgba(67, 97, 238, 0.1)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#4361ee',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleFont: { family: "'Poppins', sans-serif" },
                    bodyFont: { family: "'Poppins', sans-serif" },
                    padding: 12,
                    cornerRadius: 6
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        font: {
                            family: "'Poppins', sans-serif"
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            family: "'Poppins', sans-serif"
                        }
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
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
        quickScanBtn.addEventListener('click', openQuickScan);
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
        exportBtn.addEventListener('click', exportAttendanceData);
    }

    // Chart period selector
    const chartPeriod = document.getElementById('chartPeriod');
    if (chartPeriod) {
        chartPeriod.addEventListener('change', updateChartPeriod);
    }
}

function openQuickScan() {
    const modal = document.getElementById('quickScanModal');
    if (modal) {
        modal.classList.add('active');
        initializeQuickScanner();
    }
}

function closeQuickScan() {
    const modal = document.getElementById('quickScanModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function initializeQuickScanner() {
    // This would initialize a QR scanner in the modal
    // Implementation depends on QR scanner library
    console.log('Initializing quick scanner...');
}

function exportAttendanceData() {
    // Implement export functionality
    alert('Export feature coming soon!');
}

function updateChartPeriod() {
    // Implement chart period update
    console.log('Chart period updated');
}

// Global functions for action buttons
function viewAttendanceDetails(id) {
    alert(`Viewing attendance details for ID: ${id}`);
}

function viewQRCodeDetails(id) {
    alert(`Viewing QR code details for ID: ${id}`);
}

function viewAttendanceHistory() {
    alert('Viewing attendance history');
}

function viewCourses() {
    alert('Viewing courses');
}

function viewMyQRCodes() {
    alert('Viewing my QR codes');
}

function viewAttendanceReports() {
    alert('Viewing attendance reports');
}

function viewMyClasses() {
    alert('Viewing my classes');
}

function manageLecturers() {
    alert('Managing lecturers');
}

function viewAnalytics() {
    alert('Viewing analytics');
}

function systemSettings() {
    alert('System settings');
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
window.openQuickScan = openQuickScan;
window.closeQuickScan = closeQuickScan;
window.viewAttendanceDetails = viewAttendanceDetails;
window.viewQRCodeDetails = viewQRCodeDetails;
window.viewAttendanceHistory = viewAttendanceHistory;
window.viewCourses = viewCourses;
window.viewMyQRCodes = viewMyQRCodes;
window.viewAttendanceReports = viewAttendanceReports;
window.viewMyClasses = viewMyClasses;
window.manageLecturers = manageLecturers;
window.viewAnalytics = viewAnalytics;
window.systemSettings = systemSettings;
window.logout = authModule ? authModule.logout : function() {
    localStorage.removeItem('attendance_session');
    window.location.href = 'index.html';
};
