// dashboard.js - Complete Working Version with Alerts Fix

// ======================
// INITIALIZATION
// ======================
document.addEventListener('DOMContentLoaded', function() {
  console.log('RTi Dashboard Initializing...');

  // State variables
  let authToken = localStorage.getItem('authToken') || null;
  let currentUser = JSON.parse(localStorage.getItem('userInfo')) || null;
  let alerts = []; // Initialize alerts as empty array (FIXED)

  // DOM Elements
  const loginForm = document.querySelector('#login-form');
  const dashboard = document.querySelector('#dashboard');
  const alertsContainer = document.querySelector('#alerts-container');
  const usernameDisplay = document.querySelector('#username-display');

  // ======================
  // AUTHENTICATION FUNCTIONS
  // ======================
  async function handleLogin(credentials = {}) {
    const username = credentials.username || 'admin';
    const password = credentials.password || 'password';

    console.log('Attempting login with:', { username });

    try {
      // Show loading state
      const loginBtn = document.querySelector('#login-btn');
      if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.textContent = 'Authenticating...';
      }

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        throw new Error(`Login failed: ${response.status}`);
      }

      const data = await response.json();
      authToken = data.token;
      currentUser = data.user;

      // Store in localStorage
      localStorage.setItem('authToken', authToken);
      localStorage.setItem('userInfo', JSON.stringify(currentUser));

      // Initialize dashboard
      initializeDashboard();

      return true;
    } catch (error) {
      console.error('Login error:', error);
      showErrorMessage(error.message);
      return false;
    } finally {
      const loginBtn = document.querySelector('#login-btn');
      if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Login';
      }
    }
  }

  // ======================
  // DASHBOARD FUNCTIONS (WITH ALERTS FIX)
  // ======================
  async function fetchAlerts() {
    if (!authToken) return;
    
    console.log('Fetching alerts...');
    
    try {
      const response = await fetch('/api/alerts', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch alerts: ${response.status}`);
      }

      const data = await response.json();
      
      // FIX: Ensure alerts is always an array
      alerts = Array.isArray(data.alerts) ? data.alerts : [];
      renderAlerts();

    } catch (error) {
      console.error('Alerts fetch error:', error);
      alerts = []; // Reset to empty array on error
      renderAlerts(error.message);
    }
  }

  function renderAlerts(error = null) {
    if (!alertsContainer) return;

    // Clear previous content
    alertsContainer.innerHTML = '';

    if (error) {
      alertsContainer.innerHTML = `
        <div class="alert-error">
          Error loading alerts: ${error}
        </div>
      `;
      return;
    }

    // FIXED: Safe filtering of alerts
    const filteredAlerts = alerts.filter(alert => {
      return alert && alert.priority === 'high';
    });

    if (filteredAlerts.length === 0) {
      alertsContainer.innerHTML = `
        <div class="no-alerts">
          No high priority alerts found
        </div>
      `;
      return;
    }

    filteredAlerts.forEach(alert => {
      const alertElement = document.createElement('div');
      alertElement.className = 'alert-item';
      alertElement.innerHTML = `
        <h4>${alert.title || 'No title'}</h4>
        <p>${alert.message || 'No message'}</p>
        <small>${new Date(alert.timestamp).toLocaleString()}</small>
      `;
      alertsContainer.appendChild(alertElement);
    });
  }

  // ======================
  // DASHBOARD INITIALIZATION
  // ======================
  function initializeDashboard() {
    console.log('Initializing dashboard...');

    // Hide login form, show dashboard
    if (loginForm) loginForm.style.display = 'none';
    if (dashboard) dashboard.style.display = 'block';

    // Update user display
    if (usernameDisplay && currentUser) {
      usernameDisplay.textContent = currentUser.username;
    }

    // Load initial data
    fetchAlerts();

    // Set up periodic refresh
    setInterval(fetchAlerts, 300000); // 5 minutes
  }

  // ======================
  // UTILITY FUNCTIONS
  // ======================
  function showErrorMessage(message) {
    const errorElement = document.querySelector('.error-message') || 
      document.createElement('div');
    
    errorElement.className = 'error-message';
    errorElement.textContent = message;

    if (!errorElement.parentNode) {
      const container = loginForm || document.body;
      container.prepend(errorElement);
    }

    setTimeout(() => {
      errorElement.remove();
    }, 5000);
  }

  // ======================
  // EVENT LISTENERS
  // ======================
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const username = this.elements.username.value;
      const password = this.elements.password.value;
      handleLogin({ username, password });
    });
  }

  // ======================
  // INITIAL CHECK
  // ======================
  if (authToken && currentUser) {
    initializeDashboard();
  }

  console.log('Dashboard initialization complete');
});

// Debug exports
window.dashboardDebug = {
  reloadAlerts: function() {
    const event = new Event('DOMContentLoaded');
    document.dispatchEvent(event);
  },
  forceLogin: function(username, password) {
    document.querySelector('#username').value = username || 'admin';
    document.querySelector('#password').value = password || 'password';
    document.querySelector('#login-form').dispatchEvent(new Event('submit'));
  }
};
