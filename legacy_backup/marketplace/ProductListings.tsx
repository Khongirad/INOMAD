/**
 * ProductListings Component
 * 
 * Browse all marketplace listings with:
 * - Grid/list view toggle
 * - Search functionality
 * - Category filters
 * - Price filters
 * - Listing type filters
 * - Responsive design
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Rating,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  Alert,
  Container,
  InputAdornment,
  Skeleton,
} from '@mui/material';
import {
  Search as SearchIcon,
  ViewModule as GridViewIcon,
  ViewList as ListViewIcon,
  FilterList as FilterIcon,
  ShoppingCart as CartIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useMarketplace } from '../../hooks/useMarketplace';
import {
  MarketplaceListing,
  MarketplaceListingType,
  MarketplaceListingStatus,
  calculateAverageRating,
  formatPrice,
  isListingAvailable,
  getStatusColor,
} from '../../lib/api/marketplace.api';

export const ProductListings: React.FC = () => {
  const navigate = useNavigate();
  const { listings, loading, error, getAllListings, searchListings, clearError } = useMarketplace();

  // View state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filters
  const [selectedType, setSelectedType] = useState<MarketplaceListingType | 'ALL'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<MarketplaceListingStatus | 'ALL'>('ACTIVE');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  useEffect(() => {
    loadListings();
  }, [selectedType, selectedStatus]);

  const loadListings = () => {
    const filters: any = {};
    if (selectedType !== 'ALL') filters.listingType = selectedType;
    if (selectedStatus !== 'ALL') filters.status = selectedStatus;
    if (minPrice) filters.minPrice = minPrice;
    if (maxPrice) filters.maxPrice = maxPrice;
    
    getAllListings(filters);
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      searchListings(searchQuery);
    } else {
      loadListings();
    }
  };

  const handleViewListing = (id: string) => {
    navigate(`/marketplace/listings/${id}`);
  };

  const handleCreateListing = () => {
    navigate('/marketplace/create');
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" fontWeight="bold">
          Marketplace
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={handleCreateListing}
          startIcon={<CartIcon />}
        >
          Sell Item
        </Button>
      </Box>

      {/* Search & Filters */}
      <Card sx={{ mb: 3, p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          {/* Search */}
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchQuery && (
                  <InputAdornment position="end">
                    <Button size="small" onClick={handleSearch}>
                      Search
                    </Button>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          {/* Type Filter */}
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select
                value={selectedType}
                label="Type"
                onChange={(e) => setSelectedType(e.target.value as any)}
              >
                <MenuItem value="ALL">All Types</MenuItem>
                <MenuItem value="PHYSICAL_GOOD">Physical Goods</MenuItem>
                <MenuItem value="DIGITAL_GOOD">Digital Goods</MenuItem>
                <MenuItem value="SERVICE">Services</MenuItem>
                <MenuItem value="WORK">Work</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Status Filter */}
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={selectedStatus}
                label="Status"
                onChange={(e) => setSelectedStatus(e.target.value as any)}
              >
                <MenuItem value="ALL">All Status</MenuItem>
                <MenuItem value="ACTIVE">Active</MenuItem>
                <MenuItem value="DRAFT">Draft</MenuItem>
                <MenuItem value="PAUSED">Paused</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Price Range */}
          <Grid item xs={6} sm={3} md={2}>
            <TextField
              fullWidth
              size="small"
              label="Min Price"
              type="number"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              onBlur={loadListings}
            />
          </Grid>
          <Grid item xs={6} sm={3} md={2}>
            <TextField
              fullWidth
              size="small"
              label="Max Price"
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              onBlur={loadListings}
            />
          </Grid>

          {/* View Toggle */}
          <Grid item xs={12} sm={6} md={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, value) => value && setViewMode(value)}
              size="small"
            >
              <ToggleButton value="grid">
                <GridViewIcon />
              </ToggleButton>
              <ToggleButton value="list">
                <ListViewIcon />
              </ToggleButton>
            </ToggleButtonGroup>
          </Grid>
        </Grid>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" onClose={clearError} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Listings Grid/List */}
      {loading && !listings.length ? (
        <Grid container spacing={3}>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={n}>
              <Card>
                <Skeleton variant="rectangular" height={200} />
                <CardContent>
                  <Skeleton variant="text" height={30} />
                  <Skeleton variant="text" height={20} width="60%" />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : listings.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No listings found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {searchQuery
              ? 'Try adjusting your search or filters'
              : 'Be the first to list an item!'}
          </Typography>
          {!searchQuery && (
            <Button variant="contained" onClick={handleCreateListing}>
              Create Listing
            </Button>
          )}
        </Box>
      ) : (
        <Grid container spacing={3}>
          {listings.map((listing) => (
            <Grid
              item
              xs={12}
              sm={viewMode === 'grid' ? 6 : 12}
              md={viewMode === 'grid' ? 4 : 12}
              lg={viewMode === 'grid' ? 3 : 12}
              key={listing.id}
            >
              <ListingCard listing={listing} viewMode={viewMode} onClick={() => handleViewListing(listing.id)} />
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

// ListingCard Component
interface ListingCardProps {
  listing: MarketplaceListing;
  viewMode: 'grid' | 'list';
  onClick: () => void;
}

const ListingCard: React.FC<ListingCardProps> = ({ listing, viewMode, onClick }) => {
  const available = isListingAvailable(listing);
  const avgRating = calculateAverageRating(listing.totalRating, listing.reviewCount);

  if (viewMode === 'list') {
    return (
      <Card
        sx={{
          display: 'flex',
          cursor: 'pointer',
          '&:hover': { boxShadow: 6 },
          transition: 'box-shadow 0.3s',
          opacity: available ? 1 : 0.6,
        }}
        onClick={onClick}
      >
        <CardMedia
          component="img"
          sx={{ width: 200, objectFit: 'cover' }}
          image={listing.images?.[0] || 'https://via.placeholder.com/200'}
          alt={listing.title}
        />
        <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <CardContent sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="h6" component="div">
                {listing.title}
              </Typography>
              <Chip
                label={listing.status}
                color={getStatusColor(listing.status) as any}
                size="small"
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {listing.description.substring(0, 150)}
              {listing.description.length > 150 && '...'}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h5" color="primary" fontWeight="bold">
                {formatPrice(listing.price)} ALTAN
              </Typography>
              {listing.reviewCount > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Rating value={avgRating} precision={0.1} size="small" readOnly />
                  <Typography variant="body2" color="text.secondary">
                    ({listing.reviewCount})
                  </Typography>
                </Box>
              )}
            </Box>
          </CardContent>
        </Box>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        '&:hover': { boxShadow: 6 },
        transition: 'box-shadow 0.3s',
        opacity: available ? 1 : 0.6,
      }}
      onClick={onClick}
    >
      <CardMedia
        component="img"
        height="200"
        image={listing.images?.[0] || 'https://via.placeholder.com/300x200'}
        alt={listing.title}
        sx={{ objectFit: 'cover' }}
      />
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="h6" component="div" noWrap>
            {listing.title}
          </Typography>
          <Chip
            label={listing.status}
            color={getStatusColor(listing.status) as any}
            size="small"
          />
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {listing.description.substring(0, 80)}
          {listing.description.length > 80 && '...'}
        </Typography>
        <Typography variant="h5" color="primary" fontWeight="bold" sx={{ mb: 1 }}>
          {formatPrice(listing.price)} ALTAN
        </Typography>
        {listing.reviewCount > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Rating value={avgRating} precision={0.1} size="small" readOnly />
            <Typography variant="body2" color="text.secondary">
              ({listing.reviewCount})
            </Typography>
          </Box>
        )}
        {listing.stock > 0 && (
          <Typography variant="caption" color="text.secondary">
            {listing.stock - listing.sold} available
          </Typography>
        )}
      </CardContent>
      <CardActions>
        <Button size="small" fullWidth variant="outlined" disabled={!available}>
          {available ? 'View Details' : 'Unavailable'}
        </Button>
      </CardActions>
    </Card>
  );
};
