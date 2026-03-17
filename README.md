# 🚀 Project Name: **SalesVault**

---

# 1️⃣ Executive Summary

**SalesVault** is a secure, enterprise-grade stock and sales management system designed for field sales teams.

It provides:

- Real-time stock control
- Secure sale transactions
- Full audit trail
- Anti-tampering protection
- Role-based access control
- Dashboard with system & user activity
- Offline-ready mobile architecture
- SaaS scalability foundation

Technology Stack:

- Backend: NestJS
- Mobile: React Native
- Database: PostgreSQL

---

# 2️⃣ System Architecture (Updated – No Redis)

```
React Native App
        ↓
HTTPS (Nginx Reverse Proxy)
        ↓
NestJS Backend (Modular)
        ↓
PostgreSQL (Primary Database)
```

No cache layer.
All logic handled via optimized queries + indexing.

---

# 3️⃣ Core Modules

## 🔐 1. Authentication & Authorization

- JWT Access Token (15 min)
- Refresh Token Rotation
- Role-Based Access Control (RBAC)
- Account lock after failed attempts
- Session tracking table

---

## 👤 2. User Management

- Create / Update / Deactivate users
- Assign roles
- Reset password
- Force logout

---

## 📦 3. Product Management

- Create product
- Update product
- Soft delete
- Unique SKU enforcement

---

## 🏬 4. Warehouse Management

- Multi-warehouse support
- Stock per warehouse

---

## 📊 5. Stock Management

- Warehouse stock
- Assign stock to salesperson
- Track remaining balance
- Prevent negative stock
- **[NEW]** Automated Low Stock Triggers via `@nestjs/schedule`
- **[NEW]** Stock Adjustments (Reason-coded modifications to handle DAMAGED / EXPIRED items securely)

---

## 💰 6. Sales Module

- Create sale
- Add multiple items
- Payment status
- Cancel sale (Admin only)
- Transaction-safe stock deduction
- **[NEW]** `Pessimistic Locking` applied to prevent race-condition overselling.

---

## 🧾 7. Immutable Activity Log Module (Critical)

- Logs every important action
- Insert-only table
- Tamper detection via hash chaining

---

## 📊 8. Dashboard Module

### Admin Dashboard

- Total Sales Today
- Monthly Sales
- Low Stock Alerts
- Top Salespersons
- Recent System Activity
- **[NEW]** Inventory Valuation (Calculated Real-Time)
- **[NEW]** Fastest Moving Items (30-day Volume Trends)

### Salesperson Dashboard

- My Sales Today
- My Assigned Stock
- My Remaining Stock
- My Recent Activities
- Pending Offline Sales

---

# 4️⃣ Database Design (Secure Production Schema)

## users

- id (uuid)
- name
- email (unique)
- password_hash
- role (ADMIN / MANAGER / SALESPERSON)
- is_active
- failed_attempts
- locked_until
- created_at

---

## products

- id
- name
- sku (unique)
- price
- cost_price
- is_active
- created_at

---

## warehouses

- id
- name
- location

---

## stock

- id
- product_id (FK)
- warehouse_id (FK)
- quantity CHECK (quantity >= 0)

---

## stock_assignments

- id
- salesperson_id
- product_id
- quantity_assigned
- quantity_remaining CHECK >= 0
- assigned_at

---

## stock_adjustments (NEW)

- id
- product_id
- warehouse_id
- quantity_adjusted
- reason (DAMAGED, RETURN, CORRECTION, EXPIRY)
- adjusted_by (Admin)
- created_at

---

## sales

- id
- salesperson_id
- customer_id
- total_amount
- payment_status
- idempotency_key (unique)
- created_at

---

## sale_items

- id
- sale_id
- product_id
- quantity
- price

---

## activity_logs (IMMUTABLE)

- id
- user_id
- action_type
- entity_type
- entity_id
- old_data (jsonb)
- new_data (jsonb)
- ip_address
- device_info
- previous_hash
- current_hash
- created_at

