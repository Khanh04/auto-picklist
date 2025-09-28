import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  Slide,
  IconButton,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  Close as CloseIcon
} from '@mui/icons-material';
import Login from './Login';
import Register from './Register';

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const AuthModal = ({ open, onClose, initialMode = 'login' }) => {
  const [mode, setMode] = useState(initialMode);
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const handleSwitchToLogin = () => {
    setMode('login');
  };

  const handleSwitchToRegister = () => {
    setMode('register');
  };

  const handleLoginSuccess = (user) => {
    console.log('Login successful:', user);
    if (onClose) {
      onClose();
    }
  };

  const handleRegistrationSuccess = (result) => {
    console.log('Registration successful:', result);
    // Stay on register view to show success message
    // User can manually switch to login
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      TransitionComponent={Transition}
      keepMounted
      onClose={handleClose}
      fullScreen={fullScreen}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: fullScreen ? 0 : 2,
          minHeight: fullScreen ? '100vh' : 'auto'
        }
      }}
    >
      <IconButton
        aria-label="close"
        onClick={handleClose}
        sx={{
          position: 'absolute',
          right: 8,
          top: 8,
          color: (theme) => theme.palette.grey[500],
          zIndex: 1
        }}
      >
        <CloseIcon />
      </IconButton>

      <DialogContent sx={{ p: 0 }}>
        {mode === 'login' ? (
          <Login
            onSwitchToRegister={handleSwitchToRegister}
            onLoginSuccess={handleLoginSuccess}
          />
        ) : (
          <Register
            onSwitchToLogin={handleSwitchToLogin}
            onRegistrationSuccess={handleRegistrationSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;