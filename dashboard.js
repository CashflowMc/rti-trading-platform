// 📁 FILE: rti-trading-platform/js/dashboard.js
// Trading Dashboard JavaScript - PRODUCTION READY WITH PHP PROXY

// 🛡️ UPDATED CONFIGURATION - PHP PROXY SYSTEM
const PROXY_URL = 'https://cashflowops.pro/api-proxy.php';
const API_BASE_URL = 'https://rti-trading-backend-production.up.railway.app/api';

// Global variables
let currentUser = null;
let socket = null;
let currentFilter = 'ALL';
let allAlerts = [];
let allUsers = [];

// DOM Elements
const successMessage = document.getElementById('successMessage');
const successText = document.getElementById('successText');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const upgradeBanner = document.getElementById('upgradeBanner');
const adminPanel = document.getElementById('adminPanel');
const adminPanelSection = document.getElementById('adminPanelSection');
const userProfile = document.getElementById('userProfile');
const userAvatar = document.getElementById('userAvatar');
const username = document.getElementById('username');
const userTier = document.getElementById('userTier');
const alertsContainer = document.getElementById('alertsContainer');
const loadingAlerts = document.getElementById('loadingAlerts');
const alertsPaywall = document.getElementById('alertsPaywall');
const blurredAlerts = document.getElementById('blurredAlerts');
const activeUsers = document.getElementById('activeUsers');
const userCount = document.getElementById('userCount');
const usersPaywall = document.getElementById('usersPaywall');
const hiddenUserCount = document.getElementById('hiddenUserCount');
const marketData = document.getElementById('marketData');
const marketPaywall = document.getElementById('marketPaywall');
const marketLimitedBadge = document.getElementById('marketLimitedBadge');

// 🛡️ PHP PROXY FETCH FUNCTION - BYPASSES CORS
const proxyFetch = async (endpoint, options = {}) => {
    const token = localStorage.getItem('token');
    
    // Clean endpoint (remove leading /api if present)
    const cleanEndpoint = endpoint.replace(/^\/api\//, '').replace(/^\//, '');
    
    const defaultHeaders = {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };

    const config = {
        method: 'GET',
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers
        }
    };

    // Build proxy URL
    const proxyEndpoint = `${PROXY_URL}?endpoint=${encodeURIComponent(cleanEndpoint)}`;
    
    console.log(`🔄 Proxy request: ${config.method} ${cleanEndpoint}`);
    
    const response = await fetch(proxyEndpoint, config);
    
    // Handle auth errors
    if (response.status === 401) {
        console.log('🔑 Unauthorized - clearing token');
        localStorage.removeItem('token');
        window.location.href = 'index.html';
        return;
    }
    
    return response;
};

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Dashboard loaded with PHP Proxy');
    
    // Check for payment success
    checkPaymentSuccess();
    
    // Load user profile
    await loadUserProfile();
    
    // Check if user is logged in
    if (!currentUser) {
        window.location.href = 'index.html';
        return;
    }
    
    // Check subscription status - redirect if no subscription on file
    if (requiresSubscriptionSelection()) {
        console.log('🔒 User needs to select subscription plan');
        showSubscriptionRequiredMessage();
        setTimeout(() => {
            window.location.href = 'subscription.html';
        }, 3000);
        return;
    }
    
    // Update UI based on user tier
    updateUIForUserTier();
    
    // Initialize Socket.IO
    initializeSocket();
    
    // Load data
    await Promise.all([
        fetchAlerts(),
        fetchActiveUsers(),
        fetchMarketData()
    ]);
    
    // Set up real-time market updates
    setInterval(fetchMarketData, 30000);
});

// Check if user requires subscription selection
function requiresSubscriptionSelection() {
    if (!currentUser) return false;
    
    // Admins can always access
    if (currentUser.isAdmin) return false;
    
    // Check if user is on FREE tier and has never had a subscription
    const hasNeverSubscribed = !currentUser.subscriptionId && 
                              !currentUser.subscriptionStatus && 
                              currentUser.tier === 'FREE';
    
    return hasNeverSubscribed;
}

// Show subscription required message
function showSubscriptionRequiredMessage() {
    // Hide all dashboard content
    document.getElementById('alertsContainer').innerHTML = '';
    document.getElementById('activeUsers').innerHTML = '';
    document.getElementById('marketData').innerHTML = '';
    
    // Show subscription required overlay
    const subscriptionOverlay = createSubscriptionOverlay();
    document.body.appendChild(subscriptionOverlay);
}