🚫 No UPDATE
🚫 No DELETE

---

# 5️⃣ Security Architecture (Enterprise Hardened)

## 🔐 Authentication

- Short-lived access tokens
- Refresh token rotation
- Token versioning
- Session tracking

---

## 🔒 Password Security

- bcrypt 12+ rounds
- Lock account after 5 failures
- Strong password policy
- Login attempt logging

---

## 🛡 API Security

- Global validation pipe
- DTO validation
- SQL injection protection via ORM
- HTTPS enforced
- CORS whitelist
- Security headers (Helmet)
- Centralized exception filter

---

## 🔐 RBAC

Guards:

- JwtAuthGuard
- RolesGuard

Every endpoint protected.

---

# 6️⃣ Anti-Tampering Logic

## Transaction-Based Sale Creation

```
BEGIN
  SELECT stock_assignment FOR UPDATE
  Validate quantity
  Insert sale
  Insert sale_items
  Deduct quantity_remaining
  Insert activity log
COMMIT
```

Failure → ROLLBACK

---

## Idempotency Key

Header required:

```
X-Idempotency-Key
```

Prevents double submission.

---

## Activity Log Hash Chain

```
current_hash = SHA256(previous_hash + JSON.stringify(record))
```

If any log modified → hash mismatch.

---

# 7️⃣ Edge Case Handling

✔ Double submission
✔ Concurrent sales
✔ Negative stock attempt
✔ Token expiry
✔ Deactivated user access
✔ Replay attack
✔ Internet drop
✔ API timeout
✔ Multiple login sessions
✔ Invalid role access
✔ Tampered activity logs

---

# 8️⃣ Dashboard Queries

### Recent System Activity

```sql
SELECT * FROM activity_logs
ORDER BY created_at DESC
LIMIT 20;
```

### Logged User Activity

```sql
SELECT * FROM activity_logs
WHERE user_id = ?
ORDER BY created_at DESC
LIMIT 10;
```

---

# 9️⃣ Mobile Architecture (React Native)

Structure:

```
src/
 ├── screens/
 ├── components/
 ├── api/
 ├── stores/    (Zustand State Management)
 ├── hooks/
 ├── utils/
 ├── navigation/
```

Key Functionality:

- Secure token storage (`expo-secure-store`)
- Auto logout mechanism
- **[NEW]** Offline Queue via `@react-native-async-storage/async-storage` for resilience during connectivity drops.
- **[NEW]** Direct Barcode Scanning integration (`expo-camera`) on the creation flow.
- Optimistic UI on dashboard & sales lists.

---

# 🔟 Performance Optimization (Without Redis)

Since no cache layer:

- Add DB indexes on:
  - user_id
  - product_id
  - created_at

- Pagination everywhere
- Query optimization
- Use SELECT only needed columns
- Avoid heavy joins in dashboard

---

# 11️⃣ Deployment Architecture

Backend:

- Dockerized NestJS
- Nginx reverse proxy
- SSL certificate
- PM2

Database:

- Managed PostgreSQL
- Daily backup
- 7-day retention
- Read replica optional

Mobile:

- Production build
- Code obfuscation
- Environment-based config

---

# 12️⃣ Development Timeline (30 Days Fast Track)

Week 1:

- Auth + RBAC
- Schema
- User module

Week 2:

- Product + Stock + Assignment
- Activity log interceptor

Week 3:

- Sales transaction system
- Dashboard APIs
- Security hardening

Week 4:

- Mobile app
- Offline sync
- Testing
- Production deployment

---

# 13️⃣ Final Characteristics of SalesVault

✅ Enterprise-level security
✅ Immutable audit trail
✅ Anti-tampering protection
✅ Full activity tracking
✅ Secure transaction logic
✅ Mobile-first field sales ready
✅ SaaS expandable
✅ Production hardened

---
