import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Switch,
  FormControlLabel,
  Typography,
  Alert,
  Divider,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Chip,
  IconButton
} from '@mui/material';
import {
  ExpandMore,
  Save,
  Settings,
  Notifications,
  ViewModule,
  Business,
  TrendingUp,
  Close
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const UserPreferences = ({ onClose }) => {
  const { user, preferences, updatePreferences, loading } = useAuth();
  const [preferencesData, setPreferencesData] = useState({
    notifications: {
      email: true,
      updates: false,
      marketing: false
    },
    display: {
      theme: 'light',
      currency: 'USD',
      itemsPerPage: 25
    },
    picklist: {
      defaultUseDatabase: true,
      defaultUseIntelligent: true,
      autoOptimizeSuppliers: true,
      showPriceComparisons: true
    }
  });
  const [updateLoading, setUpdateLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [expanded, setExpanded] = useState('notifications');

  // Initialize preferences data when available
  useEffect(() => {
    if (preferences) {
      setPreferencesData(prev => ({
        ...prev,
        ...preferences
      }));
    }
  }, [preferences]);

  const handleChange = (section, key, value) => {
    setPreferencesData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));

    // Clear success message
    if (successMessage) {
      setSuccessMessage('');
    }
  };

  const handleSave = async () => {
    setUpdateLoading(true);

    try {
      const result = await updatePreferences(preferencesData);

      if (result.success) {
        setSuccessMessage('Preferences updated successfully!');
      }
    } catch (error) {
      console.error('Preferences update error:', error);
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleAccordionChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  const currencyOptions = [
    { value: 'USD', label: 'USD ($)' },
    { value: 'EUR', label: 'EUR (€)' },
    { value: 'GBP', label: 'GBP (£)' },
    { value: 'CAD', label: 'CAD (C$)' },
    { value: 'AUD', label: 'AUD (A$)' }
  ];

  const itemsPerPageOptions = [
    { value: 10, label: '10 items' },
    { value: 25, label: '25 items' },
    { value: 50, label: '50 items' },
    { value: 100, label: '100 items' }
  ];

  const themeOptions = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'auto', label: 'Auto (System)' }
  ];

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
          Please log in to view your preferences
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 2 }}>
      <Card>
        <CardHeader
          avatar={<Settings color="primary" />}
          title="User Preferences"
          subheader="Customize your auto-picklist experience"
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                startIcon={<Save />}
                onClick={handleSave}
                variant="contained"
                disabled={updateLoading}
              >
                {updateLoading ? <CircularProgress size={20} /> : 'Save Changes'}
              </Button>
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

          {/* Notifications Preferences */}
          <Accordion
            expanded={expanded === 'notifications'}
            onChange={handleAccordionChange('notifications')}
          >
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box display="flex" alignItems="center">
                <Notifications sx={{ mr: 2 }} />
                <Typography variant="h6">Notifications</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <List>
                <ListItem
                  secondaryAction={
                    <Switch
                      checked={preferencesData.notifications?.email || false}
                      onChange={(e) => handleChange('notifications', 'email', e.target.checked)}
                    />
                  }
                >
                  <ListItemText
                    primary="Email Notifications"
                    secondary="Receive important updates via email"
                  />
                </ListItem>

                <ListItem
                  secondaryAction={
                    <Switch
                      checked={preferencesData.notifications?.updates || false}
                      onChange={(e) => handleChange('notifications', 'updates', e.target.checked)}
                    />
                  }
                >
                  <ListItemText
                    primary="Product Updates"
                    secondary="Get notified about new features and improvements"
                  />
                </ListItem>

                <ListItem
                  secondaryAction={
                    <Switch
                      checked={preferencesData.notifications?.marketing || false}
                      onChange={(e) => handleChange('notifications', 'marketing', e.target.checked)}
                    />
                  }
                >
                  <ListItemText
                    primary="Marketing Emails"
                    secondary="Receive tips, guides, and promotional content"
                  />
                </ListItem>
              </List>
            </AccordionDetails>
          </Accordion>

          {/* Display Preferences */}
          <Accordion
            expanded={expanded === 'display'}
            onChange={handleAccordionChange('display')}
          >
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box display="flex" alignItems="center">
                <ViewModule sx={{ mr: 2 }} />
                <Typography variant="h6">Display</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Theme</InputLabel>
                    <Select
                      value={preferencesData.display?.theme || 'light'}
                      onChange={(e) => handleChange('display', 'theme', e.target.value)}
                      label="Theme"
                    >
                      {themeOptions.map(option => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Currency</InputLabel>
                    <Select
                      value={preferencesData.display?.currency || 'USD'}
                      onChange={(e) => handleChange('display', 'currency', e.target.value)}
                      label="Currency"
                    >
                      {currencyOptions.map(option => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Items Per Page</InputLabel>
                    <Select
                      value={preferencesData.display?.itemsPerPage || 25}
                      onChange={(e) => handleChange('display', 'itemsPerPage', e.target.value)}
                      label="Items Per Page"
                    >
                      {itemsPerPageOptions.map(option => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* Picklist Preferences */}
          <Accordion
            expanded={expanded === 'picklist'}
            onChange={handleAccordionChange('picklist')}
          >
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box display="flex" alignItems="center">
                <Business sx={{ mr: 2 }} />
                <Typography variant="h6">Picklist Generation</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <List>
                <ListItem
                  secondaryAction={
                    <Switch
                      checked={preferencesData.picklist?.defaultUseDatabase || true}
                      onChange={(e) => handleChange('picklist', 'defaultUseDatabase', e.target.checked)}
                    />
                  }
                >
                  <ListItemText
                    primary="Use Database by Default"
                    secondary="Automatically use database for product matching"
                  />
                </ListItem>

                <ListItem
                  secondaryAction={
                    <Switch
                      checked={preferencesData.picklist?.defaultUseIntelligent || true}
                      onChange={(e) => handleChange('picklist', 'defaultUseIntelligent', e.target.checked)}
                    />
                  }
                >
                  <ListItemText
                    primary="Intelligent Matching"
                    secondary="Use advanced AI-powered product matching"
                  />
                </ListItem>

                <ListItem
                  secondaryAction={
                    <Switch
                      checked={preferencesData.picklist?.autoOptimizeSuppliers || true}
                      onChange={(e) => handleChange('picklist', 'autoOptimizeSuppliers', e.target.checked)}
                    />
                  }
                >
                  <ListItemText
                    primary="Auto-Optimize Suppliers"
                    secondary="Automatically select best suppliers based on your preferences"
                  />
                </ListItem>

                <ListItem
                  secondaryAction={
                    <Switch
                      checked={preferencesData.picklist?.showPriceComparisons || true}
                      onChange={(e) => handleChange('picklist', 'showPriceComparisons', e.target.checked)}
                    />
                  }
                >
                  <ListItemText
                    primary="Show Price Comparisons"
                    secondary="Display price comparisons across different suppliers"
                  />
                </ListItem>
              </List>
            </AccordionDetails>
          </Accordion>
        </CardContent>
      </Card>
    </Box>
  );
};

export default UserPreferences;