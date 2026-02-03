import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Tabs,
  Tab,
  Box,
  Typography,
  Alert,
} from '@mui/material';
import {
  Business,
  PersonAdd,
  AccountTree,
  TrendingUp,
  EmojiEvents,
} from '@mui/icons-material';
import { useBankHierarchy } from '../hooks/useBankHierarchy';
import EmployeeRegister from '../components/bank/hierarchy/EmployeeRegister';
import HierarchyTree from '../components/bank/hierarchy/HierarchyTree';
import PerformanceTracker from '../components/bank/hierarchy/PerformanceTracker';
import PromotionPanel from '../components/bank/hierarchy/PromotionPanel';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

/**
 * @page BankHierarchyPage
 * @description Main page for Bank of Siberia employee management
 * 
 * Features:
 * - Employee registration
 * - Organization chart
 * - Performance tracking
 * - Promotion management
 */
export const BankHierarchyPage: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const { departments, fetchDepartments, loading, error } = useBankHierarchy();

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h3" gutterBottom fontWeight="bold" display="flex" alignItems="center" gap={2}>
          <Business fontSize="large" color="primary" />
          Bank of Siberia - Employee Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your career at the Bank of Siberia. Register as employee, track performance, and advance your career.
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => {}}>
          {error}
        </Alert>
      )}

      {/* Main Content */}
      <Paper elevation={2}>
        {/* Navigation Tabs */}
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            px: 2,
          }}
        >
          <Tab
            icon={<Business />}
            label="Overview"
            iconPosition="start"
          />
          <Tab
            icon={<PersonAdd />}
            label="Join Bank"
            iconPosition="start"
          />
          <Tab
            icon={<AccountTree />}
            label="Org Chart"
            iconPosition="start"
          />
          <Tab
            icon={<TrendingUp />}
            label="Performance"
            iconPosition="start"
          />
          <Tab
            icon={<EmojiEvents />}
            label="Promotions"
            iconPosition="start"
          />
        </Tabs>

        {/* Tab Content */}
        <TabPanel value={currentTab} index={0}>
          {/* Overview Tab */}
          <Box>
            <Typography variant="h5" gutterBottom fontWeight="bold">
              Bank Overview
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Welcome to Bank of Siberia employee portal. Here you can manage your career, track your performance, and advance through the ranks.
            </Typography>

            {loading ? (
              <Typography>Loading departments...</Typography>
            ) : (
              <Box mt={3}>
                <Typography variant="h6" gutterBottom>
                  Departments ({departments.length})
                </Typography>
                {departments.map((dept) => (
                  <Paper key={dept.id} variant="outlined" sx={{ p: 2, mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {dept.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Tier {dept.tier} • {dept.employeeCount} employees
                    </Typography>
                  </Paper>
                ))}
              </Box>
            )}
          </Box>
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          {/* Employee Registration */}
          <EmployeeRegister
            seatId={123} // TODO: Get from connected user
            onSuccess={() => {
              fetchDepartments();
              setCurrentTab(0); // Go back to overview
            }}
          />
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          {/* Org Chart */}
          <HierarchyTree />
        </TabPanel>

        <TabPanel value={currentTab} index={3}>
          {/* Performance Tracker */}
          <PerformanceTracker employeeId={1} /* TODO: Get from currentEmployee *//>
        </TabPanel>

        <TabPanel value={currentTab} index={4}>
          {/* Promotion Panel */}
          <PromotionPanel employeeId={1} /* TODO: Get from currentEmployee *//>
        </TabPanel>
      </Paper>

      {/* Stats Footer */}
      <Paper elevation={0} sx={{ mt: 3, p: 3, bgcolor: 'background.default' }}>
        <Typography variant="h6" gutterBottom>
          Quick Stats
        </Typography>
        <Box display="flex" gap={4} flexWrap="wrap">
          <Box>
            <Typography variant="h4" fontWeight="bold" color="primary.main">
              {departments.length}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Departments
            </Typography>
          </Box>
          <Box>
            <Typography variant="h4" fontWeight="bold" color="primary.main">
              {departments.reduce((sum, d) => sum + d.employeeCount, 0)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Total Employees
            </Typography>
          </Box>
          <Box>
            <Typography variant="h4" fontWeight="bold" color="primary.main">
              3
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Tiers
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default BankHierarchyPage;
