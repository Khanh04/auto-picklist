import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Alert,
  CircularProgress,
  Fab,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Skeleton,
  Paper,
  Grow,
  Slide,
  Fade,
  useTheme,
  LinearProgress,
  Tooltip,
  Avatar,
  ListItemAvatar,
  Divider,
  Stack
} from '@mui/material';
import {
  Add,
  Launch,
  Assignment,
  CheckCircle,
  Refresh,
  Search,
  FilterList,
  ShoppingCart,
  AccessTime,
  Clear,
  InsertChart
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../utils/apiClient';

const PickListsDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const [pickLists, setPickLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    loadPickLists();
  }, []);

  const loadPickLists = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.getUserPickLists();
      setPickLists(response.pickLists || []);
    } catch (err) {
      console.error('Error loading pick lists:', err);
      setError('Failed to load your pick lists');
    } finally {
      setLoading(false);
    }
  };

  // Filtered and sorted pick lists
  const filteredAndSortedPickLists = useMemo(() => {
    let filtered = pickLists.filter(pickList => {
      // Search filter
      const matchesSearch = searchQuery === '' ||
        pickList.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (pickList.description && pickList.description.toLowerCase().includes(searchQuery.toLowerCase()));

      // Status filter
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && pickList.isActive) ||
        (statusFilter === 'expired' && !pickList.isActive);

      return matchesSearch && matchesStatus;
    });

    // Sort filtered results
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'oldest':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'title':
          return a.title.localeCompare(b.title);
        case 'items':
          return b.itemCount - a.itemCount;
        default:
          return 0;
      }
    });

    return filtered;
  }, [pickLists, searchQuery, statusFilter, sortBy]);

  // Statistics calculations
  const stats = useMemo(() => {
    const totalLists = pickLists.length;
    const activeLists = pickLists.filter(list => list.isActive).length;
    const totalItems = pickLists.reduce((sum, list) => sum + list.itemCount, 0);
    const avgItemsPerList = totalLists > 0 ? (totalItems / totalLists).toFixed(1) : 0;

    return {
      totalLists,
      activeLists,
      totalItems,
      avgItemsPerList
    };
  }, [pickLists]);

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const created = new Date(timestamp);
    const diffMs = now - created;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setSortBy('newest');
  };

  const handleCreateNew = () => {
    navigate('/upload');
  };

  const handleViewPickList = (shareId) => {
    navigate(`/shopping/${shareId}`);
  };

  // Skeleton loading component for stats cards
  const StatCardSkeleton = () => (
    <Card
      sx={{
        height: '100%',
        background: 'rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Skeleton variant="circular" width={48} height={48} sx={{ mr: 2 }} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width={60} height={40} />
            <Skeleton variant="text" width={120} height={24} />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  // Enhanced stats card component
  const StatsCard = ({ icon, value, label, color, progress, delay = 0 }) => (
    <Grow in={!loading} timeout={500} style={{ transitionDelay: `${delay}ms` }}>
      <Card
        sx={{
          height: '100%',
          cursor: 'pointer',
          background: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          transition: 'all 0.3s ease-in-out',
          '&:hover': {
            transform: 'translateY(-4px)',
            background: 'rgba(255, 255, 255, 0.25)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          },
        }}
        className="slide-up"
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: progress !== undefined ? 2 : 0 }}>
            <Avatar
              sx={{
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                mr: 2,
                width: 48,
                height: 48,
              }}
            >
              {icon}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 'bold',
                  color: 'white',
                  animation: 'countUp 1s ease-out',
                  '@keyframes countUp': {
                    from: { opacity: 0, transform: 'translateY(20px)' },
                    to: { opacity: 1, transform: 'translateY(0)' },
                  },
                }}
              >
                {value}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                {label}
              </Typography>
            </Box>
          </Box>
          {progress !== undefined && (
            <Box sx={{ mt: 1 }}>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: 'rgba(255, 255, 255, 0.8)',
                  },
                }}
              />
              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', mt: 0.5, display: 'block' }}>
                {progress}% completion rate
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Grow>
  );

  // Pick list item component
  const PickListItem = ({ pickList, index }) => (
    <Slide in direction="up" timeout={300} style={{ transitionDelay: `${index * 100}ms` }}>
      <ListItem
        sx={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: 2,
          mb: 2,
          p: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          transition: 'all 0.3s ease-in-out',
          '&:hover': {
            background: 'rgba(255, 255, 255, 0.2)',
            borderColor: 'rgba(255, 255, 255, 0.3)',
            transform: 'translateX(4px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          },
        }}
        className="slide-up"
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', flex: 1 }}>
          <ListItemAvatar>
            <Avatar
              sx={{
                background: pickList.isActive
                  ? 'rgba(34, 197, 94, 0.2)'
                  : 'rgba(255, 255, 255, 0.2)',
                color: pickList.isActive ? '#22c55e' : 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <Assignment />
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'white' }}>
                  {pickList.title}
                </Typography>
                <Chip
                  label={pickList.isActive ? 'Active' : 'Expired'}
                  size="small"
                  sx={{
                    fontWeight: 500,
                    background: pickList.isActive
                      ? 'rgba(34, 197, 94, 0.2)'
                      : 'rgba(255, 255, 255, 0.1)',
                    color: pickList.isActive ? '#22c55e' : 'rgba(255, 255, 255, 0.7)',
                    backdropFilter: 'blur(10px)',
                    border: `1px solid ${pickList.isActive ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255, 255, 255, 0.2)'}`,
                    animation: pickList.isActive ? 'pulse 2s infinite' : 'none',
                    '@keyframes pulse': {
                      '0%': { boxShadow: '0 0 0 0 rgba(34, 197, 94, 0.4)' },
                      '70%': { boxShadow: '0 0 0 10px rgba(34, 197, 94, 0)' },
                      '100%': { boxShadow: '0 0 0 0 rgba(34, 197, 94, 0)' },
                    },
                  }}
                />
              </Box>
            }
            secondary={
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <ShoppingCart sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.7)' }} />
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                      {pickList.itemCount} items
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <AccessTime sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.7)' }} />
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                      {formatTimeAgo(pickList.createdAt)}
                    </Typography>
                  </Box>
                </Box>
                {pickList.description && (
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'rgba(255, 255, 255, 0.8)',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {pickList.description}
                  </Typography>
                )}
              </Stack>
            }
          />
        </Box>
        <Box sx={{ ml: 2, display: 'flex', gap: 1 }}>
          <Tooltip title={pickList.isActive ? 'Open pick list' : 'This pick list has expired'}>
            <span>
              <Button
                variant={pickList.isActive ? 'contained' : 'outlined'}
                startIcon={<Launch />}
                onClick={() => handleViewPickList(pickList.shareId)}
                disabled={!pickList.isActive}
                sx={{
                  ...(pickList.isActive ? {
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.25), rgba(255, 255, 255, 0.15))',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    fontWeight: 600,
                  } : {
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: 'rgba(255, 255, 255, 0.6)',
                  }),
                  transition: 'all 0.3s ease-in-out',
                  '&:hover': pickList.isActive ? {
                    transform: 'scale(1.05)',
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0.25))',
                  } : {},
                }}
              >
                {pickList.isActive ? 'Open' : 'Expired'}
              </Button>
            </span>
          </Tooltip>
        </Box>
      </ListItem>
    </Slide>
  );

  if (loading) {
    return (
      <Box className="gradient-bg" sx={{ minHeight: '100vh' }}>
        <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
        {/* Header skeleton */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Skeleton variant="text" width={200} height={48} />
            <Skeleton variant="text" width={300} height={24} />
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Skeleton variant="circular" width={40} height={40} />
            <Skeleton variant="rectangular" width={180} height={40} sx={{ borderRadius: 1 }} />
          </Box>
        </Box>

        {/* Stats cards skeleton */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {[0, 1, 2, 3].map((index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <StatCardSkeleton />
            </Grid>
          ))}
        </Grid>

        {/* Pick lists skeleton */}
        <Card
          sx={{
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          <CardContent>
            <Skeleton variant="text" width={150} height={32} sx={{ mb: 2 }} />
            {[0, 1, 2].map((index) => (
              <Box
                key={index}
                sx={{
                  mb: 2,
                  p: 2,
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Skeleton variant="circular" width={48} height={48} sx={{ mr: 2 }} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width={200} height={24} />
                    <Skeleton variant="text" width={150} height={20} />
                  </Box>
                  <Skeleton variant="rectangular" width={80} height={36} sx={{ borderRadius: 1 }} />
                </Box>
              </Box>
            ))}
          </CardContent>
        </Card>
        </Box>
      </Box>
    );
  }

  return (
    <Box className="gradient-bg" sx={{ minHeight: '100vh' }}>
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Fade in timeout={800}>
        <Box sx={{ mb: 4 }}>
          <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', md: 'center' },
            flexDirection: { xs: 'column', md: 'row' },
            gap: { xs: 2, md: 0 }
          }}>
            <Box>
              <Typography
                variant="h4"
                gutterBottom
                sx={{
                  fontWeight: 700,
                  color: 'white',
                  mb: 2,
                }}
                className="slide-up"
              >
                Your Pick Lists
              </Typography>
              <Typography variant="body1" sx={{ color: 'white/80' }} className="fade-in">
                Welcome back, {user?.firstName}! Here are your recent pick lists.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Tooltip title="Refresh pick lists">
                <IconButton
                  onClick={loadPickLists}
                  disabled={loading}
                  sx={{
                    color: 'white',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': {
                      transform: 'rotate(180deg)',
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    }
                  }}
                >
                  <Refresh />
                </IconButton>
              </Tooltip>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleCreateNew}
                sx={{
                  px: 3,
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.25), rgba(255, 255, 255, 0.15))',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  fontWeight: 600,
                  transition: 'all 0.3s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0.25))',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                  },
                }}
                className="scale-in"
              >
                Create New Pick List
              </Button>
            </Box>
          </Box>

          {error && (
            <Slide in direction="down" timeout={500}>
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            </Slide>
          )}
        </Box>
      </Fade>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            icon={<Assignment />}
            value={stats.totalLists}
            label="Total Pick Lists"
            color="primary"
            delay={0}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            icon={<CheckCircle />}
            value={stats.activeLists}
            label="Active Lists"
            color="success"
            progress={stats.totalLists > 0 ? Math.round((stats.activeLists / stats.totalLists) * 100) : 0}
            delay={100}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            icon={<ShoppingCart />}
            value={stats.totalItems}
            label="Total Items"
            color="info"
            delay={200}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            icon={<InsertChart />}
            value={stats.avgItemsPerList}
            label="Avg Items/List"
            color="warning"
            delay={300}
          />
        </Grid>
      </Grid>

      {/* Search and Filters */}
      <Fade in timeout={1000}>
        <Card
          sx={{
            mb: 3,
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
          className="slide-up"
        >
          <CardContent>
            <Box sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              gap: 2,
              alignItems: { xs: 'stretch', md: 'center' }
            }}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Search pick lists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
                      </InputAdornment>
                    ),
                    endAdornment: searchQuery && (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setSearchQuery('')} sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                          <Clear />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    transition: 'all 0.3s ease-in-out',
                    '& fieldset': {
                      border: 'none',
                    },
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.15)',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                    },
                    '&.Mui-focused': {
                      background: 'rgba(255, 255, 255, 0.2)',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                    },
                  },
                  '& .MuiInputBase-input::placeholder': {
                    color: 'rgba(255, 255, 255, 0.6)',
                    opacity: 1,
                  },
                }}
              />

              <Box sx={{
                display: 'flex',
                gap: 1,
                minWidth: { md: 'auto' },
                flexDirection: { xs: 'row', sm: 'row' }
              }}>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Status"
                    onChange={(e) => setStatusFilter(e.target.value)}
                    sx={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      '& .MuiOutlinedInput-notchedOutline': {
                        border: 'none',
                      },
                      '& .MuiSvgIcon-root': {
                        color: 'rgba(255, 255, 255, 0.7)',
                      },
                    }}
                  >
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="expired">Expired</MenuItem>
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Sort by</InputLabel>
                  <Select
                    value={sortBy}
                    label="Sort by"
                    onChange={(e) => setSortBy(e.target.value)}
                    sx={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      '& .MuiOutlinedInput-notchedOutline': {
                        border: 'none',
                      },
                      '& .MuiSvgIcon-root': {
                        color: 'rgba(255, 255, 255, 0.7)',
                      },
                    }}
                  >
                    <MenuItem value="newest">Newest</MenuItem>
                    <MenuItem value="oldest">Oldest</MenuItem>
                    <MenuItem value="title">Title</MenuItem>
                    <MenuItem value="items">Items</MenuItem>
                  </Select>
                </FormControl>

                <Tooltip title="Clear all filters">
                  <IconButton
                    onClick={clearFilters}
                    disabled={searchQuery === '' && statusFilter === 'all' && sortBy === 'newest'}
                    sx={{
                      color: 'rgba(255, 255, 255, 0.7)',
                      background: 'rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      '&:hover': {
                        background: 'rgba(255, 255, 255, 0.2)',
                      },
                    }}
                  >
                    <FilterList />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            {(searchQuery || statusFilter !== 'all' || sortBy !== 'newest') && (
              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                  Showing {filteredAndSortedPickLists.length} of {pickLists.length} pick lists
                </Typography>
                {(searchQuery || statusFilter !== 'all' || sortBy !== 'newest') && (
                  <Button
                    size="small"
                    onClick={clearFilters}
                    startIcon={<Clear />}
                    sx={{
                      color: 'rgba(255, 255, 255, 0.8)',
                      '&:hover': {
                        background: 'rgba(255, 255, 255, 0.1)',
                      },
                    }}
                  >
                    Clear filters
                  </Button>
                )}
              </Box>
            )}
          </CardContent>
        </Card>
      </Fade>

      {/* Pick Lists */}
      <Fade in timeout={1200}>
        <Card
          sx={{
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
          className="slide-up"
        >
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'white' }}>
              {filteredAndSortedPickLists.length === pickLists.length
                ? 'Your Pick Lists'
                : `Filtered Pick Lists (${filteredAndSortedPickLists.length})`}
            </Typography>

            {pickLists.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Assignment sx={{ fontSize: 100, color: 'rgba(255, 255, 255, 0.4)', mb: 2 }} />
                <Typography variant="h5" sx={{ color: 'white', fontWeight: 500 }} gutterBottom>
                  No pick lists yet
                </Typography>
                <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 4 }}>
                  Get started by creating your first automated pick list
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<Add />}
                  onClick={handleCreateNew}
                  sx={{
                    px: 4,
                    py: 1.5,
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.25), rgba(255, 255, 255, 0.15))',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    fontWeight: 600,
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0.25))',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                    },
                  }}
                >
                  Create Your First Pick List
                </Button>
              </Box>
            ) : filteredAndSortedPickLists.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Search sx={{ fontSize: 80, color: 'rgba(255, 255, 255, 0.4)', mb: 2 }} />
                <Typography variant="h6" sx={{ color: 'white' }} gutterBottom>
                  No pick lists match your filters
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 3 }}>
                  Try adjusting your search or filter criteria
                </Typography>
                <Button
                  onClick={clearFilters}
                  startIcon={<Clear />}
                  sx={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.1)',
                    },
                  }}
                >
                  Clear all filters
                </Button>
              </Box>
            ) : (
              <List sx={{ p: 0 }}>
                {filteredAndSortedPickLists.map((pickList, index) => (
                  <PickListItem
                    key={pickList.shareId}
                    pickList={pickList}
                    index={index}
                  />
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </Fade>

      {/* Floating Action Button for mobile */}
      <Fab
        color="primary"
        aria-label="create new pick list"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          display: { xs: 'flex', md: 'none' },
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.25), rgba(255, 255, 255, 0.15))',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          color: 'white',
          transition: 'all 0.3s ease-in-out',
          '&:hover': {
            transform: 'scale(1.1)',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0.25))',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
          },
        }}
        onClick={handleCreateNew}
      >
        <Add />
      </Fab>
      </Box>
    </Box>
  );
};

export default PickListsDashboard;