// Create subscription required overlay
function createSubscriptionOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    overlay.id = 'subscriptionOverlay';
    
    overlay.innerHTML = `
        <div class="bg-white rounded-lg p-8 max-w-md mx-4 text-center shadow-2xl">
            <div class="text-6xl mb-4">🔒</div>
            <h2 class="text-2xl font-bold text-gray-900 mb-4">
                Subscription Required
            </h2>
            <p class="text-gray-600 mb-6">
                To access the trading dashboard and all its features, please select a subscription plan.
            </p>
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p class="text-sm text-blue-800">
                    <strong>What you'll get:</strong><br>
                    • Full group access<br>
                    • Unlimited live alerts<br>
                    • Real-time market data<br>
                    • Direct trader access
                </p>
            </div>
            <div class="flex gap-3">
                <button onclick="redirectToSubscription()" class="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">
                    Choose Plan
                </button>
                <button onclick="logout()" class="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors">
                    Logout
                </button>
            </div>
            <p class="text-xs text-gray-500 mt-4">
                Redirecting to subscription page in <span id="countdown">3</span> seconds...
            </p>
        </div>
    `;
    
    // Start countdown
    let countdown = 3;
    const countdownElement = overlay.querySelector('#countdown');
    const countdownInterval = setInterval(() => {
        countdown--;
        if (countdownElement) {
            countdownElement.textContent = countdown;
        }
        if (countdown <= 0) {
            clearInterval(countdownInterval);
        }
    }, 1000);
    
    return overlay;
}

// Redirect to subscription page
function redirectToSubscription() {
    window.location.href = 'subscription.html';
}

// Check for payment success
function checkPaymentSuccess() {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    
    if (sessionId) {
        showSuccess('🎉 Subscription activated! Welcome to full access!');
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// Load user profile
async function loadUserProfile() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('No token found');
            return;
        }

        const response = await apiCall('/auth/profile');
        currentUser = response;
        
        // Update UI
        if (userAvatar) userAvatar.src = currentUser.avatar;
        if (username) username.textContent = currentUser.username;
        if (userTier) {
            userTier.textContent = currentUser.tier === 'FREE' ? 'FREE TIER' : currentUser.tier;
            userTier.className = `text-xs ${getTierStyles(currentUser.tier)}`;
        }
        
        console.log('👤 User loaded:', currentUser);
        
    } catch (error) {
        console.error('Error loading user profile:', error);
        localStorage.removeItem('token');
    }
}

// Get tier styling
function getTierStyles(tier) {
    switch (tier) {
        case 'ADMIN':
            return 'text-red-600';
        case 'MONTHLY':
            return 'text-green-600';
        case 'WEEKLY':
            return 'text-blue-600';
        default:
            return 'text-gray-500';
    }
}

// Update UI based on user tier
function updateUIForUserTier() {
    if (!currentUser) return;
    
    const isPaidUser = currentUser.tier === 'WEEKLY' || currentUser.tier === 'MONTHLY';
    
    // Show/hide upgrade banner
    if (currentUser.tier === 'FREE') {
        if (upgradeBanner) upgradeBanner.classList.remove('hidden');
    }
    
    // Show admin panel for admins
    if (currentUser.isAdmin) {
        if (adminPanel) adminPanel.classList.remove('hidden');
    }
    
    // Show limited badge for free users
    if (!isPaidUser && !currentUser.isAdmin) {
        if (marketLimitedBadge) marketLimitedBadge.classList.remove('hidden');
    }
}

// Initialize Socket.IO connection
function initializeSocket() {
    if (!currentUser) return;
    
    socket = io(API_BASE_URL.replace('/api', ''));
    
    socket.on('connect', () => {
        console.log('📡 Connected to server');
        socket.emit('joinTradingRoom', currentUser.id);
    });

    socket.on('newAlert', (alert) => {
        console.log('🚨 New alert received:', alert);
        allAlerts.unshift(alert);
        displayAlerts();
    });

    socket.on('alertDeleted', (alertId) => {
        console.log('🗑️ Alert deleted:', alertId);
        allAlerts = allAlerts.filter(alert => alert._id !== alertId);
        displayAlerts();
    });

    socket.on('marketUpdate', (data) => {
        console.log('📊 Market update:', data);
        // Handle real-time market updates
    });

    socket.on('disconnect', () => {
        console.log('📡 Disconnected from server');
    });
}

