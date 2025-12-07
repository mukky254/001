// scripts/auth.js - AUTHENTICATION
const API_BASE_URL = 'https://zero0-1-r0xs.onrender.com';

document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Auth page loaded');
    console.log('📡 Backend URL:', API_BASE_URL);
    
    setupEventListeners();
    checkExistingSession();
    handleURLParams();
});

function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.dataset.tab;
            switchTab(tabId);
        });
    });

    // Password toggle
    document.querySelectorAll('.password-toggle').forEach(toggle => {
        toggle.addEventListener('click', function() {
            const input = this.parentElement.querySelector('input');
            const icon = this.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });

    // Role selection for registration
    const regRole = document.getElementById('regRole');
    if (regRole) {
        regRole.addEventListener('change', function() {
            const role = this.value;
            showRoleFields(role);
        });
    }

    // Form submissions
    const loginForm = document.getElementById('loginFormData');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginSubmit);
    }

    const registerForm = document.getElementById('registerFormData');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegisterSubmit);
    }

    // Initialize sample data button
    const initSampleBtn = document.getElementById('initSampleBtn');
    if (initSampleBtn) {
        initSampleBtn.addEventListener('click', initializeSampleData);
    }

    // Switch to login link
    const switchToLogin = document.querySelector('.switch-to-login');
    if (switchToLogin) {
        switchToLogin.addEventListener('click', function(e) {
            e.preventDefault();
            switchTab('login');
        });
    }
}

function handleURLParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    
    if (tab === 'register') {
        switchTab('register');
    }
}

function switchTab(tabId) {
    // Update tabs
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabId);
    });

    // Update forms
    document.querySelectorAll('.auth-form').forEach(form => {
        form.classList.toggle('active', form.id === tabId + 'Form');
    });
}

function showRoleFields(role) {
    const studentFields = document.getElementById('studentFields');
    const lecturerFields = document.getElementById('lecturerFields');

    if (studentFields) studentFields.style.display = role === 'student' ? 'block' : 'none';
    if (lecturerFields) lecturerFields.style.display = role === 'lecturer' ? 'block' : 'none';
}

async function handleLoginSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('loginId').value;
    const password = document.getElementById('loginPassword').value;
    const role = document.getElementById('loginRole').value;
    const loginBtn = document.getElementById('loginBtn');

    // Validation
    if (!id || !password || !role) {
        showAlert('Please fill in all fields', 'error');
        return;
    }

    // Show loading
    loginBtn.disabled = true;
    const originalText = loginBtn.innerHTML;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';

    try {
        console.log('Sending login request to:', `${API_BASE_URL}/api/auth/login`);
        
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ id, password, role })
        });

        const data = await response.json();
        console.log('Login response:', data);

        if (response.ok && data.success) {
            // Store user session
            localStorage.setItem('attendance_session', JSON.stringify({
                user: data.user,
                token: data.token,
                expires: Date.now() + (7 * 24 * 60 * 60 * 1000)
            }));

            showAlert('✅ Login successful! Redirecting...', 'success');
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        } else {
            throw new Error(data.message || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        showAlert('❌ ' + error.message, 'error');
        
        // Fallback test credentials
        if (id === 'AD001' && password === 'admin123' && role === 'admin') {
            showAlert('Using test admin credentials...', 'warning');
            const testUser = {
                id: 'AD001',
                name: 'System Admin',
                email: 'admin@school.edu',
                phone: '+254712345678',
                role: 'admin'
            };
            localStorage.setItem('attendance_session', JSON.stringify({
                user: testUser,
                token: 'test_token',
                expires: Date.now() + (7 * 24 * 60 * 60 * 1000)
            }));
            setTimeout(() => window.location.href = 'dashboard.html', 1000);
        }
    } finally {
        loginBtn.disabled = false;
        loginBtn.innerHTML = originalText;
    }
}

