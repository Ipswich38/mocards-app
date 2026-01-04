# 🚀 NEW MOCARDS APP - PROJECT PLAN PROMPT

## Project Overview
Build a streamlined dental benefits card management system from scratch using modern web technologies. Focus on core functionality without unnecessary complexity while maintaining security best practices.

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Architecture**: Modular OOP design patterns
- **Icons**: Lucide React
- **Mobile**: Mobile-first responsive design

### Backend & Database
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (OAuth, email/password)
- **Real-time**: Supabase real-time subscriptions
- **Storage**: Supabase Storage (if needed)

### Deployment & DevOps
- **Hosting**: Vercel (cloud isolated)
- **Database**: Supabase Cloud
- **Version Control**: Git/GitHub
- **Environment**: Development, Staging, Production

## 🎯 Core Features (Streamlined)

### 1. Card Management System
- Generate dental benefit cards with unique codes
- Assign cards to patients with clinic associations
- Card lookup functionality (public access)
- Card status management (active/inactive)

### 2. Clinic Portal
- View all cards in the system
- Access card details and patient information
- Submit appointment requests
- Track appointment status
- Perk redemption management

### 3. Admin Portal
- Generate new card batches
- Input patient details
- Assign cards to clinics
- Manage clinic information
- Send appointment requests
- System overview dashboard

### 4. Perk System
- Define perks per card
- Redeem perks when needed
- Track redemption history
- Simple perk categories

## 🏗️ Architecture Requirements

### Modular Design
```
src/
├── app/                    # Next.js App Router
├── components/
│   ├── ui/                # shadcn/ui base components
│   ├── forms/             # Form components
│   ├── cards/             # Card-related components
│   └── layout/            # Layout components
├── lib/
│   ├── database/          # Database operations (OOP classes)
│   ├── auth/              # Authentication utilities
│   ├── validation/        # Form validation schemas
│   └── utils/             # Utility functions
├── types/                 # TypeScript type definitions
├── hooks/                 # Custom React hooks
└── constants/             # Application constants
```

### OOP Design Patterns
- **Service Classes**: Database operations, API calls
- **Model Classes**: Data models with validation
- **Manager Classes**: Business logic coordination
- **Utility Classes**: Helper functions and formatting

### Mobile-First Approach
- Responsive design starting from mobile (320px)
- Touch-friendly interface elements
- Progressive enhancement for desktop
- Optimized performance on mobile devices

### Cloud Isolated Architecture
- Serverless functions for API routes
- Static generation where possible
- CDN optimization
- Environment-based configurations

## 🔒 Security (Not Strict, But Secure)

### Authentication
- Simple email/password + OAuth (Google)
- Auto-refresh tokens
- Session management
- Role-based access (Admin, Clinic, Public)

### Data Protection
- Row Level Security (RLS) policies
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF protection

### API Security
- Rate limiting on sensitive endpoints
- API key validation
- Request validation
- Error handling without data exposure

## 📊 Database Schema (Streamlined)

### Core Tables (7 tables max)
1. **regions** - Philippine regions including MIMAROPA
2. **clinic_codes** - CVT001-016, BTG001-016, LGN001-016, MIM001-016
3. **clinics** - Clinic information
4. **cards** - Patient cards with generated codes
5. **card_perks** - Card-associated benefits
6. **appointments** - Appointment requests
7. **perk_redemptions** - Redemption tracking

### Key Features
- Complete Philippines regions (including 4B MIMAROPA)
- Extended clinic codes (001-016 for each region)
- Simple relationships without complex joins
- Optimized indexes for performance

## 🎨 UI/UX Requirements

### Design System
- Clean, modern interface
- Consistent color scheme
- Intuitive navigation
- Fast loading times
- Accessible design (WCAG 2.1)

### User Experience
- Simple onboarding
- Clear error messages
- Loading states
- Success confirmations
- Mobile-optimized interactions

## 🚀 Development Phases

### Phase 1: Foundation (Week 1)
- Project setup with Next.js + TypeScript
- Database schema design and implementation
- Authentication system
- Basic UI components

### Phase 2: Core Features (Week 2)
- Card generation system
- Card lookup functionality
- Basic admin portal
- Clinic portal foundation

### Phase 3: Advanced Features (Week 3)
- Perk management system
- Appointment system
- Real-time updates
- Mobile optimization

### Phase 4: Polish & Deploy (Week 4)
- Performance optimization
- Security hardening
- Testing and bug fixes
- Production deployment

## 📋 Success Criteria

### Functional Requirements
- ✅ Generate cards with unique codes
- ✅ Public card lookup works 24/7
- ✅ Clinics can view all cards + appointments
- ✅ Admin can manage entire system
- ✅ Perk redemption system
- ✅ Mobile-responsive design

### Performance Requirements
- Page load times < 2 seconds
- Mobile performance score > 90
- 99.9% uptime
- Real-time updates < 1 second delay

### Security Requirements
- No SQL injection vulnerabilities
- Secure authentication flow
- Protected admin routes
- Data encryption at rest and in transit

## 🔧 Development Tools

### Required Tools
- Node.js 18+
- npm/yarn package manager
- VS Code or preferred IDE
- Git for version control
- Supabase CLI
- Vercel CLI

### Recommended Extensions
- TypeScript support
- Tailwind CSS IntelliSense
- ESLint + Prettier
- Git integration

## 📚 Key Implementation Notes

### Critical Success Factors
1. **Keep it simple** - Avoid over-engineering
2. **Mobile first** - Design for mobile, enhance for desktop
3. **Security focused** - Secure but not overly restrictive
4. **Performance optimized** - Fast loading and responsive
5. **Modular design** - Easy to maintain and extend

### Lessons from Previous Project
- Avoid complex analytics initially
- Focus on core business needs
- Ensure proper schema design upfront
- Test deployment early and often
- Maintain clear separation of concerns

## 🎯 Project Completion Goal

Create a production-ready dental benefits card management system that:
- Works flawlessly on mobile and desktop
- Handles all core business requirements
- Maintains security without complexity
- Scales efficiently in the cloud
- Can be maintained and extended easily

**Target Timeline**: 4 weeks from project start to production deployment

---

## 🚦 Getting Started

Copy this entire prompt when starting the new project and ask your development assistant to begin with Phase 1 setup. Ensure all requirements are clearly communicated and understood before beginning development.