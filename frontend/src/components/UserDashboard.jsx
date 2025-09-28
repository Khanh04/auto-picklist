import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Alert
} from '@mui/material';
import {
  Settings,
  TrendingUp,
  History,
  Business,
  ChevronRight,
  Refresh
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../utils/apiClient';

const UserDashboard = ({ onOpenPreferences }) => {
  const { user, isAuthenticated, preferences } = useAuth();
  const [supplierStats, setSupplierStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadUserData();
    }
  }, [isAuthenticated]);

  const loadUserData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load supplier preference statistics
      const stats = await apiClient.getSupplierPreferenceStats();
      setSupplierStats(stats);

      // Mock recent activity - in a real app, this would come from an API
      setRecentActivity([
        {
          id: 1,
          type: 'picklist_generated',
          description: 'Generated picklist for 45 items',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
        },
        {
          id: 2,
          type: 'preferences_updated',
          description: 'Updated supplier preferences',
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
        },
        {
          id: 3,
          type: 'picklist_generated',
          description: 'Generated picklist for 23 items',
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
        }
      ]);
    } catch (err) {
      console.error('Error loading user data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const diffMs = now - timestamp;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'picklist_generated':
        return <TrendingUp color="primary" />;
      case 'preferences_updated':
        return <Settings color="secondary" />;
      default:
        return <History color="action" />;
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Box sx={{ mb: 4 }}>
      <Grid container spacing={3}>
        {/* Welcome Card */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar
                  sx={{
                    width: 48,
                    height: 48,
                    bgcolor: 'primary.main',
                    mr: 2
                  }}
                >
                  {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    Welcome back, {user?.firstName}!
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Ready to generate your next optimized picklist?
                  </Typography>
                </Box>
              </Box>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              {/* Quick Stats */}
              {supplierStats && (
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                  <Chip
                    icon={<Business />}
                    label={`${supplierStats.totalPreferences || 0} Supplier Preferences`}
                    variant="outlined"
                  />
                  <Chip
                    icon={<TrendingUp />}
                    label={`${supplierStats.totalItems || 0} Items Learned`}
                    variant="outlined"
                  />
                </Box>
              )}

              <Button
                variant="outlined"
                startIcon={<Settings />}
                onClick={onOpenPreferences}
                size="small"
              >
                Manage Preferences
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Settings
              </Typography>

              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Use Database"
                    secondary="Default product matching"
                  />
                  <ListItemSecondaryAction>
                    <Chip
                      label={preferences?.picklist?.defaultUseDatabase ? 'ON' : 'OFF'}
                      color={preferences?.picklist?.defaultUseDatabase ? 'success' : 'default'}
                      size="small"
                    />
                  </ListItemSecondaryAction>
                </ListItem>

                <ListItem>
                  <ListItemText
                    primary="Intelligent Matching"
                    secondary="AI-powered optimization"
                  />
                  <ListItemSecondaryAction>
                    <Chip
                      label={preferences?.picklist?.defaultUseIntelligent ? 'ON' : 'OFF'}
                      color={preferences?.picklist?.defaultUseIntelligent ? 'success' : 'default'}
                      size="small"
                    />
                  </ListItemSecondaryAction>
                </ListItem>

                <ListItem button onClick={onOpenPreferences}>
                  <ListItemText
                    primary="View All Settings"
                    secondary="Customize your experience"
                  />
                  <ListItemSecondaryAction>
                    <ChevronRight />
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Recent Activity
                </Typography>
                <IconButton
                  onClick={loadUserData}
                  disabled={loading}
                  size="small"
                >
                  <Refresh />
                </IconButton>
              </Box>

              {recentActivity.length > 0 ? (
                <List>
                  {recentActivity.map((activity, index) => (
                    <React.Fragment key={activity.id}>
                      <ListItem>
                        <Box sx={{ mr: 2 }}>
                          {getActivityIcon(activity.type)}
                        </Box>
                        <ListItemText
                          primary={activity.description}
                          secondary={formatTimeAgo(activity.timestamp)}
                        />
                      </ListItem>
                      {index < recentActivity.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
                  No recent activity to show. Start by generating your first picklist!
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default UserDashboard;