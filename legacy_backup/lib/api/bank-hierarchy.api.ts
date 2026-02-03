import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface Employee {
  id: number;
  seatId: number;
  departmentId: number;
  position: number;
  salary: string;
  hireDate: string;
  performanceScore: number;
  ratingsCount: number;
  isActive: boolean;
}

export interface Department {
  id: number;
  name: string;
  tier: number;
  managerId?: number;
  parentDeptId?: number;
  employeeCount: number;
}

export interface PerformanceData {
  employeeId: number;
  currentScore: number;
  ratingsCount: number;
  lastRatedAt?: string;
  trend: number; // +/- change
  departmentAverage: number;
  recentRatings: Array<{
    score: number;
    ratedAt: string;
    raterId: number;
  }>;
}

export interface PromotionEligibility {
  employeeId: number;
  currentPosition: number;
  nextPosition: number;
  eligible: boolean;
  requirements: {
    minTime: { required: number; current: number; met: boolean };
    minScore: { required: number; current: number; met: boolean };
    minRatings: { required: number; current: number; met: boolean };
    managerApproval: boolean;
  };
  newSalary?: string;
}

export interface DepartmentStructure {
  department: Department;
  employees: Employee[];
  subdepartments: DepartmentStructure[];
}

/**
 * API client for Bank Hierarchy operations
 */
export const bankHierarchyApi = {
  /**
   * Register new employee
   */
  registerEmployee: async (data: {
    seatId: number;
    departmentId: number;
    position: number;
    salary: string;
  }): Promise<{ employeeId: number; txHash: string }> => {
    const response = await axios.post(`${API_BASE}/bank/hierarchy/employees`, data);
    return response.data;
  },

  /**
   * Get employee by ID
   */
  getEmployee: async (id: number): Promise<Employee> => {
    const response = await axios.get(`${API_BASE}/bank/hierarchy/employees/${id}`);
    return response.data;
  },

  /**
   * Get all employees in a department
   */
  getDepartmentEmployees: async (departmentId: number): Promise<Employee[]> => {
    const response = await axios.get(`${API_BASE}/bank/hierarchy/departments/${departmentId}/employees`);
    return response.data;
  },

  /**
   * Get department structure (tree)
   */
  getDepartmentStructure: async (departmentId: number): Promise<DepartmentStructure> => {
    const response = await axios.get(`${API_BASE}/bank/hierarchy/departments/${departmentId}/structure`);
    return response.data;
  },

  /**
   * Get all departments
   */
  getDepartments: async (): Promise<Department[]> => {
    const response = await axios.get(`${API_BASE}/bank/hierarchy/departments`);
    return response.data;
  },

  /**
   * Get employee performance data
   */
  getPerformance: async (employeeId: number): Promise<PerformanceData> => {
    const response = await axios.get(`${API_BASE}/bank/hierarchy/employees/${employeeId}/performance`);
    return response.data;
  },

  /**
   * Rate an employee
   */
  rateEmployee: async (employeeId: number, score: number): Promise<{ txHash: string }> => {
    const response = await axios.post(`${API_BASE}/bank/hierarchy/employees/${employeeId}/rate`, {
      score,
    });
    return response.data;
  },

  /**
   * Check promotion eligibility
   */
  checkPromotionEligibility: async (employeeId: number): Promise<PromotionEligibility> => {
    const response = await axios.get(`${API_BASE}/bank/hierarchy/employees/${employeeId}/promotion-eligibility`);
    return response.data;
  },

  /**
   * Promote employee
   */
  promoteEmployee: async (employeeId: number): Promise<{ txHash: string }> => {
    const response = await axios.post(`${API_BASE}/bank/hierarchy/employees/${employeeId}/promote`);
    return response.data;
  },

  /**
   * Set department manager
   */
  setManager: async (departmentId: number, managerId: number): Promise<{ txHash: string }> => {
    const response = await axios.put(`${API_BASE}/bank/hierarchy/departments/${departmentId}/manager`, {
      managerId,
    });
    return response.data;
  },
};

/**
 * Position labels helper
 */
export const getPositionLabel = (position: number): string => {
  const labels = [
    'Junior Analyst',       // 0
    'Analyst',              // 1
    'Senior Analyst',       // 2
    'Manager',              // 3
    'Senior Manager',       // 4
    'Executive',            // 5
  ];
  return labels[position] || 'Unknown';
};

/**
 * Tier labels helper
 */
export const getTierLabel = (tier: number): string => {
  const labels = {
    1: 'Tier 1 - Strategic',
    2: 'Tier 2 - Operational',
    3: 'Tier 3 - Retail',
  };
  return labels[tier as keyof typeof labels] || 'Unknown';
};

/**
 * Calculate salary based on position and tier
 */
export const calculateSalary = (position: number, tier: number): string => {
  const baseSalaries = {
    1: [50000, 75000, 100000, 150000, 200000, 300000], // Tier 1
    2: [40000, 60000, 80000, 120000, 160000, 240000],  // Tier 2
    3: [30000, 45000, 60000, 90000, 120000, 180000],   // Tier 3
  };

  const salaries = baseSalaries[tier as keyof typeof baseSalaries];
  if (!salaries) return '0';
  
  return (salaries[position] || 0).toString();
};

export default bankHierarchyApi;
