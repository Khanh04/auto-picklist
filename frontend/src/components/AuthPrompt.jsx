import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Divider
} from '@mui/material';
import {
  Login as LoginIcon,
  PersonAdd,
  Security
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from './AuthModal';

const AuthPrompt = ({
  title = "Sign in to access this feature",
  description = "Create an account or sign in to save your preferences and access advanced features.",
  showBenefits = true,
  onCancel
}) => {
  const { isAuthenticated } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login');

  // If user is already authenticated, don't show the prompt
  if (isAuthenticated) {
    return null;
  }

  const handleOpenLogin = () => {
    setAuthModalMode('login');
    setAuthModalOpen(true);
  };

  const handleOpenRegister = () => {
    setAuthModalMode('register');
    setAuthModalOpen(true);
  };

  const handleCloseAuthModal = () => {
    setAuthModalOpen(false);
  };

  const benefits = [
    "Save your supplier preferences",
    "Access personalized picklist recommendations",
    "Keep track of your order history",
    "Customize display and notification settings",
    "Share shopping lists with your team"
  ];

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
          p: 2
        }}
      >
        <Card sx={{ maxWidth: 500, width: '100%' }}>
          <CardContent sx={{ textAlign: 'center', p: 4 }}>
            <Security
              sx={{
                fontSize: 64,
                color: 'primary.main',
                mb: 2
              }}
            />

            <Typography variant="h5" gutterBottom>
              {title}
            </Typography>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              {description}
            </Typography>

            {showBenefits && (
              <>
                <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Benefits of having an account:
                  </Typography>
                  <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                    {benefits.map((benefit, index) => (
                      <li key={index}>
                        <Typography variant="body2">{benefit}</Typography>
                      </li>
                    ))}
                  </ul>
                </Alert>
              </>
            )}

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 2 }}>
              <Button
                variant="outlined"
                startIcon={<LoginIcon />}
                onClick={handleOpenLogin}
                size="large"
              >
                Sign In
              </Button>
              <Button
                variant="contained"
                startIcon={<PersonAdd />}
                onClick={handleOpenRegister}
                size="large"
              >
                Create Account
              </Button>
            </Box>

            {onCancel && (
              <>
                <Divider sx={{ my: 2 }} />
                <Button
                  variant="text"
                  onClick={onCancel}
                  color="inherit"
                >
                  Continue without account
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </Box>

      <AuthModal
        open={authModalOpen}
        onClose={handleCloseAuthModal}
        initialMode={authModalMode}
      />
    </>
  );
};

export default AuthPrompt;