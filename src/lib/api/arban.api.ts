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

// Arban API
export const arbanAPI = {
  // Family Arban
  family: {
    registerMarriage: (data: { husbandSeatId: number; wifeSeatId: number }) =>
      apiClient.post('/arbans/family/marriage', data),

    addChild: (arbanId: number, childSeatId: number) =>
      apiClient.post(`/arbans/family/${arbanId}/children`, { childSeatId }),

    changeHeir: (arbanId: number, newHeirSeatId: number) =>
      apiClient.put(`/arbans/family/${arbanId}/heir`, { newHeirSeatId }),

    setKhuralRep: (arbanId: number, repSeatId: number, birthYear: number) =>
      apiClient.post(`/arbans/family/${arbanId}/khural-rep`, { repSeatId, birthYear }),

    getKhuralReps: () =>
      apiClient.get('/arbans/family/khural-reps'),

    getFamilyArban: (arbanId: number) =>
      apiClient.get(`/arbans/family/${arbanId}`),

    getFamilyArbanBySeat: (seatId: number) =>
      apiClient.get(`/arbans/family/by-seat/${seatId}`),

    checkKhuralEligibility: (arbanId: number) =>
      apiClient.get(`/arbans/family/${arbanId}/khural-eligible`),

    sync: (arbanId: number) =>
      apiClient.post(`/arbans/family/${arbanId}/sync`),
  },

  // Zun (Clan)
  zun: {
    formZun: (data: { zunName: string; arbanIds: number[] }) =>
      apiClient.post('/arbans/zun', data),

    setElder: (zunId: number, elderSeatId: number) =>
      apiClient.put(`/arbans/zun/${zunId}/elder`, { elderSeatId }),

    getZun: (zunId: number) =>
      apiClient.get(`/arbans/zun/${zunId}`),

    getZunsByFamily: (arbanId: number) =>
      apiClient.get(`/arbans/zun/by-family/${arbanId}`),

    sync: (zunId: number) =>
      apiClient.post(`/arbans/zun/${zunId}/sync`),
  },

  // Organizational Arban
  org: {
    create: (data: { name: string; orgType: number }) =>
      apiClient.post('/arbans/org', data),

    addMember: (arbanId: number, seatId: number) =>
      apiClient.post(`/arbans/org/${arbanId}/members`, { seatId }),

    setLeader: (arbanId: number, leaderSeatId: number) =>
      apiClient.put(`/arbans/org/${arbanId}/leader`, { leaderSeatId }),

    createDepartment: (parentOrgId: number, deptName: string) =>
      apiClient.post(`/arbans/org/${parentOrgId}/departments`, { deptName }),

    getOrg: (arbanId: number) =>
      apiClient.get(`/arbans/org/${arbanId}`),

    getOrgsByType: (type: string) =>
      apiClient.get(`/arbans/org?type=${type}`),
  },

  // Credit System
  credit: {
    family: {
      open: (arbanId: number) =>
        apiClient.post(`/arbans/credit/family/${arbanId}/open`),

      borrow: (arbanId: number, amount: string, durationDays: number) =>
        apiClient.post(`/arbans/credit/family/${arbanId}/borrow`, { amount, durationDays }),

      repay: (arbanId: number, loanIdx: number) =>
        apiClient.post(`/arbans/credit/family/${arbanId}/repay`, { loanIdx }),

      getCreditLine: (arbanId: number) =>
        apiClient.get(`/arbans/credit/family/${arbanId}`),

      getLoans: (arbanId: number) =>
        apiClient.get(`/arbans/credit/family/${arbanId}/loans`),

      getDashboard: (arbanId: number) =>
        apiClient.get(`/arbans/credit/family/${arbanId}/dashboard`),
    },

    org: {
      open: (arbanId: number) =>
        apiClient.post(`/arbans/credit/org/${arbanId}/open`),

      borrow: (arbanId: number, amount: string, durationDays: number) =>
        apiClient.post(`/arbans/credit/org/${arbanId}/borrow`, { amount, durationDays }),

      repay: (arbanId: number, loanIdx: number) =>
        apiClient.post(`/arbans/credit/org/${arbanId}/repay`, { loanIdx }),

      getCreditLine: (arbanId: number) =>
        apiClient.get(`/arbans/credit/org/${arbanId}`),

      getLoans: (arbanId: number) =>
        apiClient.get(`/arbans/credit/org/${arbanId}/loans`),

      getDashboard: (arbanId: number) =>
        apiClient.get(`/arbans/credit/org/${arbanId}/dashboard`),
    },

    admin: {
      setInterestRate: (rateBps: number) =>
        apiClient.put('/arbans/credit/interest-rate', { rateBps }),

      getInterestRate: () =>
        apiClient.get('/arbans/credit/interest-rate'),
    },
  },
};
