import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
} from '@mui/material';
import { CheckCircle, Error, Schedule, Payment } from '@mui/icons-material';
import { arbanAPI } from '../../../lib/api/arban.api';

interface Loan {
  loanId: number;
  arbanId: number;
  creditType: number;
  principal: string;
  interest: string;
  totalDue: string;
  dueDate: string;
  borrowedAt: string;
  repaidAt: string | null;
  isActive: boolean;
  isDefaulted: boolean;
}

interface LoansListProps {
  arbanId: number;
  type: 'family' | 'org';
  onRepay?: (loanIdx: number) => void;
}

export const LoansList: React.FC<LoansListProps> = ({ arbanId, type, onRepay }) => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    loadLoans();
  }, [arbanId, type]);

  const loadLoans = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await arbanAPI.credit[type].getLoans(arbanId);
      setLoans(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load loans');
    } finally {
      setLoading(false);
    }
  };

  const activeLoans = loans.filter((loan) => loan.isActive);
  const historyLoans = loans.filter((loan) => !loan.isActive);

  const formatAmount = (amount: string) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(parseFloat(amount));
  };

  const getLoanStatus = (loan: Loan) => {
    if (!loan.isActive && loan.repaidAt) {
      const borrowed = new Date(loan.borrowedAt);
      const repaid = new Date(loan.repaidAt);
      const due = new Date(loan.dueDate);
      const onTime = repaid <= due;

      return {
        label: onTime ? 'Repaid (On-time)' : 'Repaid (Late)',
        color: onTime ? 'success' : 'warning',
        icon: <CheckCircle />,
      };
    }

    if (loan.isDefaulted) {
      return {
        label: 'Defaulted',
        color: 'error' as const,
        icon: <Error />,
      };
    }

    const dueDate = new Date(loan.dueDate);
    const now = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilDue < 0) {
      return {
        label: 'Overdue',
        color: 'error' as const,
        icon: <Error />,
      };
    }

    if (daysUntilDue <= 7) {
      return {
        label: `Due in ${daysUntilDue} days`,
        color: 'warning' as const,
        icon: <Schedule />,
      };
    }

    return {
      label: 'Active',
      color: 'primary' as const,
      icon: <Schedule />,
    };
  };

  const renderLoansTable = (loansList: Loan[]) => {
    if (loansList.length === 0) {
      return (
        <Alert severity="info">
          {activeTab === 0 ? 'No active loans' : 'No loan history'}
        </Alert>
      );
    }

    return (
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Loan ID</TableCell>
              <TableCell align="right">Principal</TableCell>
              <TableCell align="right">Interest</TableCell>
              <TableCell align="right">Total Due</TableCell>
              <TableCell>Due Date</TableCell>
              <TableCell>Status</TableCell>
              {activeTab === 0 && <TableCell align="center">Action</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {loansList.map((loan, idx) => {
              const status = getLoanStatus(loan);

              return (
                <TableRow key={loan.loanId}>
                  <TableCell>#{loan.loanId}</TableCell>
                  <TableCell align="right">{formatAmount(loan.principal)} ₳</TableCell>
                  <TableCell align="right">{formatAmount(loan.interest)} ₳</TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="bold">
                      {formatAmount(loan.totalDue)} ₳
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {new Date(loan.dueDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={status.icon}
                      label={status.label}
                      color={status.color}
                      size="small"
                    />
                  </TableCell>
                  {activeTab === 0 && (
                    <TableCell align="center">
                      {loan.isActive && onRepay && (
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<Payment />}
                          onClick={() => onRepay(idx)}
                        >
                          Repay
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">{error}</Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card elevation={3}>
      <CardContent>
        <Typography variant="h5" sx={{ mb: 3 }}>
          Loans
        </Typography>

        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Active
                <Chip label={activeLoans.length} size="small" color="primary" />
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                History
                <Chip label={historyLoans.length} size="small" />
              </Box>
            }
          />
        </Tabs>

        {activeTab === 0 ? renderLoansTable(activeLoans) : renderLoansTable(historyLoans)}
      </CardContent>
    </Card>
  );
};
