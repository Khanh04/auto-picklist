import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  CircularProgress,
  Fade,
  Slide,
  Grow
} from '@mui/material';
import {
  Storage,
  RestoreOutlined,
  DeleteOutline,
  AccessTime,
  Assignment,
  Warning
} from '@mui/icons-material';
import { useDraftRecovery } from '../hooks/useDraftRecovery';

const DraftRecoveryPanel = ({ onRestoreDraft }) => {
  const navigate = useNavigate();
  const {
    availableDrafts,
    isLoading,
    error,
    restoreDraft,
    deleteDraft,
    hasDrafts,
    stats
  } = useDraftRecovery();

  const handleRestoreDraft = async (draftKey) => {
    const result = await restoreDraft(draftKey);
    if (result.success) {
      if (onRestoreDraft) {
        onRestoreDraft(result.picklist, result.metadata);
      } else {
        // Navigate to preview with draft data
        navigate('/preview', {
          state: {
            picklist: result.picklist,
            metadata: result.metadata,
            isDraft: true
          }
        });
      }
    }
  };

  const handleDeleteDraft = async (draftKey) => {
    if (window.confirm('Are you sure you want to delete this draft? This action cannot be undone.')) {
      await deleteDraft(draftKey);
    }
  };

  if (isLoading && availableDrafts.length === 0) {
    return (
      <Fade in>
        <Card
          sx={{
            mb: 3,
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <CircularProgress size={24} sx={{ color: 'white' }} />
              <Typography sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                Loading drafts...
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Fade>
    );
  }

  if (!hasDrafts) {
    return null; // Don't show anything if no drafts
  }

  return (
    <Fade in timeout={800}>
      <Card
        sx={{
          mb: 3,
          background: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          transition: 'all 0.3s ease-in-out',
          '&:hover': {
            background: 'rgba(255, 255, 255, 0.2)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          },
        }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Avatar
              sx={{
                background: 'rgba(255, 193, 7, 0.2)',
                color: '#ffc107',
                border: '1px solid rgba(255, 193, 7, 0.3)',
              }}
            >
              <Storage />
            </Avatar>
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'white', flex: 1 }}>
              Resume Previous Work
            </Typography>
            <Chip
              label={`${stats.total} draft${stats.total !== 1 ? 's' : ''}`}
              size="small"
              sx={{
                background: 'rgba(255, 193, 7, 0.2)',
                color: '#ffc107',
                border: '1px solid rgba(255, 193, 7, 0.3)',
                fontWeight: 500,
              }}
            />
          </Box>

          {error && (
            <Slide in direction="down">
              <Alert
                severity="error"
                sx={{
                  mb: 2,
                  background: 'rgba(244, 67, 54, 0.15)',
                  color: 'white',
                  border: '1px solid rgba(244, 67, 54, 0.3)',
                  '& .MuiAlert-icon': {
                    color: '#f44336',
                  },
                }}
              >
                {error}
              </Alert>
            </Slide>
          )}

          <List sx={{ p: 0 }}>
            {availableDrafts.map((draft, index) => (
              <Grow
                key={draft.draftKey}
                in
                timeout={300}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <ListItem
                  sx={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: 2,
                    mb: index < availableDrafts.length - 1 ? 2 : 0,
                    p: 2,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.2)',
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                      transform: 'translateX(4px)',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', flex: 1 }}>
                    <ListItemAvatar>
                      <Avatar
                        sx={{
                          background: 'rgba(255, 255, 255, 0.15)',
                          color: 'white',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                        }}
                      >
                        <Assignment />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 600, color: 'white' }}>
                            {draft.title}
                          </Typography>
                          {draft.isExpiringSoon && (
                            <Chip
                              icon={<Warning />}
                              label="Expires soon"
                              size="small"
                              sx={{
                                background: 'rgba(255, 152, 0, 0.2)',
                                color: '#ff9800',
                                border: '1px solid rgba(255, 152, 0, 0.3)',
                                fontWeight: 500,
                                fontSize: '0.75rem',
                              }}
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          {draft.sourceFileName && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Assignment sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.7)' }} />
                              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                {draft.sourceFileName}
                              </Typography>
                            </Box>
                          )}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Assignment sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.7)' }} />
                              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                {draft.itemCount} items
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <AccessTime sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.7)' }} />
                              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                Saved {draft.formattedLastSaved}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      }
                    />
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
                    <Button
                      variant="contained"
                      startIcon={isLoading ? <CircularProgress size={16} /> : <RestoreOutlined />}
                      onClick={() => handleRestoreDraft(draft.draftKey)}
                      disabled={isLoading}
                      sx={{
                        background: 'linear-gradient(135deg, rgba(33, 150, 243, 0.8), rgba(33, 150, 243, 0.6))',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(33, 150, 243, 0.3)',
                        color: 'white',
                        fontWeight: 600,
                        transition: 'all 0.3s ease-in-out',
                        '&:hover': {
                          transform: 'scale(1.05)',
                          background: 'linear-gradient(135deg, rgba(33, 150, 243, 0.9), rgba(33, 150, 243, 0.7))',
                          boxShadow: '0 4px 20px rgba(33, 150, 243, 0.3)',
                        },
                        '&:disabled': {
                          background: 'rgba(255, 255, 255, 0.1)',
                          color: 'rgba(255, 255, 255, 0.5)',
                        },
                      }}
                    >
                      {isLoading ? 'Loading...' : 'Resume'}
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<DeleteOutline />}
                      onClick={() => handleDeleteDraft(draft.draftKey)}
                      disabled={isLoading}
                      sx={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: 'rgba(255, 255, 255, 0.8)',
                        transition: 'all 0.3s ease-in-out',
                        '&:hover': {
                          background: 'rgba(244, 67, 54, 0.2)',
                          borderColor: 'rgba(244, 67, 54, 0.3)',
                          color: '#f44336',
                        },
                        '&:disabled': {
                          background: 'rgba(255, 255, 255, 0.05)',
                          color: 'rgba(255, 255, 255, 0.3)',
                        },
                      }}
                    >
                      Delete
                    </Button>
                  </Box>
                </ListItem>
              </Grow>
            ))}
          </List>

          {stats.expiringSoon > 0 && (
            <Slide in direction="up" timeout={500}>
              <Alert
                severity="warning"
                sx={{
                  mt: 2,
                  background: 'rgba(255, 152, 0, 0.15)',
                  color: 'white',
                  border: '1px solid rgba(255, 152, 0, 0.3)',
                  '& .MuiAlert-icon': {
                    color: '#ff9800',
                  },
                }}
              >
                {stats.expiringSoon} draft{stats.expiringSoon !== 1 ? 's' : ''} will expire within 24 hours.
                Resume or convert them to shared lists to keep them longer.
              </Alert>
            </Slide>
          )}
        </CardContent>
      </Card>
    </Fade>
  );
};

export default DraftRecoveryPanel;