import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Button,
  Typography,
  Alert,
  Divider,
  Grid,
  Avatar,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton
} from '@mui/material';
import {
  Person,
  Email,
  Edit,
  Save,
  Cancel,
  ExitToApp,
  AccountCircle,
  Close
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const UserProfile = ({ onClose }) => {
  const { user, updateProfile, logout, preferences, updatePreferences, loading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: ''
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [updateLoading, setUpdateLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  // Initialize profile data when user data is available
  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || ''
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    // Clear success message
    if (successMessage) {
      setSuccessMessage('');
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!profileData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }

    if (!profileData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }

    if (!profileData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(profileData.email)) {
      errors.email = 'Email is invalid';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setUpdateLoading(true);

    try {
      const result = await updateProfile({
        firstName: profileData.firstName.trim(),
        lastName: profileData.lastName.trim(),
        email: profileData.email.toLowerCase().trim()
      });

      if (result.success) {
        setSuccessMessage('Profile updated successfully!');
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Profile update error:', error);
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to original user data
    if (user) {
      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || ''
      });
    }
    setValidationErrors({});
    setSuccessMessage('');
    setIsEditing(false);
  };

  const handleLogout = async () => {
    await logout();
    setLogoutDialogOpen(false);
    if (onClose) {
      onClose();
    }
  };

  const getInitials = () => {
    const firstName = user?.firstName || '';
    const lastName = user?.lastName || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const formatJoinDate = () => {
    if (!user?.createdAt) return 'Unknown';

    try {
      const date = new Date(user.createdAt);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Unknown';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return (
      <Box textAlign="center" p={4}>
        <Typography variant="h6" color="text.secondary">
          Please log in to view your profile
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 2 }}>
      <Card>
        <CardHeader
          avatar={
            <Avatar
              sx={{
                width: 64,
                height: 64,
                bgcolor: 'primary.main',
                fontSize: '1.5rem'
              }}
            >
              {getInitials()}
            </Avatar>
          }
          title={
            <Typography variant="h5">
              {user.firstName} {user.lastName}
            </Typography>
          }
          subheader={
            <Box>
              <Typography variant="body2" color="text.secondary">
                {user.email}
              </Typography>
              <Chip
                size="small"
                label={`Member since ${formatJoinDate()}`}
                sx={{ mt: 1 }}
              />
            </Box>
          }
          action={
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {!isEditing ? (
                <Button
                  startIcon={<Edit />}
                  onClick={() => setIsEditing(true)}
                  variant="outlined"
                  size="small"
                >
                  Edit
                </Button>
              ) : (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    startIcon={<Save />}
                    onClick={handleSave}
                    variant="contained"
                    disabled={updateLoading}
                    size="small"
                  >
                    {updateLoading ? <CircularProgress size={16} /> : 'Save'}
                  </Button>
                  <Button
                    startIcon={<Cancel />}
                    onClick={handleCancel}
                    variant="outlined"
                    disabled={updateLoading}
                    size="small"
                  >
                    Cancel
                  </Button>
                </Box>
              )}
              {onClose && (
                <IconButton onClick={onClose} size="small">
                  <Close />
                </IconButton>
              )}
            </Box>
          }
        />

        <CardContent>
          {successMessage && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {successMessage}
            </Alert>
          )}

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="firstName"
                label="First Name"
                value={profileData.firstName}
                onChange={handleChange}
                disabled={!isEditing || updateLoading}
                error={!!validationErrors.firstName}
                helperText={validationErrors.firstName}
                slotProps={{
                  input: {
                    startAdornment: <Person sx={{ mr: 1, color: 'action.active' }} />
                  }
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="lastName"
                label="Last Name"
                value={profileData.lastName}
                onChange={handleChange}
                disabled={!isEditing || updateLoading}
                error={!!validationErrors.lastName}
                helperText={validationErrors.lastName}
                slotProps={{
                  input: {
                    startAdornment: <Person sx={{ mr: 1, color: 'action.active' }} />
                  }
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                name="email"
                label="Email Address"
                type="email"
                value={profileData.email}
                onChange={handleChange}
                disabled={!isEditing || updateLoading}
                error={!!validationErrors.email}
                helperText={validationErrors.email}
                slotProps={{
                  input: {
                    startAdornment: <Email sx={{ mr: 1, color: 'action.active' }} />
                  }
                }}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Box textAlign="center">
            <Button
              startIcon={<ExitToApp />}
              onClick={() => setLogoutDialogOpen(true)}
              variant="outlined"
              color="error"
            >
              Sign Out
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Logout Confirmation Dialog */}
      <Dialog
        open={logoutDialogOpen}
        onClose={() => setLogoutDialogOpen(false)}
      >
        <DialogTitle>
          Sign Out
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to sign out of your account?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogoutDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleLogout} color="error" variant="contained">
            Sign Out
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserProfile;