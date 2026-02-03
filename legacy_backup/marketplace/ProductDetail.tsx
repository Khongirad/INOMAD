/**
 * ProductDetail Component
 * 
 * Single product view with:
 * - Image gallery
 * - Full description
 * - Seller information
 * - Reviews/ratings
 * - Purchase button
 * - Stock information
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardMedia,
  Typography,
  Button,
  Chip,
  Rating,
  Divider,
  Avatar,
  Stack,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  ShoppingCart as CartIcon,
  Store as StoreIcon,
  CheckCircle as AvailableIcon,
  Cancel as UnavailableIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useMarketplace } from '../../hooks/useMarketplace';
import {
  calculateAverageRating,
  formatPrice,
  isListingAvailable,
  getStatusColor,
} from '../../lib/api/marketplace.api';

export const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentListing, loading, error, getListing, purchaseItem, clearError } = use Marketplace();

  const [selectedImage, setSelectedImage] = useState(0);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [shippingAddress, setShippingAddress] = useState('');
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    if (id) {
      getListing(id);
    }
  }, [id]);

  const handlePurchase = async () => {
    if (!currentListing) return;

    setPurchasing(true);
    const success = await purchaseItem({
      listingId: currentListing.id,
      quantity,
      shippingAddress: currentListing.listingType === 'PHYSICAL_GOOD' ? shippingAddress : undefined,
    });

    setPurchasing(false);

    if (success) {
      setPurchaseDialogOpen(false);
      // Navigate to purchases page
      navigate('/marketplace/my-purchases');
    }
  };

  if (loading || !currentListing) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  const available = isListingAvailable(currentListing);
  const avgRating = calculateAverageRating(currentListing.totalRating, currentListing.reviewCount);
  const images = currentListing.images?.length ? currentListing.images : ['https://via.placeholder.com/600'];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Back Button */}
      <Button onClick={() => navigate('/marketplace')} sx={{ mb: 2 }}>
        ← Back to Marketplace
      </Button>

      {error && (
        <Alert severity="error" onClose={clearError} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={4}>
        {/* Image Gallery */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardMedia
              component="img"
              image={images[selectedImage]}
              alt={currentListing.title}
              sx={{ height: 400, objectFit: 'cover' }}
            />
          </Card>
          {images.length > 1 && (
            <Box sx={{ display: 'flex', gap: 1, mt: 2, overflowX: 'auto' }}>
              {images.map((img, idx) => (
                <Card
                  key={idx}
                  sx={{
                    minWidth: 80,
                    cursor: 'pointer',
                    border: selectedImage === idx ? 2 : 0,
                    borderColor: 'primary.main',
                  }}
                  onClick={() => setSelectedImage(idx)}
                >
                  <CardMedia
                    component="img"
                    image={img}
                    alt={`Image ${idx + 1}`}
                    sx={{ height: 80, objectFit: 'cover' }}
                  />
                </Card>
              ))}
            </Box>
          )}
        </Grid>

        {/* Product Info */}
        <Grid item xs={12} md={6}>
          <Box>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Chip
                label={currentListing.status}
                color={getStatusColor(currentListing.status) as any}
              />
              <Chip
                label={currentListing.listingType.replace('_', ' ')}
                variant="outlined"
              />
            </Box>

            <Typography variant="h4" fontWeight="bold" gutterBottom>
              {currentListing.title}
            </Typography>

            {currentListing.reviewCount > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Rating value={avgRating} precision={0.1} readOnly />
                <Typography variant="body2" color="text.secondary">
                  {avgRating.toFixed(1)} ({currentListing.reviewCount} reviews)
                </Typography>
              </Box>
            )}

            <Typography variant="h3" color="primary" fontWeight="bold" sx={{ mb: 3 }}>
              {formatPrice(currentListing.price)} ALTAN
            </Typography>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>
              Description
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph sx={{ whiteSpace: 'pre-line' }}>
              {currentListing.description}
            </Typography>

            <Divider sx={{ my: 3 }} />

            {/* Stock Info */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Availability
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {available ? (
                  <>
                    <AvailableIcon color="success" />
                    <Typography variant="body1">
                      In Stock ({currentListing.stock - currentListing.sold} available)
                    </Typography>
                  </>
                ) : (
                  <>
                    <UnavailableIcon color="error" />
                    <Typography variant="body1">Out of Stock</Typography>
                  </>
                )}
              </Box>
            </Box>

            {/* Purchase Button */}
            <Button
              variant="contained"
              size="large"
              fullWidth
              startIcon={<CartIcon />}
              onClick={() => setPurchaseDialogOpen(true)}
              disabled={!available}
              sx={{ mb: 2 }}
            >
              {available ? 'Purchase Now' : 'Unavailable'}
            </Button>

            {/* Seller Info */}
            <Card variant="outlined" sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar>
                  <StoreIcon />
                </Avatar>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Sold by
                  </Typography>
                  <Typography variant="h6">Seller #{currentListing.sellerId.substring(0, 8)}...</Typography>
                </Box>
              </Box>
            </Card>
          </Box>
        </Grid>
      </Grid>

      {/* Purchase Dialog */}
      <Dialog open={purchaseDialogOpen} onClose={() => setPurchaseDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Purchase {currentListing.title}</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <TextField
              label="Quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              inputProps={{ min: 1, max: currentListing.stock - currentListing.sold }}
              fullWidth
            />

            {currentListing.listingType === 'PHYSICAL_GOOD' && (
              <TextField
                label="Shipping Address"
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                multiline
                rows={3}
                fullWidth
                required
              />
            )}

            <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1 }}>
              <Typography variant="h6" gutterBottom>
                Order Summary
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>Price per item:</Typography>
                <Typography>{formatPrice(currentListing.price)} ALTAN</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>Quantity:</Typography>
                <Typography>{quantity}</Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="h6">Total:</Typography>
                <Typography variant="h6" color="primary">
                  {formatPrice((parseFloat(currentListing.price) * quantity).toString())} ALTAN
                </Typography>
              </Box>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPurchaseDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handlePurchase}
            disabled={
              purchasing ||
              (currentListing.listingType === 'PHYSICAL_GOOD' && !shippingAddress.trim())
            }
          >
            {purchasing ? <CircularProgress size={24} /> : 'Confirm Purchase'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
