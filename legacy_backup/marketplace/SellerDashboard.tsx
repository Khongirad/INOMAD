/**
 * SellerDashboard Component
 * 
 * Seller management dashboard with:
 * - My listings overview
 * - Sales tracking
 * - Order management
 * - Quick actions (edit, pause, delete)
 * - Statistics
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Menu,
  MenuItem,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Avatar,
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Pause as PauseIcon,
  TrendingUp as StatsIcon,
  Inventory as InventoryIcon,
  ShoppingBag as SalesIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useMarketplace } from '../../hooks/useMarketplace';
import {
  MarketplaceListing,
  MarketplacePurchase,
  formatPrice,
  getStatusColor,
  getPurchaseStatusColor,
} from '../../lib/api/marketplace.api';

export const SellerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const {
    myListings,
    mySales,
    loading,
    error,
    fetchMyListings,
    fetchMySales,
    deleteListing,
    clearError,
  } = useMarketplace();

  const [activeTab, setActiveTab] = useState(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedListing, setSelectedListing] = useState<string | null>(null);

  useEffect(() => {
    fetchMyListings();
    fetchMySales();
  }, []);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, listingId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedListing(listingId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedListing(null);
  };

  const handleEdit = () => {
    if (selectedListing) {
      navigate(`/marketplace/listings/${selectedListing}/edit`);
    }
    handleMenuClose();
  };

  const handleDelete = async () => {
    if (selectedListing) {
      await deleteListing(selectedListing);
      fetchMyListings();
    }
    handleMenuClose();
  };

  const stats = {
    totalListings: myListings.length,
    activeListings: myListings.filter((l) => l.status === 'ACTIVE').length,
    totalSales: mySales.length,
    revenue: mySales
      .filter((s) => s.status === 'COMPLETED')
      .reduce((sum, s) => sum + parseFloat(s.totalPrice), 0),
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Seller Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your marketplace listings and track sales
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/marketplace/create')}
        >
          New Listing
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={clearError} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <InventoryIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.totalListings}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Listings
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <StatsIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.activeListings}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Listings
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'info.main' }}>
                  <SalesIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.totalSales}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Sales
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'warning.main' }}>
                  <TrendingUp />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {formatPrice(stats.revenue.toString())}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Revenue (ALTAN)
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Card>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
          <Tab label={`My Listings (${myListings.length})`} />
          <Tab label={`Sales (${mySales.length})`} />
        </Tabs>

        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : activeTab === 0 ? (
            <ListingsTable
              listings={myListings}
              onMenuOpen={handleMenuOpen}
              onView={(id) => navigate(`/marketplace/listings/${id}`)}
            />
          ) : (
            <SalesTable sales={mySales} />
          )}
        </CardContent>
      </Card>

      {/* Actions Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={handleEdit}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={handleDelete}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>
    </Container>
  );
};

// ListingsTable Component
interface ListingsTableProps {
  listings: MarketplaceListing[];
  onMenuOpen: (event: React.MouseEvent<HTMLElement>, id: string) => void;
  onView: (id: string) => void;
}

const ListingsTable: React.FC<ListingsTableProps> = ({ listings, onMenuOpen, onView }) => {
  if (listings.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body1" color="text.secondary">
          No listings yet. Create your first listing to get started!
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Title</TableCell>
            <TableCell>Price</TableCell>
            <TableCell>Stock</TableCell>
            <TableCell>Sold</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {listings.map((listing) => (
            <TableRow key={listing.id} hover>
              <TableCell>
                <Typography variant="body2" fontWeight="medium">
                  {listing.title}
                </Typography>
              </TableCell>
              <TableCell>{formatPrice(listing.price)} ALTAN</TableCell>
              <TableCell>{listing.stock - listing.sold}</TableCell>
              <TableCell>{listing.sold}</TableCell>
              <TableCell>
                <Chip
                  label={listing.status}
                  color={getStatusColor(listing.status) as any}
                  size="small"
                />
              </TableCell>
              <TableCell align="right">
                <Button size="small" onClick={() => onView(listing.id)} sx={{ mr: 1 }}>
                  View
                </Button>
                <IconButton size="small" onClick={(e) => onMenuOpen(e, listing.id)}>
                  <MoreIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

// SalesTable Component
interface SalesTableProps {
  sales: MarketplacePurchase[];
}

const SalesTable: React.FC<SalesTableProps> = ({ sales }) => {
  if (sales.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body1" color="text.secondary">
          No sales yet. Your sales will appear here.
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Order ID</TableCell>
            <TableCell>Item</TableCell>
            <TableCell>Quantity</TableCell>
            <TableCell>Total</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Date</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sales.map((sale) => (
            <TableRow key={sale.id} hover>
              <TableCell>
                <Typography variant="body2" fontFamily="monospace">
                  #{sale.id.substring(0, 8)}
                </Typography>
              </TableCell>
              <TableCell>{sale.listingId}</TableCell>
              <TableCell>{sale.quantity}</TableCell>
              <TableCell>{formatPrice(sale.totalPrice)} ALTAN</TableCell>
              <TableCell>
                <Chip
                  label={sale.status}
                  color={getPurchaseStatusColor(sale.status) as any}
                  size="small"
                />
              </TableCell>
              <TableCell>
                {new Date(sale.createdAt).toLocaleDateString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
