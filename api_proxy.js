// 🚀 RTi Cashflowops - Node.js Proxy for Railway
// Replace your PHP file with this: api_proxy.js

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Railway API base URL
const RAILWAY_API_BASE = 'https://rti-trading-backend-production.up.railway.app/api';

// Debug logging
const debugLog = (message, data = null) => {
    console.log(`[RTi Proxy] ${message}`, data ? data : '');
};

// Proxy endpoint
app.all('/api_proxy', async (req, res) => {
    try {
        // Get request parameters from both GET and POST
        const endpoint = req.body.endpoint || req.query.endpoint || '';
        const method = req.body.method || req.query.method || 'GET';
        const data = req.body.data || null;
        const token = req.body.token || req.query.token || null;
        
        debugLog('🔄 Proxy Request', { 
            endpoint, 
            method, 
            hasToken: !!token,
            hasData: !!data 
        });

        // Validate endpoint
        if (!endpoint) {
            return res.status(400).json({
                error: 'Missing endpoint parameter',
                proxy_status: 'missing_endpoint'
            });
        }

        // Build full URL
        const url = RAILWAY_API_BASE + endpoint;
        debugLog('📡 Making request to', url);
        
        // Set up fetch options
        const fetchOptions = {
            method: method.toUpperCase(),
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'RTi-Proxy/1.0'
            }
        };

        // Add authorization header if token provided
        if (token) {
            fetchOptions.headers['Authorization'] = `Bearer ${token}`;
        }

        // Add body for POST/PUT requests
        if (data && (method.toUpperCase() === 'POST' || method.toUpperCase() === 'PUT')) {
            fetchOptions.body = data;
        }

        // Make the request to Railway backend
        const response = await fetch(url, fetchOptions);
        const responseData = await response.text();
        
        debugLog('✅ Railway Response', { 
            status: response.status, 
            ok: response.ok 
        });

        // Set the same status code
        res.status(response.status);
        
        // Try to parse as JSON, otherwise send as text
        try {
            const jsonData = JSON.parse(responseData);
            res.json(jsonData);
        } catch (e) {
            res.send(responseData);
        }

    } catch (error) {
        debugLog('❌ Proxy Error', error.message);
        res.status(500).json({
            error: 'Proxy error: ' + error.message,
            proxy_status: 'fetch_failed'
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        proxy: 'Node.js RTi Proxy',
        timestamp: new Date().toISOString()
    });
});

// Serve static files (your HTML dashboard)
app.use(express.static('.'));

// Start server
app.listen(PORT, () => {
    console.log(`🚀 RTi Proxy Server running on port ${PORT}`);
    console.log(`🛡️ Proxy endpoint: /api_proxy`);
    console.log(`❤️ Health check: /health`);
});

module.exports = app;
