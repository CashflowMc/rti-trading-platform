import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import io from 'socket.io-client';

const Dashboard = () => {
  // State with proper initialization
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);
  const [activeUsers, setActiveUsers] = useState(0);

  // API Configuration
  const API_BASE_URL = 'https://rti-trading-backend-production.up.railway.app/api';
  const SOCKET_URL = 'https://rti-trading-backend-production.up.railway.app';

  // Enhanced error handling wrapper
  const handleError = (error, context) => {
    console.error(`Error in ${context}:`, error);
    setError(error.message || 'An unexpected error occurred');
    return null;
  };

  // Safe API fetch with error handling
  const safeFetch = async (url, options = {}) => {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      return handleError(error, `fetching ${url}`);
    }
  };

  // Fetch alerts from API with error handling
  const fetchAlerts = async () => {
    setIsLoading(true);
    const data = await safeFetch(`${API_BASE_URL}/alerts?type=ALL`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });

    if (data) {
      try {
        // Validate alerts data structure
        if (data && Array.isArray(data.alerts)) {
          setAlerts(data.alerts);
        } else {
          throw new Error('Invalid alerts data structure');
        }
      } catch (error) {
        handleError(error, 'processing alerts data');
        setAlerts([]);
      }
    }
    setIsLoading(false);
  };

  // Fetch active users with error handling
  const fetchActiveUsers = async () => {
    const data = await safeFetch(`${API_BASE_URL}/users/active`);
    if (data && typeof data.count === 'number') {
      setActiveUsers(data.count);
    }
  };

  // Initialize socket connection with error handling
  const initSocket = () => {
    try {
      const newSocket = io(SOCKET_URL, {
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        transports: ['websocket'],
        timeout: 5000
      });

      newSocket.on('connect', () => {
        console.log('Socket connected');
      });

      newSocket.on('connect_error', (err) => {
        handleError(err, 'socket connection');
      });

      newSocket.on('newAlert', (alert) => {
        setAlerts(prev => [alert, ...prev]);
      });

      newSocket.on('error', (err) => {
        handleError(err, 'socket error');
      });

      setSocket(newSocket);

      return () => {
        if (newSocket) newSocket.disconnect();
      };
    } catch (err) {
      handleError(err, 'socket initialization');
    }
  };

  // Safe filtering of alerts
  const getFilteredAlerts = (type) => {
    try {
      return Array.isArray(alerts) ? 
        alerts.filter(alert => alert && alert.type === type) : 
        [];
    } catch (error) {
      handleError(error, 'filtering alerts');
      return [];
    }
  };

  // Initial data loading
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      try {
        await Promise.all([
          fetchAlerts(),
          fetchActiveUsers()
        ]);
        
        if (isMounted) {
          initSocket();
        }
      } catch (error) {
        handleError(error, 'initial data loading');
      }
    };

    loadData();

    return () => {
      isMounted = false;
      if (socket) socket.disconnect();
    };
  }, []);

  // Render loading state
  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading dashboard data...</p>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="dashboard-error">
        <h3>Dashboard Error</h3>
        <p>{error}</p>
        <div className="error-actions">
          <button onClick={fetchAlerts}>Retry Alerts</button>
          <button onClick={fetchActiveUsers}>Retry Users</button>
          <button onClick={() => {
            setError(null);
            setIsLoading(true);
            initSocket();
          }}>Reconnect
          </button>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className="dashboard-container">
      {/* ... rest of your dashboard JSX ... */}
    </div>
  );
};

// Error Boundary for the Dashboard
class DashboardErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Dashboard Error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="dashboard-crash">
          <h2>Dashboard Crashed</h2>
          <p>{this.state.error.message}</p>
          <button onClick={this.handleReset}>Reset Dashboard</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Enhanced Dashboard export
export default function SafeDashboard() {
  return (
    <DashboardErrorBoundary>
      <Dashboard />
    </DashboardErrorBoundary>
  );
}
