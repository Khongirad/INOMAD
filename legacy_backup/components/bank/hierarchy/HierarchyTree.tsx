import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Chip,
  Avatar,
  IconButton,
  Collapse,
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  Person,
  Business,
} from '@mui/icons-material';
import { useBankHierarchy } from '../../../hooks/useBankHierarchy';
import { Department, Employee } from '../../../lib/api/bank-hierarchy.api';
import {getTierLabel, getPositionLabel } from '../../../lib/api/bank-hierarchy.api';

interface DepartmentNodeProps {
  departmentId: number;
}

/**
 * @component DepartmentNode  
 * @description Renders a single department node with employees
 */
const DepartmentNode: React.FC<DepartmentNodeProps> = ({ departmentId }) => {
  const { fetchDepartmentEmployees, loading } = useBankHierarchy();
  const [expanded, setExpanded] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [department, setDepartment] = useState<Department | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const emps = await fetchDepartmentEmployees(departmentId);
        setEmployees(emps);
      } catch (err) {
        console.error('Failed to load department:', err);
      }
    };

    if (expanded) {
      loadData();
    }
  }, [departmentId, expanded, fetchDepartmentEmployees]);

  const handleToggle = () => {
    setExpanded(!expanded);
  };

  return (
    <Paper elevation={2} sx={{ mb: 2, overflow: 'hidden' }}>
      {/* Department Header */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: 'primary.main',
          color: 'white',
          cursor: 'pointer',
        }}
        onClick={handleToggle}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <Business />
          <Box>
            <Typography variant="h6" fontWeight="bold">
              Department #{departmentId}
            </Typography>
            <Typography variant="caption">
              {employees.length} employees
            </Typography>
          </Box>
        </Box>

        <IconButton size="small" sx={{ color: 'white' }}>
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Box>

      {/* Employee List */}
      <Collapse in={expanded}>
        <Box p={2}>
          {loading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : employees.length === 0 ? (
            <Typography variant="body2" color="text.secondary" textAlign="center">
              No employees in this department
            </Typography>
          ) : (
            <Box display="grid" gridTemplateColumns="repeat(auto-fill, minmax(250px, 1fr))" gap={2}>
              {employees.map((emp) => (
                <Card key={emp.id} variant="outlined">
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={2} mb={1}>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        <Person />
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2" fontWeight="bold">
                          Seat #{emp.seatId}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Employee #{emp.id}
                        </Typography>
                      </Box>
                    </Box>

                    <Chip
                      label={getPositionLabel(emp.position)}
                      size="small"
                      color="primary"
                      sx={{ mb: 1 }}
                    />

                    <Typography variant="body2" color="text.secondary">
                      Salary: {parseInt(emp.salary).toLocaleString()} ALTAN
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Performance: {emp.performanceScore}/100
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Hired: {new Date(emp.hireDate).toLocaleDateString()}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
};

/**
 * @component HierarchyTree
 * @description Visual organization chart for Bank of Siberia
 * 
 * Features:
 * - Department breakdown
 * - Employee count
 * - Expandable sections
 * - Visual hierarchy
 */
export const HierarchyTree: React.FC = () => {
  const { departments, fetchDepartments, loading, error } = useBankHierarchy();
  const [tierFilter, setTierFilter] = useState<number | 'all'>('all');

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const filteredDepartments = tierFilter === 'all'
    ? departments
    : departments.filter(d => d.tier === tierFilter);

  const tier1Count = departments.filter(d => d.tier === 1).length;
  const tier2Count = departments.filter(d => d.tier === 2).length;
  const tier3Count = departments.filter(d => d.tier === 3).length;

  return (
    <Box>
      <Typography variant="h5" gutterBottom fontWeight="bold">
        Organization Chart
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Click on departments to view employees and their details
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Tier Filter */}
      <Box display="flex" gap={2} mb={3} flexWrap="wrap">
        <Chip
          label="All Departments"
          onClick={() => setTierFilter('all')}
          color={tierFilter === 'all' ? 'primary' : 'default'}
          sx={{ cursor: 'pointer' }}
        />
        <Chip
          label={`Tier 1 - Strategic (${tier1Count})`}
          onClick={() => setTierFilter(1)}
          color={tierFilter === 1 ? 'primary' : 'default'}
          sx={{ cursor: 'pointer' }}
        />
        <Chip
          label={`Tier 2 - Operational (${tier2Count})`}
          onClick={() => setTierFilter(2)}
          color={tierFilter === 2 ? 'primary' : 'default'}
          sx={{ cursor: 'pointer' }}
        />
        <Chip
          label={`Tier 3 - Retail (${tier3Count})`}
          onClick={() => setTierFilter(3)}
          color={tierFilter === 3 ? 'primary' : 'default'}
          sx={{ cursor: 'pointer' }}
        />
      </Box>

      {/* Department Tree */}
      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : filteredDepartments.length === 0 ? (
        <Paper elevation={0} sx={{ p: 6, textAlign: 'center', bgcolor: 'background.default' }}>
          <Typography variant="h6" color="text.secondary">
            No departments found
          </Typography>
        </Paper>
      ) : (
        <Box>
          {/* Group by tier */}
          {[1, 2, 3].map((tier) => {
            const tierDepts = filteredDepartments.filter(d => d.tier === tier);
            if (tierDepts.length === 0) return null;

            return (
              <Box key={tier} mb={4}>
                <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                  <Business color="primary" />
                  {getTierLabel(tier)}
                  <Chip label={`${tierDepts.length} departments`} size="small" />
                </Typography>

                {tierDepts.map((dept) => (
                  <DepartmentNode key={dept.id} departmentId={dept.id} />
                ))}
              </Box>
            );
          })}
        </Box>
      )}

      {/* Summary Stats */}
      <Paper elevation={0} sx={{ p: 3, mt: 4, bgcolor: 'background.default' }}>
        <Typography variant="h6" gutterBottom>
          Organization Statistics
        </Typography>
        <Box display="flex" gap={4} flexWrap="wrap">
          <Box>
            <Typography variant="h4" fontWeight="bold" color="primary.main">
              {departments.length}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Total Departments
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
              {departments.filter(d => d.managerId).length}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Departments with Managers
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default HierarchyTree;
