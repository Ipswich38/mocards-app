# MOCARDS IT ACCESS CREDENTIALS

## 🔐 IT Access System

The MOCARDS platform now includes a comprehensive IT monitoring and troubleshooting system designed for the creator/developer to monitor all system activities, performance, and user interactions.

## 🎯 Access Levels

### 1. IT Administrator (Full Access)
- **Username:** `itadmin`
- **Password:** `ITAccess2024!`
- **Permissions:** Full system monitoring, all activities tracking, user management
- **Features:** Complete dashboard access, error tracking, performance monitoring

### 2. Developer Access
- **Username:** `developer`
- **Password:** `DevAccess2024!`
- **Permissions:** Development debugging, code analysis, performance metrics
- **Features:** Development tools, debug information, system diagnostics

### 3. Support Access
- **Username:** `support`
- **Password:** `SupportAccess2024!`
- **Permissions:** Read-only monitoring, customer support tools
- **Features:** User activity monitoring, basic system health metrics

## 🚀 How to Access

1. **From Main Login Page:**
   - Look for the small shield icon at the bottom-right corner
   - Click the shield icon to access IT login
   - Enter your IT credentials

2. **Direct URL Access:**
   - Navigate to the main application
   - Use the IT Access button (semi-transparent shield icon)

## 📊 IT Dashboard Features

### Real-Time Monitoring
- **Active Users:** Live count of online users
- **Card Generation:** Real-time card creation tracking
- **Database Connections:** Active database connection monitoring
- **Error Tracking:** Live error reporting and alerts

### Activity Feed
- **User Actions:** All admin, clinic, and cardholder activities
- **System Events:** Card generation, activation, redemption tracking
- **Security Events:** Login attempts, authentication failures
- **API Requests:** Complete request/response monitoring

### Performance Metrics
- **Response Times:** API and database response monitoring
- **Resource Usage:** System resource consumption tracking
- **Query Performance:** Database query execution analysis
- **Throughput Metrics:** System load and capacity monitoring

### Troubleshooting Tools
- **Error Investigation:** Complete error stack traces and context
- **User Session Tracking:** Individual user journey monitoring
- **System Health:** Component status and availability monitoring
- **Audit Trails:** Complete activity logging for compliance

## 🗄️ Database Schema Updates

The following tables have been added for IT monitoring:

### Core IT Tables
- `it_admin_accounts` - IT user authentication
- `it_activity_logs` - Comprehensive activity logging
- `it_performance_metrics` - System performance tracking
- `it_query_performance` - Database query monitoring
- `it_error_tracking` - Error management and resolution
- `it_session_tracking` - User session monitoring
- `it_system_health` - System component health
- `it_dashboard_metrics` - Real-time dashboard data

### Database Functions
- `log_it_activity()` - Automatic activity logging
- `record_performance_metric()` - Performance metric recording
- `get_it_dashboard_summary()` - Dashboard data aggregation
- `get_recent_activity_feed()` - Recent activity retrieval

### Automatic Triggers
- Card operations automatically logged
- User authentication events tracked
- System errors automatically captured
- Performance metrics auto-collected

## 🛡️ Security & Privacy

### Access Control
- ✅ All IT access attempts are logged and monitored
- ✅ Failed login attempts trigger security alerts
- ✅ Session timeouts for security
- ✅ Role-based permission system

### Data Protection
- ✅ No sensitive user data (passwords, personal info) exposed
- ✅ All monitoring data encrypted in transit
- ✅ Audit trails maintain data integrity
- ✅ GDPR-compliant data handling

### Compliance Features
- ✅ Complete audit trails for all system activities
- ✅ Data retention policies configurable
- ✅ Export capabilities for compliance reporting
- ✅ Real-time security monitoring

## 📱 Admin Profile Management

### New Admin Features
- **Profile Configuration:** Admins can now update their name, email, and username
- **Password Management:** Secure password changes with strength validation
- **Account Details:** View account creation date, last login, role information
- **Security Settings:** Monitor login attempts and session management

### Admin Profile Access
- Navigate to Super Admin Dashboard → "Admin Profile" tab
- Update personal information and credentials
- All changes are logged for security compliance

## 🔧 Schema Installation

To enable IT monitoring, apply the following SQL files to your Supabase database:

1. **IT Monitoring Schema:**
   ```sql
   -- Apply it-monitoring-schema.sql to your database
   psql -d your_database < it-monitoring-schema.sql
   ```

2. **Production Optimizations:**
   ```sql
   -- Apply production-optimization.sql for performance
   psql -d your_database < production-optimization.sql
   ```

## 🎮 Usage Examples

### Monitor Card Generation
1. Login with IT credentials
2. View real-time card generation metrics
3. Track which admin/clinic is generating cards
4. Monitor generation performance and errors

### Track User Activities
1. Access the Activity Feed section
2. Filter by user type (admin, clinic, cardholder)
3. View detailed action logs with timestamps
4. Investigate specific user sessions

### Performance Troubleshooting
1. Check Performance Metrics section
2. Monitor response times and database queries
3. Identify slow operations and bottlenecks
4. Review system resource usage

### Error Investigation
1. Review Error Tracking dashboard
2. Access complete error stack traces
3. View error frequency and patterns
4. Mark errors as resolved after fixing

## 🔄 Maintenance & Updates

### Regular Maintenance
- Monitor error rates and system health daily
- Review performance metrics weekly
- Clean up old activity logs monthly (configurable retention)
- Update IT credentials quarterly for security

### System Updates
- IT monitoring data is automatically maintained
- Database indexes optimize query performance
- Automatic cleanup processes prevent data bloat
- Real-time metrics provide immediate feedback

---

## 🎯 Quick Start Guide

1. **Access IT Dashboard:**
   - Go to MOCARDS main page
   - Click shield icon (bottom-right)
   - Login with `itadmin` / `ITAccess2024!`

2. **Monitor System:**
   - Dashboard auto-refreshes every 30 seconds
   - Review active users and system health
   - Check recent activity feed for issues

3. **Investigate Problems:**
   - Use error tracking for bug investigation
   - Check performance metrics for slowdowns
   - Review activity logs for user issues

4. **Export Data:**
   - Use export functions for compliance
   - Generate reports for system analysis
   - Monitor trends over time

This IT access system provides complete visibility into MOCARDS operations while maintaining security and privacy standards. All activities are logged and monitored to ensure system integrity and user safety.