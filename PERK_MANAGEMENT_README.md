# Enhanced Perk Management System

A comprehensive perk management system that allows admins to create and manage perk templates, which are automatically mirrored to all clinics for customization.

## 🚀 Features

### Admin Features
- **Full CRUD operations** for perk templates
- **Category management** for organizing perks
- **Template mirroring** - automatically pushes new perks to all clinics
- **Usage analytics** across all clinics
- **System default protection** - prevents deletion of core perks
- **Bulk operations** for efficient management

### Clinic Features
- **Full CRUD access** to their customized perks
- **Template inheritance** from admin-created perks
- **Custom naming** and descriptions
- **Custom pricing** for each perk
- **Availability control** - enable/disable perks
- **Appointment requirements** configuration
- **Redemption limits** per card
- **Validity periods** for time-limited perks
- **Terms and conditions** customization

## 🗃️ Database Schema

### Core Tables

#### `perk_templates` (Admin-managed master templates)
- `id` - UUID primary key
- `name` - Template name
- `description` - Template description
- `perk_type` - Type identifier
- `default_value` - Default monetary value
- `category` - Perk category
- `icon` - UI icon reference
- `is_active` - Enable/disable status
- `is_system_default` - Protection flag
- `created_by_admin_id` - Creating admin reference

#### `clinic_perk_customizations` (Clinic-specific customizations)
- `id` - UUID primary key
- `clinic_id` - Reference to clinic
- `perk_template_id` - Reference to template
- `custom_name` - Clinic's custom name
- `custom_description` - Clinic's custom description
- `custom_value` - Clinic's custom price
- `is_enabled` - Clinic enable/disable
- `requires_appointment` - Appointment requirement
- `max_redemptions_per_card` - Redemption limit
- `valid_from/valid_until` - Validity period
- `terms_and_conditions` - Custom terms

#### `perk_categories` (Organization categories)
- `id` - UUID primary key
- `name` - Category name
- `description` - Category description
- `display_order` - Sorting order
- `is_active` - Enable/disable status

#### `perk_usage_analytics` (Usage tracking)
- `id` - UUID primary key
- `perk_template_id` - Template reference
- `clinic_id` - Clinic reference
- `card_id` - Card reference
- `redemption_date` - When redeemed
- `redemption_value` - Value at redemption
- `month_year` - Aggregation period

## ⚡ Automatic Features

### Mirroring System
When admins create new perk templates, they are automatically mirrored to all active clinics:

```sql
-- Trigger function automatically creates clinic customizations
CREATE OR REPLACE FUNCTION create_default_clinic_customizations()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert customization for each active clinic
    INSERT INTO clinic_perk_customizations (
        clinic_id, perk_template_id, custom_name,
        custom_description, custom_value, is_enabled
    )
    SELECT id, NEW.id, NEW.name, NEW.description,
           NEW.default_value, NEW.is_active
    FROM mocards_clinics WHERE status = 'active';
    RETURN NEW;
END;
$$;
```

### New Clinic Setup
When new clinics are created, they automatically receive all active perk templates:

```sql
-- Trigger for new clinics
CREATE OR REPLACE FUNCTION create_clinic_perk_customizations_for_new_clinic()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert all active templates for new clinic
    INSERT INTO clinic_perk_customizations (...)
    SELECT NEW.id, pt.id, pt.name, ...
    FROM perk_templates pt WHERE pt.is_active = true;
    RETURN NEW;
END;
$$;
```

## 🛠️ Installation

### 1. Apply Database Schema
```bash
# Run the enhanced schema
node apply-enhanced-perk-schema.js
```

### 2. Verify Installation
```bash
# Run comprehensive tests
node test-perk-management-system.js
```

## 💻 Usage

### Admin Interface

#### Creating Perk Templates
```typescript
// Create new template
const template = await dbOperations.createPerkTemplate({
  name: 'Root Canal Treatment',
  description: 'Complete endodontic treatment',
  perk_type: 'root_canal',
  default_value: 4000.00,
  category: 'Restorative',
  icon: 'activity',
  is_active: true,
  created_by_admin_id: adminId
});
```

#### Managing Templates
```typescript
// Update template
await dbOperations.updatePerkTemplate(templateId, {
  default_value: 4500.00,
  description: 'Updated description'
});

// Toggle status
await dbOperations.updatePerkTemplate(templateId, {
  is_active: false
});

// Delete (only non-system templates)
await dbOperations.deletePerkTemplate(templateId);
```

### Clinic Interface

#### Customizing Perks
```typescript
// Get clinic customizations
const customizations = await dbOperations.getClinicPerkCustomizations(clinicId);

// Update customization
await dbOperations.updateClinicPerkCustomization(customizationId, {
  custom_name: 'Special Root Canal Package',
  custom_value: 3500.00,
  requires_appointment: true,
  max_redemptions_per_card: 1,
  terms_and_conditions: 'Valid for 6 months from card activation'
});

// Enable/disable perk
await dbOperations.updateClinicPerkCustomization(customizationId, {
  is_enabled: false
});
```

