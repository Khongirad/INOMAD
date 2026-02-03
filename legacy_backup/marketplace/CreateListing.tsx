/**
 * CreateListing Component
 * 
 * Multi-step form for creating/editing marketplace listings:
 * - Step 1: Basic info (title, description, type)
 * - Step 2: Pricing & stock
 * - Step 3: Images
 * - Draft saving functionality
 * - Edit existing listings
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stepper,
  Step,
  StepLabel,
  Alert,
  CircularProgress,
  Grid,
  InputAdornment,
  IconButton,
  Chip,
  Stack,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  ArrowForward as NextIcon,
  Save as SaveIcon,
  Publish as PublishIcon,
  PhotoCamera as PhotoIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useMarketplace } from '../../hooks/useMarketplace';
import { MarketplaceListingType } from '../../lib/api/marketplace.api';

const steps = ['Basic Information', 'Pricing & Stock', 'Images & Preview'];

export const CreateListing: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { currentListing, loading, error, createListing, updateListing, getListing, clearError } = useMarketplace();

  const [activeStep, setActiveStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [listingType, setListingType] = useState<MarketplaceListingType>('PHYSICAL_GOOD');
  const [categoryId, setCategoryId] = useState<number>(1);
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('1');
  const [images, setImages] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState('');

  // Load existing listing if editing
  useEffect(() => {
    if (id) {
      getListing(id);
    }
  }, [id]);

  useEffect(() => {
    if (currentListing && id) {
      setTitle(currentListing.title);
      setDescription(currentListing.description);
      setListingType(currentListing.listingType);
      setCategoryId(currentListing.categoryId);
      setPrice(currentListing.price);
      setStock(currentListing.stock.toString());
      setImages(currentListing.images || []);
    }
  }, [currentListing, id]);

  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleAddImage = () => {
    if (imageUrl.trim()) {
      setImages([...images, imageUrl.trim()]);
      setImageUrl('');
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0:
        return !!(title.trim() && description.trim());
      case 1:
        return !!(price && parseFloat(price) > 0 && stock && parseInt(stock) >= 0);
      case 2:
        return images.length > 0;
      default:
        return true;
    }
  };

  const handleSaveDraft = async () => {
    await handleSubmit('DRAFT');
  };

  const handlePublish = async () => {
    await handleSubmit('ACTIVE');
  };

  const handleSubmit = async (status: 'DRAFT' | 'ACTIVE') => {
    setSaving(true);

    const data = {
      title,
      description,
      listingType,
      categoryId,
      price,
      stock: parseInt(stock),
      images,
      status,
    };

    let success;
    if (id) {
      success = await updateListing(id, data);
    } else {
      const result = await createListing(data);
      success = !!result;
    }

    setSaving(false);

    if (success) {
      navigate('/marketplace/my-listings');
    }
  };

  if (loading && id) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/marketplace')} sx={{ mb: 2 }}>
          Back to Marketplace
        </Button>
        <Typography variant="h4" fontWeight="bold">
          {id ? 'Edit Listing' : 'Create New Listing'}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          List your products or services on the ALTAN marketplace
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" onClose={clearError} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Stepper */}
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Form Steps */}
      <Card>
        <CardContent sx={{ p: 4 }}>
          {activeStep === 0 && (
            <Stack spacing={3}>
              <Typography variant="h6">Basic Information</Typography>

              <TextField
                label="Listing Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                fullWidth
                required
                placeholder="e.g., Handmade Leather Wallet"
              />

              <TextField
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                multiline
                rows={6}
                fullWidth
                required
                placeholder="Describe your item in detail..."
              />

              <FormControl fullWidth required>
                <InputLabel>Listing Type</InputLabel>
                <Select
                  value={listingType}
                  label="Listing Type"
                  onChange={(e) => setListingType(e.target.value as MarketplaceListingType)}
                >
                  <MenuItem value="PHYSICAL_GOOD">Physical Good</MenuItem>
                  <MenuItem value="DIGITAL_GOOD">Digital Good</MenuItem>
                  <MenuItem value="SERVICE">Service</MenuItem>
                  <MenuItem value="WORK">Work</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth required>
                <InputLabel>Category</InputLabel>
                <Select
                  value={categoryId}
                  label="Category"
                  onChange={(e) => setCategoryId(e.target.value as number)}
                >
                  <MenuItem value={1}>General</MenuItem>
                  <MenuItem value={2}>Electronics</MenuItem>
                  <MenuItem value={3}>Fashion</MenuItem>
                  <MenuItem value={4}>Home & Garden</MenuItem>
                  <MenuItem value={5}>Services</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          )}

          {activeStep === 1 && (
            <Stack spacing={3}>
              <Typography variant="h6">Pricing & Inventory</Typography>

              <TextField
                label="Price"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                type="number"
                fullWidth
                required
                InputProps={{
                  endAdornment: <InputAdornment position="end">ALTAN</InputAdornment>,
                }}
                inputProps={{ min: 0, step: 0.01 }}
              />

              <TextField
                label="Stock Quantity"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                type="number"
                fullWidth
                required
                helperText="Set to 0 for unlimited or digital goods"
                inputProps={{ min: 0 }}
              />

              <Alert severity="info">
                <Typography variant="body2" fontWeight="bold" gutterBottom>
                  Pricing Tips:
                </Typography>
                <Typography variant="body2">
                  • Research similar items to set competitive prices
                  <br />
                  • Consider your costs and desired profit margin
                  <br />
                  • Digital goods and services often have unlimited stock
                </Typography>
              </Alert>
            </Stack>
          )}

          {activeStep === 2 && (
            <Stack spacing={3}>
              <Typography variant="h6">Images & Preview</Typography>

              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Add images to make your listing more attractive
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <TextField
                    label="Image URL"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    fullWidth
                    placeholder="https://example.com/image.jpg"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddImage()}
                  />
                  <Button
                    variant="outlined"
                    onClick={handleAddImage}
                    disabled={!imageUrl.trim()}
                    startIcon={<PhotoIcon />}
                  >
                    Add
                  </Button>
                </Box>
              </Box>

              {images.length > 0 && (
                <Box>
                  <Typography variant="body2" gutterBottom>
                    Images ({images.length})
                  </Typography>
                  <Grid container spacing={2}>
                    {images.map((img, idx) => (
                      <Grid item xs={6} sm={4} key={idx}>
                        <Card>
                          <Box
                            sx={{
                              position: 'relative',
                              paddingTop: '100%',
                              backgroundImage: `url(${img})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                            }}
                          >
                            <IconButton
                              sx={{
                                position: 'absolute',
                                top: 4,
                                right: 4,
                                bgcolor: 'error.main',
                                color: 'white',
                                '&:hover': { bgcolor: 'error.dark' },
                              }}
                              size="small"
                              onClick={() => handleRemoveImage(idx)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                            {idx === 0 && (
                              <Chip
                                label="Main"
                                color="primary"
                                size="small"
                                sx={{ position: 'absolute', bottom: 8, left: 8 }}
                              />
                            )}
                          </Box>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}

              {images.length === 0 && (
                <Alert severity="warning">
                  Please add at least one image to your listing
                </Alert>
              )}

              <Alert severity="info">
                First image will be used as the main thumbnail
              </Alert>
            </Stack>
          )}

          {/* Navigation Buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
              startIcon={<BackIcon />}
            >
              Back
            </Button>

            <Box sx={{ display: 'flex', gap: 1 }}>
              {activeStep < steps.length - 1 ? (
                <Button
                  variant="contained"
                  onClick={handleNext}
                  endIcon={<NextIcon />}
                  disabled={!validateStep(activeStep)}
                >
                  Next
                </Button>
              ) : (
                <>
                  <Button
                    variant="outlined"
                    onClick={handleSaveDraft}
                    startIcon={<SaveIcon />}
                    disabled={saving || !validateStep(activeStep)}
                  >
                    Save Draft
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handlePublish}
                    startIcon={<PublishIcon />}
                    disabled={saving || !validateStep(activeStep)}
                  >
                    {saving ? <CircularProgress size={24} /> : 'Publish'}
                  </Button>
                </>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};
