import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Create axios instance with auth
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Arbad API
export const arbadAPI = {
  // Family Arbad
  family: {
    registerMarriage: (data: { husbandSeatId: number; wifeSeatId: number }) =>
      apiClient.post('/arbads/family/marriage', data),

    addChild: (arbadId: number, childSeatId: number) =>
      apiClient.post(`/arbads/family/${arbadId}/children`, { childSeatId }),

    changeHeir: (arbadId: number, newHeirSeatId: number) =>
      apiClient.put(`/arbads/family/${arbadId}/heir`, { newHeirSeatId }),

    setKhuralRep: (arbadId: number, repSeatId: number, birthYear: number) =>
      apiClient.post(`/arbads/family/${arbadId}/khural-rep`, { repSeatId, birthYear }),

    getKhuralReps: () =>
      apiClient.get('/arbads/family/khural-reps'),

    getFamilyArbad: (arbadId: number) =>
      apiClient.get(`/arbads/family/${arbadId}`),

    getFamilyArbadBySeat: (seatId: number) =>
      apiClient.get(`/arbads/family/by-seat/${seatId}`),

    checkKhuralEligibility: (arbadId: number) =>
      apiClient.get(`/arbads/family/${arbadId}/khural-eligible`),

    sync: (arbadId: number) =>
      apiClient.post(`/arbads/family/${arbadId}/sync`),
  },

  // Zun (Clan)
  zun: {
    formZun: (data: { zunName: string; arbadIds: number[] }) =>
      apiClient.post('/arbads/zun', data),

    setElder: (zunId: number, elderSeatId: number) =>
      apiClient.put(`/arbads/zun/${zunId}/elder`, { elderSeatId }),

    getZun: (zunId: number) =>
      apiClient.get(`/arbads/zun/${zunId}`),

    getZunsByFamily: (arbadId: number) =>
      apiClient.get(`/arbads/zun/by-family/${arbadId}`),

    sync: (zunId: number) =>
      apiClient.post(`/arbads/zun/${zunId}/sync`),
  },

  // Organizational Arbad
  org: {
    create: (data: { name: string; orgType: number }) =>
      apiClient.post('/arbads/org', data),

    addMember: (arbadId: number, seatId: number) =>
      apiClient.post(`/arbads/org/${arbadId}/members`, { seatId }),

    setLeader: (arbadId: number, leaderSeatId: number) =>
      apiClient.put(`/arbads/org/${arbadId}/leader`, { leaderSeatId }),

    createDepartment: (parentOrgId: number, deptName: string) =>
      apiClient.post(`/arbads/org/${parentOrgId}/departments`, { deptName }),

    getOrg: (arbadId: number) =>
      apiClient.get(`/arbads/org/${arbadId}`),

    getOrgsByType: (type: string) =>
      apiClient.get(`/arbads/org?type=${type}`),
  },

  // Credit System
  credit: {
    family: {
      open: (arbadId: number) =>
        apiClient.post(`/arbads/credit/family/${arbadId}/open`),

      borrow: (arbadId: number, amount: string, durationDays: number) =>
        apiClient.post(`/arbads/credit/family/${arbadId}/borrow`, { amount, durationDays }),

      repay: (arbadId: number, loanIdx: number) =>
        apiClient.post(`/arbads/credit/family/${arbadId}/repay`, { loanIdx }),

      getCreditLine: (arbadId: number) =>
        apiClient.get(`/arbads/credit/family/${arbadId}`),

      getLoans: (arbadId: number) =>
        apiClient.get(`/arbads/credit/family/${arbadId}/loans`),

      getDashboard: (arbadId: number) =>
        apiClient.get(`/arbads/credit/family/${arbadId}/dashboard`),
    },

    org: {
      open: (arbadId: number) =>
        apiClient.post(`/arbads/credit/org/${arbadId}/open`),

      borrow: (arbadId: number, amount: string, durationDays: number) =>
        apiClient.post(`/arbads/credit/org/${arbadId}/borrow`, { amount, durationDays }),

      repay: (arbadId: number, loanIdx: number) =>
        apiClient.post(`/arbads/credit/org/${arbadId}/repay`, { loanIdx }),

      getCreditLine: (arbadId: number) =>
        apiClient.get(`/arbads/credit/org/${arbadId}`),

      getLoans: (arbadId: number) =>
        apiClient.get(`/arbads/credit/org/${arbadId}/loans`),

      getDashboard: (arbadId: number) =>
        apiClient.get(`/arbads/credit/org/${arbadId}/dashboard`),
    },

    admin: {
      setInterestRate: (rateBps: number) =>
        apiClient.put('/arbads/credit/interest-rate', { rateBps }),

      getInterestRate: () =>
        apiClient.get('/arbads/credit/interest-rate'),
    },
  },
};
