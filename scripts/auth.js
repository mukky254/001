// Authentication JavaScript
const API_BASE_URL = 'https://zero0-1-r0xs.onrender.com';
let currentUser = null;
let currentToken = null;

// DOM Elements
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Auth page loaded');
    console.log('🔗 Backend URL:', API_BASE_URL);
    
    initializeAuth();
    checkExistingSession();
    setupEventListeners();
    handleURLParams();
    
    // Test backend connection
    testBackendConnection();
});

async function testBackendConnection() {
    try {
        console.log('Testing backend connection...');
        const response = await fetch(API_BASE_URL);
        const data = await response.json();
        console.log('✅ Backend response:', data);
    } catch (error) {
        console.error('❌ Backend connection failed:', error);
        showAlert('⚠️ Backend connection issue detected. Using fallback mode.', 'warning');
    }
}

function initializeAuth() {
    // Set current year in footer
    document.querySelectorAll('.current-year').forEach(el => {
        el.textContent = new Date().getFullYear();
    });
}

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

    // Password strength checker
    const regPassword = document.getElementById('regPassword');
    if (regPassword) {
        regPassword.addEventListener('input', checkPasswordStrength);
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

    // Update URL
    const url = new URL(window.location);
    url.searchParams.set('tab', tabId);
    window.history.replaceState({}, '', url);
}

function showRoleFields(role) {
    const studentFields = document.getElementById('studentFields');
    const lecturerFields = document.getElementById('lecturerFields');

    if (studentFields) studentFields.style.display = role === 'student' ? 'block' : 'none';
    if (lecturerFields) lecturerFields.style.display = role === 'lecturer' ? 'block' : 'none';
}

function checkPasswordStrength() {
    const password = this.value;
    const strengthBar = document.querySelector('.strength-bar');
    const strengthText = document.getElementById('strengthText');
    
    let strength = 0;
    let color = '#ef4444';
    let text = 'Weak';

    // Check password criteria
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    switch(strength) {
        case 1:
            color = '#ef4444';
            text = 'Weak';
            break;
        case 2:
            color = '#f59e0b';
            text = 'Fair';
            break;
        case 3:
            color = '#3b82f6';
            text = 'Good';
            break;
        case 4:
            color = '#10b981';
            text = 'Strong';
            break;
    }

    if (strengthBar) {
        strengthBar.style.width = (strength * 25) + '%';
        strengthBar.style.backgroundColor = color;
    }
    
    if (strengthText) {
        strengthText.textContent = text;
        strengthText.style.color = color;
    }
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
    setButtonLoading(loginBtn, true);

    try {
        console.log('Sending login request to:', `${API_BASE_URL}/api/auth/login`);
        
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id, password, role })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Store user session
            currentUser = data.user;
            currentToken = data.token;
            
            localStorage.setItem('attendance_session', JSON.stringify({
                user: currentUser,
                token: currentToken,
                expires: Date.now() + (7 * 24 * 60 * 60 * 1000)
            }));

            showAlert('✅ Login successful! Redirecting...', 'success');
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } else {
            throw new Error(data.message || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        showAlert('❌ ' + error.message, 'error');
        
        // Try offline test login
        attemptOfflineLogin(id, password, role);
    } finally {
        setButtonLoading(loginBtn, false);
    }
}

function attemptOfflineLogin(id, password, role) {
    const testUsers = {
        'AD001': { password: 'admin123', role: 'admin', name: 'System Admin', email: 'admin@school.edu', phone: '+254712345678' },
        'LT001': { password: 'lecturer123', role: 'lecturer', name: 'Dr. John Smith', email: 'john.smith@school.edu', phone: '+254723456789', department: 'Computer Science' },
        'ST001': { password: 'student123', role: 'student', name: 'Alice Johnson', email: 'alice@student.edu', phone: '+254734567890', course: 'Computer Science', year: 2 }
    };
    
    if (testUsers[id] && testUsers[id].password === password && testUsers[id].role === role) {
        showAlert('✅ Using offline login. Redirecting...', 'success');
        
        localStorage.setItem('attendance_session', JSON.stringify({
            user: testUsers[id],
            token: 'offline_token',
            expires: Date.now() + (7 * 24 * 60 * 60 * 1000)
        }));
        
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
    } else {
        showAlert('❌ Invalid credentials. Try: AD001/admin123 (admin), LT001/lecturer123 (lecturer), ST001/student123 (student)', 'error');
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

    // Show loading
    setButtonLoading(registerBtn, true);

    try {
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
            userData.course = document.getElementById('regCourse').value || '';
            userData.year = document.getElementById('regYear').value || 1;
        } else if (role === 'lecturer') {
            userData.department = document.getElementById('regDepartment').value || '';
        }

        console.log('Sending register request:', userData);

        const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        });

        const data = await response.json();

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
        setButtonLoading(registerBtn, false);
    }
}

