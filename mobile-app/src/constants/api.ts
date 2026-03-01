// For Android Emulator use: http://10.0.2.2:8000/api/v1
// For iOS Simulator use:     http://localhost:8000/api/v1
// For Physical Device use:   http://<YOUR_PC_IP>:8000/api/v1
//   → Run `ipconfig` in terminal and find your IPv4 address (e.g. 192.168.1.x)
export const API_BASE_URL = __DEV__
  ? "http://192.168.0.137:8000/api/v1"
  : "https://salesvault-sms.vercel.app/api/v1";

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

  // Warehouse Users
  WAREHOUSE_USERS: "/warehouse-users",
  WAREHOUSE_USERS_ASSIGN: "/warehouse-users/assign",
  WAREHOUSE_USERS_MY: "/warehouse-users/my-warehouses",

  // Stock
  STOCK: "/stock",
  STOCK_ADD: "/stock/add",
  STOCK_ASSIGN: "/stock/assign",
  STOCK_ASSIGNMENTS: "/stock/assignments",
  MY_STOCK: "/stock/my-stock",

  // Sales
  SALES: "/sales",
  MY_SALES: "/sales/my-sales",

  // Sales Targets
  SALES_TARGETS: "/sales-targets",
  SALES_TARGETS_MY: "/sales-targets/my-targets",

  // Activity Logs
  ACTIVITY_LOGS: "/activity-logs",
  ACTIVITY_RECENT: "/activity-logs/recent",
  ACTIVITY_VERIFY: "/activity-logs/verify",

  // Dashboard
  DASHBOARD_ADMIN: "/dashboard/admin",
  DASHBOARD_SALESPERSON: "/dashboard/salesperson",
} as const;