// 🔧 FIXED: Fetch alerts with proper error handling
async function fetchAlerts() {
    try {
        if (loadingAlerts) loadingAlerts.style.display = 'block';
        
        const alertsResponse = await apiCall(`/alerts?type=${currentFilter}`);
        
        // Handle different response formats - FIXES alerts.filter ERROR
        if (Array.isArray(alertsResponse)) {
            allAlerts = alertsResponse;
        } else if (alertsResponse && Array.isArray(alertsResponse.alerts)) {
            allAlerts = alertsResponse.alerts;
        } else if (alertsResponse && alertsResponse.data && Array.isArray(alertsResponse.data)) {
            allAlerts = alertsResponse.data;
        } else {
            console.warn('⚠️ Unexpected alerts response format:', alertsResponse);
            allAlerts = [];
        }
        
        console.log('🚨 Alerts loaded:', allAlerts.length);
        displayAlerts();
        
    } catch (error) {
        console.error('Error fetching alerts:', error);
        allAlerts = []; // Ensure allAlerts is always an array
        showError('Failed to fetch alerts');
    } finally {
        if (loadingAlerts) loadingAlerts.style.display = 'none';
    }
}

// Display alerts
function displayAlerts() {
    if (!alertsContainer) return;
    
    const isPaidUser = currentUser.tier === 'WEEKLY' || currentUser.tier === 'MONTHLY' || currentUser.isAdmin;
    
    // Ensure allAlerts is always an array
    if (!Array.isArray(allAlerts)) {
        console.warn('⚠️ allAlerts is not an array, resetting:', allAlerts);
        allAlerts = [];
    }
    
    if (allAlerts.length === 0) {
        alertsContainer.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                No alerts found. ${currentUser.isAdmin ? 'Create one using the admin panel above!' : ''}
            </div>
        `;
        return;
    }
    
    // Show limited alerts for free users
    const displayAlerts = isPaidUser ? allAlerts : allAlerts.slice(0, 3);
    
    alertsContainer.innerHTML = displayAlerts.map(alert => `
        <div class="bg-white rounded-lg shadow-sm border-l-4 p-6 ${getPriorityBorder(alert.priority)}">
            <div class="flex items-start justify-between">
                <div class="flex-1">
                    <div class="flex items-center gap-3 mb-2">
                        <span class="text-xl">${getAlertIcon(alert.type)}</span>
                        <div>
                            <h3 class="font-bold text-gray-900">${alert.title}</h3>
                            ${alert.botName ? `<p class="text-sm text-blue-600 font-medium">${alert.botName}</p>` : ''}
                        </div>
                    </div>
                    
                    <p class="text-gray-700 mb-3">${alert.message}</p>
                    
                    ${alert.pnl ? `
                        <div class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getPnlStyles(alert.pnl)}">
                            ${alert.pnl.includes('+') ? '📈' : '📉'}
                            ${alert.pnl}
                        </div>
                    ` : ''}
                </div>
                
                <div class="text-right ml-4">
                    <div class="flex items-center gap-2">
                        <span>🕐</span>
                        <span class="text-sm text-gray-500">${formatTimeAgo(alert.createdAt)}</span>
                        ${currentUser.isAdmin ? `
                            <button onclick="deleteAlert('${alert._id}')" class="p-1 text-red-400 hover:text-red-600">
                                🗑️
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    
    // Show paywall for free users if there are more alerts
    if (!isPaidUser && allAlerts.length > 3 && blurredAlerts && alertsPaywall) {
        // Create blurred preview
        const previewAlerts = allAlerts.slice(3, 6);
        blurredAlerts.innerHTML = previewAlerts.map(alert => `
            <div class="bg-white rounded-lg shadow-sm border-l-4 border-gray-300 p-6 mb-4">
                <div class="flex items-start justify-between">
                    <div class="flex-1">
                        <div class="flex items-center gap-3 mb-2">
                            <span class="text-xl">🔔</span>
                            <h3 class="font-bold text-gray-900">${alert.title}</h3>
                        </div>
                        <p class="text-gray-700">${alert.message}</p>
                    </div>
                </div>
            </div>
        `).join('');
        
        alertsPaywall.classList.remove('hidden');
    } else if (alertsPaywall) {
        alertsPaywall.classList.add('hidden');
    }
}

// Get alert priority border
function getPriorityBorder(priority) {
    switch (priority) {
        case 'HIGH': return 'border-red-500';
        case 'MEDIUM': return 'border-yellow-500';
        default: return 'border-gray-300';
    }
}

// Get alert icon
function getAlertIcon(type) {
    switch (type) {
        case 'BOT_SIGNAL': return '🤖';
        case 'MARKET_UPDATE': return '📊';
        default: return '🔔';
    }
}

// Get P&L styles
function getPnlStyles(pnl) {
    return pnl.includes('+') ? 
        'bg-green-100 text-green-800' : 
        'bg-red-100 text-red-800';
}

// Format time ago
function formatTimeAgo(timestamp) {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
}

// Filter alerts
function filterAlerts(type) {
    currentFilter = type;
    
    // Update filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        if (btn.dataset.filter === type) {
            btn.className = 'filter-btn px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-500 text-white';
        } else {
            btn.className = 'filter-btn px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300';
        }
    });
    
    fetchAlerts();
}

// 🔧 FIXED: Fetch active users with proper error handling
async function fetchActiveUsers() {
    try {
        const usersResponse = await apiCall('/users/active');
        
        // Handle different response formats
        if (Array.isArray(usersResponse)) {
            allUsers = usersResponse;
        } else if (usersResponse && Array.isArray(usersResponse.users)) {
            allUsers = usersResponse.users;
        } else if (usersResponse && usersResponse.data && Array.isArray(usersResponse.data)) {
            allUsers = usersResponse.data;
        } else {
            console.warn('⚠️ Unexpected users response format:', usersResponse);
            allUsers = [];
        }
        
        console.log('👥 Active users loaded:', allUsers.length);
        displayActiveUsers();
        
    } catch (error) {
        console.error('Error fetching active users:', error);
        allUsers = []; // Ensure allUsers is always an array
    }
}

// Display active users
function displayActiveUsers() {
    if (!activeUsers || !userCount) return;
    
    const isPaidUser = currentUser.tier === 'WEEKLY' || currentUser.tier === 'MONTHLY' || currentUser.isAdmin;
    
    // Ensure allUsers is always an array
    if (!Array.isArray(allUsers)) {
        console.warn('⚠️ allUsers is not an array, resetting:', allUsers);
        allUsers = [];
    }
    
    const displayUsers = isPaidUser ? allUsers : allUsers.slice(0, 3);
    
    userCount.textContent = allUsers.length;
    
    if (displayUsers.length === 0) {
        activeUsers.innerHTML = '<div class="text-center py-4 text-gray-500">No active users</div>';
        return;
    }
    
    activeUsers.innerHTML = displayUsers.map(user => `
        <div class="flex items-center gap-3">
            <div class="relative">
                <img src="${user.avatar}" alt="" class="w-10 h-10 rounded-full">
                <div class="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white bg-green-500"></div>
            </div>
            <div class="flex-1">
                <p class="font-medium text-gray-900 text-sm">${user.username}</p>
                <span class="text-xs px-2 py-0.5 rounded ${getTierBadgeStyles(user.tier)}">
                    ${user.tier}
                </span>
            </div>
        </div>
    `).join('');
    
    // Show hidden user count for free users
    if (!isPaidUser && allUsers.length > 3 && hiddenUserCount && usersPaywall) {
        hiddenUserCount.textContent = allUsers.length - 3;
        usersPaywall.classList.remove('hidden');
    } else if (usersPaywall) {
        usersPaywall.classList.add('hidden');
    }
}

// Get tier badge styles
function getTierBadgeStyles(tier) {
    switch (tier) {
        case 'MONTHLY': return 'bg-green-100 text-green-800';
        case 'WEEKLY': return 'bg-blue-100 text-blue-800';
        case 'ADMIN': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

// Fetch market data
async function fetchMarketData() {
    const isPaidUser = currentUser.tier === 'WEEKLY' || currentUser.tier === 'MONTHLY' || currentUser.isAdmin;
    
    if (!isPaidUser) {
        if (marketData) marketData.classList.add('hidden');
        if (marketPaywall) marketPaywall.classList.remove('hidden');
        return;
    }
    
    try {
        const data = await apiCall('/market/data');
        
        if (marketData && data && typeof data === 'object') {
            marketData.innerHTML = Object.entries(data).map(([symbol, info]) => `
                <div class="flex justify-between items-center">
                    <span class="font-medium text-gray-900">${symbol}</span>
                    <div class="text-right">
                        <div class="font-bold text-gray-900">
                            $${typeof info.price === 'number' ? info.price.toFixed(2) : 'N/A'}
                        </div>
                        <div class="text-xs ${info.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}">
                            ${info.changePercent >= 0 ? '+' : ''}${typeof info.changePercent === 'number' ? info.changePercent.toFixed(2) : '0.00'}%
                        </div>
                    </div>
                </div>
            `).join('');
            
            marketData.classList.remove('hidden');
        }
        if (marketPaywall) marketPaywall.classList.add('hidden');
        
    } catch (error) {
        console.error('Error fetching market data:', error);
        if (error.message.includes('Subscription required')) {
            if (marketData) marketData.classList.add('hidden');
            if (marketPaywall) marketPaywall.classList.remove('hidden');
        }
    }
}

// Admin functions
function toggleAdminPanel() {
    if (adminPanelSection) {
        adminPanelSection.classList.toggle('hidden');
    }
}

async function createAlert() {
    if (!currentUser.isAdmin) return;
    
    const createBtn = document.getElementById('createAlertText');
    const originalText = createBtn ? createBtn.textContent : '';
    
    try {
        if (createBtn) createBtn.textContent = 'Creating...';
        
        const alertData = {
            title: document.getElementById('alertTitle')?.value || '',
            message: document.getElementById('alertMessage')?.value || '',
            type: document.getElementById('alertType')?.value || 'NEWS',
            priority: document.getElementById('alertPriority')?.value || 'MEDIUM',
            botName: document.getElementById('alertBotName')?.value || null,
            pnl: document.getElementById('alertPnl')?.value || null
        };
        
        if (!alertData.title || !alertData.message) {
            showError('Title and message are required');
            return;
        }
        
        await apiCall('/alerts', {
            method: 'POST',
            body: JSON.stringify(alertData)
        });
        
        // Clear form
        const fields = ['alertTitle', 'alertMessage', 'alertBotName', 'alertPnl'];
        fields.forEach(field => {
            const element = document.getElementById(field);
            if (element) element.value = '';
        });
        
        showSuccess('Alert created successfully!');
        
    } catch (error) {
        console.error('Error creating alert:', error);
        showError('Failed to create alert');
    } finally {
        if (createBtn) createBtn.textContent = originalText;
    }
}

async function deleteAlert(alertId) {
    if (!currentUser.isAdmin) return;
    
    try {
        await apiCall(`/alerts/${alertId}`, { method: 'DELETE' });
        showSuccess('Alert deleted successfully!');
    } catch (error) {
        console.error('Error deleting alert:', error);
        showError('Failed to delete alert');
    }
}

// 🛡️ UPDATED: API Call function using PHP Proxy
async function apiCall(endpoint, options = {}) {
    try {
        const response = await proxyFetch(endpoint, options);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Network Error' }));
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('❌ API call failed:', error);
        throw error;
    }
}

function showSuccess(message) {
    if (successText && successMessage) {
        successText.textContent = message;
        successMessage.classList.remove('hidden');
        setTimeout(() => {
            successMessage.classList.add('hidden');
        }, 5000);
    }
}

function showError(message) {
    if (errorText && errorMessage) {
        errorText.textContent = message;
        errorMessage.classList.remove('hidden');
        setTimeout(() => {
            errorMessage.classList.add('hidden');
        }, 5000);
    }
}

function hideError() {
    if (errorMessage) {
        errorMessage.classList.add('hidden');
    }
}

function logout() {
    localStorage.removeItem('token');
    if (socket) {
        socket.disconnect();
    }
    window.location.href = 'index.html';
}

// Test functions for browser console
window.testProxy = async () => {
    console.log('🧪 Testing PHP proxy with trading platform...');
    
    try {
        const result = await apiCall('/auth/profile');
        console.log('✅ Proxy test successful:', result);
        alert('✅ PHP Proxy is working with your trading platform!');
        return true;
    } catch (error) {
        console.error('❌ Proxy test failed:', error);
        alert('❌ Proxy failed: ' + error.message);
        return false;
    }
};

// Make functions globally available
window.filterAlerts = filterAlerts;
window.toggleAdminPanel = toggleAdminPanel;
window.createAlert = createAlert;
window.deleteAlert = deleteAlert;
window.hideError = hideError;
window.logout = logout;
window.redirectToSubscription = redirectToSubscription;
window.testProxy = testProxy;

console.log('📦 Production Trading Dashboard.js loaded with PHP Proxy system ✅');
console.log('🧪 Run testProxy() in console to test connection');