async function initializeSampleData() {
    if (!confirm('This will initialize sample data. Continue?')) {
        return;
    }

    const initBtn = document.getElementById('initSampleBtn');
    setButtonLoading(initBtn, true);

    try {
        const response = await fetch(`${API_BASE_URL}/api/init-sample-data`, {
            method: 'POST'
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showAlert('✅ Sample data initialized! You can now login with test credentials.', 'success');
            
            // Update sample credentials display
            const sampleInfo = document.querySelector('.sample-data-info');
            if (sampleInfo) {
                sampleInfo.innerHTML = `
                    <p><strong>✅ Sample Users Created:</strong></p>
                    <ul>
                        <li><strong>Admin:</strong> ID: AD001, Password: admin123</li>
                        <li><strong>Lecturer:</strong> ID: LT001, Password: lecturer123</li>
                        <li><strong>Student:</strong> ID: ST001, Password: student123</li>
                    </ul>
                `;
            }
            
            // Switch to login tab
            setTimeout(() => {
                switchTab('login');
            }, 2000);
        } else {
            throw new Error(data.message || 'Failed to initialize sample data');
        }
    } catch (error) {
        console.error('Init error:', error);
        showAlert('⚠️ Using hardcoded test data instead.', 'warning');
        
        // Show test credentials anyway
        const sampleInfo = document.querySelector('.sample-data-info');
        if (sampleInfo) {
            sampleInfo.innerHTML = `
                <p><strong>Test Credentials:</strong></p>
                <ul>
                    <li><strong>Admin:</strong> ID: AD001, Password: admin123</li>
                    <li><strong>Lecturer:</strong> ID: LT001, Password: lecturer123</li>
                    <li><strong>Student:</strong> ID: ST001, Password: student123</li>
                </ul>
            `;
        }
    } finally {
        setButtonLoading(initBtn, false);
    }
}

function checkExistingSession() {
    const sessionData = localStorage.getItem('attendance_session');
    
    if (sessionData) {
        try {
            const session = JSON.parse(sessionData);
            
            // Check if session is expired
            if (Date.now() > session.expires) {
                localStorage.removeItem('attendance_session');
                return;
            }

            currentUser = session.user;
            currentToken = session.token;

            // Redirect to dashboard if already logged in
            if (window.location.pathname.includes('login.html') || 
                window.location.pathname === '/' || 
                window.location.pathname.includes('index.html')) {
                window.location.href = 'dashboard.html';
            }
        } catch (e) {
            console.error('Error parsing session:', e);
            localStorage.removeItem('attendance_session');
        }
    }
}

function setButtonLoading(button, isLoading) {
    if (!button) return;
    
    const btnText = button.querySelector('.btn-text');
    const btnSpinner = button.querySelector('.btn-spinner');
    
    if (isLoading) {
        if (btnText) btnText.style.display = 'none';
        if (btnSpinner) btnSpinner.style.display = 'inline-block';
        button.disabled = true;
        button.classList.add('loading');
    } else {
        if (btnText) btnText.style.display = 'inline-block';
        if (btnSpinner) btnSpinner.style.display = 'none';
        button.disabled = false;
        button.classList.remove('loading');
    }
}

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
    logout: function() {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('attendance_session');
            window.location.href = 'index.html';
        }
    },
    showAlert,
    API_BASE_URL
};
