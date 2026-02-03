import { useState, useCallback, useEffect } from 'react';
import bankHierarchyApi, {
  Employee,
  Department,
  PerformanceData,
  PromotionEligibility,
  DepartmentStructure,
} from '../lib/api/bank-hierarchy.api';

interface UseBankHierarchyReturn {
  // State
  employees: Employee[];
  departments: Department[];
  currentEmployee: Employee | null;
  performance: PerformanceData | null;
  promotionEligibility: PromotionEligibility | null;
  loading: boolean;
  error: string | null;

  // Actions
  registerEmployee: (data: {
    seatId: number;
    departmentId: number;
    position: number;
    salary: string;
  }) => Promise<void>;
  fetchEmployee: (id: number) => Promise<void>;
  fetchDepartments: () => Promise<void>;
  fetchDepartmentEmployees: (departmentId: number) => Promise<void>;
  fetchPerformance: (employeeId: number) => Promise<void>;
  rateEmployee: (employeeId: number, score: number) => Promise<void>;
  checkPromotion: (employeeId: number) => Promise<void>;
  promoteEmployee: (employeeId: number) => Promise<void>;
  setManager: (departmentId: number, managerId: number) => Promise<void>;
}

/**
 * Custom hook for Bank Hierarchy operations
 * 
 * @example
 * const { registerEmployee, loading, error } = useBankHierarchy();
 * 
 * await registerEmployee({
 *   seatId: 123,
 *   departmentId: 1,
 *   position: 0,
 *   salary: '50000'
 * });
 */
export const useBankHierarchy = (): UseBankHierarchyReturn => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [promotionEligibility, setPromotionEligibility] = useState<PromotionEligibility | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Register new employee
   */
  const registerEmployee = useCallback(async (data: {
    seatId: number;
    departmentId: number;
    position: number;
    salary: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await bankHierarchyApi.registerEmployee(data);
      console.log('Employee registered:', result);
      
      // Fetch updated employee
      await fetchEmployee(result.employeeId);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to register employee');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch employee by ID
   */
  const fetchEmployee = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const employee = await bankHierarchyApi.getEmployee(id);
      setCurrentEmployee(employee);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch employee');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch all departments
   */
  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const depts = await bankHierarchyApi.getDepartments();
      setDepartments(depts);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch departments');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch employees in a department
   */
  const fetchDepartmentEmployees = useCallback(async (departmentId: number) => {
    setLoading(true);
    setError(null);
    try {
      const emps = await bankHierarchyApi.getDepartmentEmployees(departmentId);
      setEmployees(emps);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch employees');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch employee performance
   */
  const fetchPerformance = useCallback(async (employeeId: number) => {
    setLoading(true);
    setError(null);
    try {
      const perf = await bankHierarchyApi.getPerformance(employeeId);
      setPerformance(perf);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch performance');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Rate an employee
   */
  const rateEmployee = useCallback(async (employeeId: number, score: number) => {
    setLoading(true);
    setError(null);
    try {
      await bankHierarchyApi.rateEmployee(employeeId, score);
      
      // Refresh performance data
      await fetchPerformance(employeeId);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to rate employee');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchPerformance]);

  /**
   * Check promotion eligibility
   */
  const checkPromotion = useCallback(async (employeeId: number) => {
    setLoading(true);
    setError(null);
    try {
      const eligibility = await bankHierarchyApi.checkPromotionEligibility(employeeId);
      setPromotionEligibility(eligibility);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to check promotion');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Promote employee
   */
  const promoteEmployee = useCallback(async (employeeId: number) => {
    setLoading(true);
    setError(null);
    try {
      await bankHierarchyApi.promoteEmployee(employeeId);
      
      // Refresh employee and eligibility data
      await fetchEmployee(employeeId);
      await checkPromotion(employeeId);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to promote employee');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchEmployee, checkPromotion]);

  /**
   * Set department manager
   */
  const setManager = useCallback(async (departmentId: number, managerId: number) => {
    setLoading(true);
    setError(null);
    try {
      await bankHierarchyApi.setManager(departmentId, managerId);
      
      // Refresh departments
      await fetchDepartments();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to set manager');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchDepartments]);

  return {
    employees,
    departments,
    currentEmployee,
    performance,
    promotionEligibility,
    loading,
    error,
    registerEmployee,
    fetchEmployee,
    fetchDepartments,
    fetchDepartmentEmployees,
    fetchPerformance,
    rateEmployee,
    checkPromotion,
    promoteEmployee,
    setManager,
  };
};

export default useBankHierarchy;
