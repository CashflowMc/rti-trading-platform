// 📁 FILE: rti-trading-platform/js/dashboard.js
// Trading Dashboard JavaScript - PRODUCTION READY

// Configuration - UPDATED FOR PRODUCTION
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

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Dashboard loaded');
    
    // Check for payment success
    checkPaymentSuccess();
    
    // Load user profile
    await loadUserProfile();
    
    // Check if user is logged in
    if (!currentUser) {
        window.location.href = 'index.html';
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
        userAvatar.src = currentUser.avatar;
        username.textContent = currentUser.username;
        userTier.textContent = currentUser.tier === 'FREE' ? 'FREE TIER' : currentUser.tier;
        userTier.className = `text-xs ${getTierStyles(currentUser.tier)}`;
        
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
        upgradeBanner.classList.remove('hidden');
    }
    
    // Show admin panel for admins
    if (currentUser.isAdmin) {
        adminPanel.classList.remove('hidden');
    }
    
    // Show limited badge for free users
    if (!isPaidUser && !currentUser.isAdmin) {
        marketLimitedBadge.classList.remove('hidden');
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

// Fetch alerts
async function fetchAlerts() {
    try {
        loadingAlerts.style.display = 'block';
        const alerts = await apiCall(`/alerts?type=${currentFilter}`);
        allAlerts = alerts;
        displayAlerts();
    } catch (error) {
        console.error('Error fetching alerts:', error);
        showError('Failed to fetch alerts');
    } finally {
        loadingAlerts.style.display = 'none';
    }
}

// Display alerts
function displayAlerts() {
    const isPaidUser = currentUser.tier === 'WEEKLY' || currentUser.tier === 'MONTHLY' || currentUser.isAdmin;
    
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
    if (!isPaidUser && allAlerts.length > 3) {
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
    } else {
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

// Fetch active users
async function fetchActiveUsers() {
    try {
        const users = await apiCall('/users/active');
        allUsers = users;
        displayActiveUsers();
    } catch (error) {
        console.error('Error fetching active users:', error);
    }
}

// Display active users
function displayActiveUsers() {
    const isPaidUser = currentUser.tier === 'WEEKLY' || currentUser.tier === 'MONTHLY' || currentUser.isAdmin;
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
    if (!isPaidUser && allUsers.length > 3) {
        hiddenUserCount.textContent = allUsers.length - 3;
        usersPaywall.classList.remove('hidden');
    } else {
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
        marketData.classList.add('hidden');
        marketPaywall.classList.remove('hidden');
        return;
    }
    
    try {
        const data = await apiCall('/market/data');
        
        marketData.innerHTML = Object.entries(data).map(([symbol, info]) => `
            <div class="flex justify-between items-center">
                <span class="font-medium text-gray-900">${symbol}</span>
                <div class="text-right">
                    <div class="font-bold text-gray-900">
                        $${info.price.toFixed(2)}
                    </div>
                    <div class="text-xs ${info.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}">
                        ${info.changePercent >= 0 ? '+' : ''}${info.changePercent.toFixed(2)}%
                    </div>
                </div>
            </div>
        `).join('');
        
        marketData.classList.remove('hidden');
        marketPaywall.classList.add('hidden');
        
    } catch (error) {
        console.error('Error fetching market data:', error);
        if (error.message.includes('Subscription required')) {
            marketData.classList.add('hidden');
            marketPaywall.classList.remove('hidden');
        }
    }
}

// Admin functions
function toggleAdminPanel() {
    adminPanelSection.classList.toggle('hidden');
}

async function createAlert() {
    if (!currentUser.isAdmin) return;
    
    const createBtn = document.getElementById('createAlertText');
    const originalText = createBtn.textContent;
    
    try {
        createBtn.textContent = 'Creating...';
        
        const alertData = {
            title: document.getElementById('alertTitle').value,
            message: document.getElementById('alertMessage').value,
            type: document.getElementById('alertType').value,
            priority: document.getElementById('alertPriority').value,
            botName: document.getElementById('alertBotName').value || null,
            pnl: document.getElementById('alertPnl').value || null
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
        document.getElementById('alertTitle').value = '';
        document.getElementById('alertMessage').value = '';
        document.getElementById('alertBotName').value = '';
        document.getElementById('alertPnl').value = '';
        
        showSuccess('Alert created successfully!');
        
    } catch (error) {
        console.error('Error creating alert:', error);
        showError('Failed to create alert');
    } finally {
        createBtn.textContent = originalText;
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

// Utility functions
async function apiCall(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers,
        ...options
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'API Error');
    }

    return response.json();
}

function showSuccess(message) {
    successText.textContent = message;
    successMessage.classList.remove('hidden');
    setTimeout(() => {
        successMessage.classList.add('hidden');
    }, 5000);
}

function showError(message) {
    errorText.textContent = message;
    errorMessage.classList.remove('hidden');
    setTimeout(() => {
        errorMessage.classList.add('hidden');
    }, 5000);
}

function hideError() {
    errorMessage.classList.add('hidden');
}

function logout() {
    localStorage.removeItem('token');
    if (socket) {
        socket.disconnect();
    }
    window.location.href = 'index.html';
}

// Make functions globally available
window.filterAlerts = filterAlerts;
window.toggleAdminPanel = toggleAdminPanel;
window.createAlert = createAlert;
window.deleteAlert = deleteAlert;
window.hideError = hideError;
window.logout = logout;

console.log('📦 Dashboard.js loaded successfully');
