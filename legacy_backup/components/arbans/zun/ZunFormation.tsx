import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Chip,
  FormControl,
  FormGroup,
  FormControlLabel,
  Checkbox,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Group, Add, Remove, Info } from '@mui/icons-material';
import { arbanAPI } from '../../../lib/api/arban.api';

interface ZunFormationProps {
  onSuccess?: (zunId: number) => void;
}

export const ZunFormation: React.FC<ZunFormationProps> = ({ onSuccess }) => {
  const [zunName, setZunName] = useState('');
  const [arbanIds, setArbanIds] = useState<number[]>([]);
  const [newArbanId, setNewArbanId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ zunId: number; txHash: string } | null>(null);

  const handleAddArban = () => {
    const id = Number(newArbanId);
    if (!id || id <= 0) {
      setError('Please enter a valid Arban ID');
      return;
    }

    if (arbanIds.includes(id)) {
      setError('This Arban is already added');
      return;
    }

    setArbanIds([...arbanIds, id]);
    setNewArbanId('');
    setError(null);
  };

  const handleRemoveArban = (id: number) => {
    setArbanIds(arbanIds.filter((arbanId) => arbanId !== id));
  };

  const handleSubmit = async () => {
    if (!zunName.trim()) {
      setError('Please enter a Zun name');
      return;
    }

    if (arbanIds.length < 2) {
      setError('At least 2 Family Arbans are required to form a Zun');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await arbanAPI.zun.formZun({
        zunName: zunName.trim(),
        arbanIds,
      });

      setSuccess(response.data);

      if (onSuccess) {
        onSuccess(response.data.zunId);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to form Zun');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card elevation={3}>
        <CardContent>
          <Alert severity="success" sx={{ mb: 3 }}>
            Zun formed successfully!
          </Alert>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {zunName}
          </Typography>
          <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1, mb: 2 }}>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>Zun ID:</strong> {success.zunId}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
              <strong>Transaction Hash:</strong> {success.txHash}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Member Arbans: {arbanIds.join(', ')}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card elevation={3}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Group sx={{ fontSize: 40, color: 'secondary.main', mr: 2 }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" component="h1">
              Form Zun (Clan)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Unite multiple Family Arbans into a clan network
            </Typography>
          </Box>
          <Tooltip title="A Zun is a clan formed by 2 or more Family Arbans. It represents kinship networks and family alliances.">
            <IconButton size="small">
              <Info />
            </IconButton>
          </Tooltip>
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          Minimum 2 Family Arbans required. All members must be active and not already in another
          Zun.
        </Alert>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Zun Name */}
        <TextField
          fullWidth
          label="Zun Name"
          value={zunName}
          onChange={(e) => setZunName(e.target.value)}
          placeholder="e.g., Golden Horde, Blue Wolf Clan"
          helperText="Choose a meaningful name for your clan"
          sx={{ mb: 3 }}
        />

        {/* Add Arban Section */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Add Family Arbans
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              label="Family Arban ID"
              value={newArbanId}
              onChange={(e) => setNewArbanId(e.target.value)}
              type="number"
              placeholder="Enter Arban ID"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddArban();
                }
              }}
            />
            <Button
              variant="outlined"
              onClick={handleAddArban}
              startIcon={<Add />}
              sx={{ minWidth: 120 }}
            >
              Add
            </Button>
          </Box>
        </Box>

        {/* Selected Arbans */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Selected Family Arbans ({arbanIds.length})
          </Typography>

          {arbanIds.length === 0 ? (
            <Alert severity="warning">No Family Arbans added yet</Alert>
          ) : (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {arbanIds.map((id) => (
                <Chip
                  key={id}
                  label={`Arban #${id}`}
                  onDelete={() => handleRemoveArban(id)}
                  deleteIcon={<Remove />}
                  color="secondary"
                  variant="outlined"
                />
              ))}
            </Box>
          )}

          {arbanIds.length === 1 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Add at least one more Family Arban to form a Zun
            </Alert>
          )}
        </Box>

        {/* Submit Button */}
        <Button
          fullWidth
          variant="contained"
          color="secondary"
          size="large"
          onClick={handleSubmit}
          disabled={loading || !zunName.trim() || arbanIds.length < 2}
          startIcon={loading ? <CircularProgress size={20} /> : <Group />}
        >
          {loading ? 'Forming Zun...' : 'Form Zun'}
        </Button>

        {/* Info */}
        <Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>What is a Zun?</strong>
            <br />A Zun (Clan) represents kinship networks and family alliances. Members can support
            each other, share resources, and coordinate at the clan level. The founder Arban can
            appoint a Zun Elder to lead the clan.
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};
