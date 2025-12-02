# Authorization and Role-Based Access Control Guide

This document describes the role-based authorization system implemented in the DSource application.

## Overview

The application implements a comprehensive role-based access control (RBAC) system with two primary roles:
- **User**: Regular users who can browse and use the application
- **Vendor**: Vendors who can upload products and manage their inventory

## Roles

### Role Constants

Roles are defined in `src/utils/roles.js`:

```javascript
import { ROLES } from "@/utils/roles";

ROLES.USER   // "user"
ROLES.VENDOR // "vendor"
```

## Authentication Context

The `AuthContext` (`src/contexts/AuthContext.js`) provides:

- **User data**: Current authenticated user
- **Role**: User's role (user or vendor)
- **Authorization helpers**: Methods to check permissions

### Usage

```javascript
import { useAuth } from "@/contexts/AuthContext";

function MyComponent() {
  const { user, role, isAuthenticated, isVendor, isUser, hasRole, canAccessVendor } = useAuth();
  
  // Check if user is vendor
  if (isVendor) {
    // Vendor-specific code
  }
  
  // Check specific role
  if (hasRole(ROLES.VENDOR)) {
    // Vendor code
  }
}
```

## Authorization Utilities

### Client-Side Authorization

Use `useAuthorization` hook for client-side authorization checks:

```javascript
import { useAuthorization } from "@/hooks/useAuthorization";

function MyComponent() {
  const { hasRole, canAccessVendor, isVendor } = useAuthorization();
  
  if (!canAccessVendor()) {
    return <div>Access denied</div>;
  }
}
```

### Server-Side Authorization (API Routes)

For API routes, use the authorization utilities:

```javascript
import { requireAuth, requireVendor } from "@/utils/api-auth";

export async function POST(request) {
  try {
    // Require authentication
    const user = await requireAuth();
    
    // Or require vendor role
    const vendor = await requireVendor();
    
    // Your API logic here
  } catch (error) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error.message.includes("Forbidden")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }
}
```

## Route Protection

### Client-Side Route Protection

Wrap your pages with route protection components:

```javascript
import { VendorRoute, ProtectedRoute, UserRoute } from "@/components/auth";

// Protect vendor routes
export default function VendorPage() {
  return (
    <VendorRoute>
      <VendorDashboard />
    </VendorRoute>
  );
}

// Protect any authenticated route
export default function ProtectedPage() {
  return (
    <ProtectedRoute>
      <MyProtectedContent />
    </ProtectedRoute>
  );
}
```

### Server-Side Route Protection (Middleware)

The `middleware.js` file automatically protects routes:

- **Vendor routes** (`/vendor`): Requires vendor role
- **Protected routes** (`/spec-builder`, `/ai-material-finder`): Requires authentication

### Conditional Rendering

Use `RequireRole` component for conditional rendering:

```javascript
import { RequireRole } from "@/components/auth";
import { ROLES } from "@/utils/roles";

function MyComponent() {
  return (
    <>
      <RequireRole role={ROLES.VENDOR}>
        <VendorOnlyContent />
      </RequireRole>
      
      <RequireRole roles={[ROLES.USER, ROLES.VENDOR]}>
        <ContentForAllUsers />
      </RequireRole>
    </>
  );
}
```

## Setting User Roles

### During Signup

Vendors are assigned the vendor role during signup:

```javascript
// In VendorAuthPanel.js
await supabase.auth.signUp({
  email: trimmedEmail,
  password: parsedPassword,
  options: {
    data: {
      user_type: "vendor", // Sets vendor role
    },
  },
});
```

### Role Storage

Roles are stored in Supabase user metadata:
- `user_metadata.user_type`: Set during signup
- `app_metadata.user_type`: Can be set by admin

## API Route Authorization

### Example: Vendor-Only API

```javascript
import { requireVendor } from "@/utils/api-auth";

export async function POST(request) {
  try {
    await requireVendor(); // Throws if not vendor
    // Your vendor-only logic
  } catch (error) {
    // Handle authorization errors
  }
}
```

## Authorization Helpers

### Client-Side

- `useAuth()`: Get authentication state and helpers
- `useAuthorization()`: Get authorization helpers
- `hasRole(role)`: Check if user has specific role
- `canAccessVendor()`: Check if user can access vendor routes
- `canAccessUser()`: Check if user can access user routes

### Server-Side

- `requireAuth()`: Require authentication (throws if not authenticated)
- `requireVendor()`: Require vendor role (throws if not vendor)
- `getUserRoleFromUser(user)`: Extract role from user object
- `isVendorUser(user)`: Check if user is vendor

## Route Protection Components

1. **ProtectedRoute**: Requires authentication
2. **VendorRoute**: Requires vendor role
3. **UserRoute**: Requires user role (vendors can also access)
4. **RequireRole**: Conditionally renders based on role

## Best Practices

1. **Always check authorization on both client and server**
   - Client-side: For UI/UX
   - Server-side: For security

2. **Use middleware for route protection**
   - Automatic protection at the route level
   - Prevents unauthorized access

3. **Use API authorization utilities**
   - Consistent error handling
   - Proper HTTP status codes

4. **Check roles, not just authentication**
   - Not all authenticated users should access all routes
   - Use role-based checks for sensitive operations

## Security Notes

- **Never trust client-side checks alone**: Always verify on the server
- **Use middleware**: Protects routes before rendering
- **API routes**: Always check authorization in API routes
- **Role validation**: Roles are validated against the ROLES constant

## Examples

### Protecting a Vendor Page

```javascript
// app/vendor/dashboard/page.js
import { VendorRoute } from "@/components/auth";

export default function VendorDashboardPage() {
  return (
    <VendorRoute>
      <VendorDashboard />
    </VendorRoute>
  );
}
```

### Protecting an API Route

```javascript
// app/api/vendor/products/route.js
import { requireVendor } from "@/utils/api-auth";

export async function POST(request) {
  try {
    const vendor = await requireVendor();
    // Vendor-only logic
  } catch (error) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }
}
```

### Conditional UI Rendering

```javascript
import { RequireRole } from "@/components/auth";
import { ROLES } from "@/utils/roles";

function Navigation() {
  return (
    <nav>
      <Link href="/">Home</Link>
      <RequireRole role={ROLES.VENDOR}>
        <Link href="/vendor">Vendor Dashboard</Link>
      </RequireRole>
    </nav>
  );
}
```

