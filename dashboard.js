import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

const Dashboard = () => {
  // State with proper initialization
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);
  const [activeUsers, setActiveUsers] = useState(0);

  const API_BASE_URL = 'https://rti-trading-backend-production.up.railway.app/api';
  const SOCKET_URL = 'https://rti-trading-backend-production.up.railway.app';

  // Error handler
  const handleError = (error, context) => {
    console.error(`Error in ${context}:`, error);
    setError(error.message || 'An unexpected error occurred');
    return null;
  };

  // Safe fetch wrapper
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

  // Fetch alerts
  const fetchAlerts = async () => {
    setIsLoading(true);

    const token = localStorage.getItem('authToken');
    if (!token) {
      setError("You're not logged in.");
      setIsLoading(false);
      return;
    }

    const data = await safeFetch(`${API_BASE_URL}/alerts?type=ALL`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (data) {
      try {
        if (Array.isArray(data.alerts)) {
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

  // Fetch active users
  const fetchActiveUsers = async () => {
    const data = await safeFetch(`${API_BASE_URL}/users/active`);
    if (data && typeof data.count === 'number') {
      setActiveUsers(data.count);
    }
  };

  // Socket init
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

  const getFilteredAlerts = (type) => {
    try {
      return Array.isArray(alerts)
        ? alerts.filter(alert => alert && alert.type === type)
        : [];
    } catch (error) {
      handleError(error, 'filtering alerts');
      return [];
    }
  };

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

  // UI: Loading
  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading dashboard data...</p>
      </div>
    );
  }

  // UI: Error
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
          }}>Reconnect</button>
        </div>
      </div>
    );
  }

  // UI: Dashboard
  return (
    <div className="dashboard-container">
      <h2>📡 Active Users: {activeUsers}</h2>
      <h3>🚨 Latest Alerts</h3>
      <ul className="alert-list">
        {getFilteredAlerts('ALL').map((alert, i) => (
          <li key={i} className="alert-item">
            <strong>[{alert.type}]</strong> {alert.message}
          </li>
        ))}
      </ul>
    </div>
  );
};

// Error Boundary wrapper
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

// Export with boundary
export default function SafeDashboard() {
  return (
    <DashboardErrorBoundary>
      <Dashboard />
    </DashboardErrorBoundary>
  );
}
