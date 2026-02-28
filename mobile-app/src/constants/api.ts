export const API_BASE_URL = __DEV__
  ? "http://salesvault-sms.vercel.app/api/v1" // Android emulator
  : "https://salesvault-sms.vercel.app/api/v1";

// For physical device testing, use your machine's IP:
// export const API_BASE_URL = 'http://[IP_ADDRESS]/api/v1';

export const Endpoints = {
  // Auth
  LOGIN: "/auth/login",
  REFRESH: "/auth/refresh",
  LOGOUT: "/auth/logout",

  // Users
  USERS: "/users",
  ME: "/users/me",

  // Products
  PRODUCTS: "/products",

  // Warehouses
  WAREHOUSES: "/warehouses",

  // Stock
  STOCK: "/stock",
  STOCK_ADD: "/stock/add",
  STOCK_ASSIGN: "/stock/assign",
  STOCK_ASSIGNMENTS: "/stock/assignments",
  MY_STOCK: "/stock/my-stock",

  // Sales
  SALES: "/sales",
  MY_SALES: "/sales/my-sales",

  // Activity Logs
  ACTIVITY_LOGS: "/activity-logs",
  ACTIVITY_RECENT: "/activity-logs/recent",
  ACTIVITY_VERIFY: "/activity-logs/verify",

  // Dashboard
  DASHBOARD_ADMIN: "/dashboard/admin",
  DASHBOARD_SALESPERSON: "/dashboard/salesperson",
} as const;