async function handleRegisterSubmit(e) {
    e.preventDefault();
    
    const role = document.getElementById('regRole').value;
    const name = document.getElementById('regName').value;
    const id = document.getElementById('regId').value;
    const email = document.getElementById('regEmail').value;
    const phone = document.getElementById('regPhone').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    const registerBtn = document.getElementById('registerBtn');

    // Validation
    if (!role || !name || !id || !email || !phone || !password) {
        showAlert('Please fill in all required fields', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showAlert('Passwords do not match', 'error');
        return;
    }

    // Prepare user data
    const userData = {
        role,
        name,
        id,
        email,
        phone,
        password
    };

    // Add role-specific fields
    if (role === 'student') {
        const course = document.getElementById('regCourse').value;
        const year = document.getElementById('regYear').value;
        userData.course = course;
        userData.year = year;
    } else if (role === 'lecturer') {
        const department = document.getElementById('regDepartment').value;
        userData.department = department;
    }

    // Show loading
    registerBtn.disabled = true;
    const originalText = registerBtn.innerHTML;
    registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering...';

    try {
        console.log('Sending register request to:', `${API_BASE_URL}/api/auth/register`);
        
        const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(userData)
        });

        const data = await response.json();
        console.log('Register response:', data);

        if (response.ok && data.success) {
            showAlert('✅ Registration successful! You can now login.', 'success');
            
            // Clear form and switch to login
            setTimeout(() => {
                document.getElementById('registerFormData').reset();
                switchTab('login');
                document.getElementById('loginId').value = id;
                document.getElementById('loginRole').value = role;
            }, 1500);
        } else {
            throw new Error(data.message || 'Registration failed');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showAlert('❌ ' + error.message, 'error');
    } finally {
        registerBtn.disabled = false;
        registerBtn.innerHTML = originalText;
    }
}

async function initializeSampleData() {
    if (!confirm('This will initialize sample data in the database. Do you want to continue?')) {
        return;
    }

    const initBtn = document.getElementById('initSampleBtn');
    const originalText = initBtn.innerHTML;
    initBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Initializing...';
    initBtn.disabled = true;

    try {
        console.log('Initializing sample data at:', `${API_BASE_URL}/api/init-sample-data`);
        
        const response = await fetch(`${API_BASE_URL}/api/init-sample-data`, {
            method: 'POST'
        });

        const data = await response.json();
        console.log('Init response:', data);

        if (response.ok && data.success) {
            showAlert('✅ Sample data initialized successfully!', 'success');
            
            // Update sample info
            const sampleInfo = document.querySelector('.sample-data-info');
            if (sampleInfo) {
                sampleInfo.innerHTML = `
                    <p><strong>✅ Sample Users Created:</strong></p>
                    <ul>
                        <li><strong>Admin:</strong> ID: AD001, Password: admin123</li>
                        <li><strong>Lecturer:</strong> ID: LT001, Password: lecturer123</li>
                        <li><strong>Students:</strong> ID: ST001-003, Password: student123</li>
                    </ul>
                `;
            }
            
            // Switch to login
            setTimeout(() => {
                switchTab('login');
            }, 2000);
        } else {
            throw new Error(data.message || 'Failed to initialize sample data');
        }
    } catch (error) {
        console.error('Init error:', error);
        showAlert('❌ ' + error.message, 'error');
    } finally {
        initBtn.innerHTML = originalText;
        initBtn.disabled = false;
    }
}

function checkExistingSession() {
    const sessionData = localStorage.getItem('attendance_session');
    
    if (sessionData) {
        const session = JSON.parse(sessionData);
        
        // Check if session is expired
        if (Date.now() > session.expires) {
            localStorage.removeItem('attendance_session');
            return;
        }

        // Redirect to dashboard if already logged in
        if (window.location.pathname.includes('login.html') || 
            window.location.pathname === '/' || 
            window.location.pathname.includes('index.html')) {
            window.location.href = 'dashboard.html';
        }
    }
}

// Logout function (available globally)
window.logout = function() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('attendance_session');
        window.location.href = 'index.html';
    }
};

// Export for use in other files
window.authModule = {
    getCurrentUser: () => {
        const session = localStorage.getItem('attendance_session');
        return session ? JSON.parse(session).user : null;
    },
    getToken: () => {
        const session = localStorage.getItem('attendance_session');
        return session ? JSON.parse(session).token : null;
    },
    logout: logout,
    showAlert: showAlert,
    API_BASE_URL: API_BASE_URL
};