#### Recording Usage Analytics
```typescript
// Record perk usage
await dbOperations.recordPerkUsage({
  perk_template_id: templateId,
  clinic_id: clinicId,
  card_id: cardId,
  redemption_date: new Date().toISOString().split('T')[0],
  redemption_value: 3500.00
});

// Get analytics
const analytics = await dbOperations.getClinicPerkAnalytics(clinicId, '2024-01');
```

## 🎯 Default Perk Templates

The system comes with these default perk templates:

### Dental Services
- **Dental Consultation** (₱500) - Comprehensive examination
- **Dental Filling** (₱1,200) - Composite/amalgam filling

### Preventive Care
- **Dental Cleaning** (₱800) - Professional cleaning
- **Fluoride Treatment** (₱300) - Cavity prevention

### Diagnostics
- **Dental X-Ray** (₱1,000) - Digital radiograph

### Cosmetic
- **Teeth Whitening** (₱2,500) - Professional whitening

### Orthodontics
- **Braces Consultation** (₱5,000) - Treatment planning

### Oral Surgery
- **Tooth Extraction** (₱1,500) - Simple extraction

### Restorative
- **Denture Service** (₱3,000) - Denture fitting
- **Root Canal Treatment** (₱4,000) - Endodontic therapy

## 🔐 Security Features

### Row Level Security (RLS)
All tables have RLS enabled with appropriate policies:

```sql
-- Example RLS policy
CREATE POLICY "Allow all access to perk templates"
ON perk_templates FOR ALL USING (true);
```

### Data Validation
- Foreign key constraints prevent orphaned records
- Unique constraints prevent duplicate customizations
- Check constraints ensure data integrity

### System Protection
- System default templates cannot be deleted
- Only designated admins can create templates
- Audit trails track all changes

## 📊 Analytics & Reporting

### Available Metrics
- **Template Usage**: How often each perk is redeemed
- **Clinic Performance**: Redemption statistics per clinic
- **Revenue Tracking**: Value of redeemed perks
- **Temporal Analysis**: Monthly/yearly trends

### Analytics Queries
```typescript
// Get top performing perks
const topPerks = await dbOperations.getPerkTemplateUsageStats(
  templateId,
  '2024-01'
);

// Get clinic performance
const clinicStats = await dbOperations.getClinicPerkAnalytics(
  clinicId,
  '2024-01'
);
```

## 🧪 Testing

### Automated Test Suite
The system includes comprehensive tests covering:

- **CRUD Operations**: Create, read, update, delete for all entities
- **Mirroring System**: Automatic template distribution
- **Data Integrity**: Foreign keys, constraints, RLS
- **Analytics**: Usage tracking and reporting
- **Edge Cases**: Error handling and validation

Run tests:
```bash
npm test
# or
node test-perk-management-system.js
```

## 📱 UI Components

### Admin Components
- **AdminPerkManagement**: Main admin interface
  - Template CRUD with form validation
  - Category management
  - Search and filtering
  - Status toggling

### Clinic Components
- **ClinicPerkCustomization**: Clinic interface
  - Customization forms
  - Enable/disable controls
  - Terms and conditions editor
  - Validity period settings

## 🔄 Migration Path

### From Legacy System
1. **Backup existing data**
2. **Run enhanced schema migration**
3. **Verify data integrity**
4. **Test all functionality**
5. **Train users on new interface**

### Rollback Plan
1. **Database backup restore**
2. **Remove new tables** (if needed)
3. **Update application code**
4. **Verify legacy functionality**

## 🤝 Contributing

### Code Standards
- TypeScript for type safety
- React functional components with hooks
- Tailwind CSS for styling
- Supabase for backend operations

### Testing Requirements
- Unit tests for all CRUD operations
- Integration tests for mirroring system
- UI tests for admin and clinic interfaces
- Performance tests for large datasets

## 📞 Support

### Common Issues

#### Templates Not Mirroring
1. Check database triggers are enabled
2. Verify clinic status is 'active'
3. Check foreign key constraints

#### Customizations Not Saving
1. Verify clinic permissions
2. Check RLS policies
3. Validate form data

#### Analytics Not Recording
1. Check trigger functions
2. Verify date format
3. Check analytics table permissions

### Troubleshooting Commands
```bash
# Check table structure
node -e "console.log(require('./lib/supabase').dbOperations)"

# Test specific functionality
node test-perk-management-system.js

# Verify installation
node apply-enhanced-perk-schema.js --verify-only
```

---

**Built with ❤️ for the MOCARDS platform**
*Enhancing dental loyalty programs with flexible, scalable perk management*