// User roles
export type UserRole = 'admin' | 'scorer' | 'viewer'

// User interface
export interface User {
  uid: string
  email: string
  displayName: string
  role: UserRole
  createdAt: string
  lastLogin: string
}

// Permission definitions
export interface Permissions {
  canCreateCompetition: boolean
  canEditCompetition: boolean
  canDeleteCompetition: boolean
  canAddShooters: boolean
  canEditShooters: boolean
  canDeleteShooters: boolean
  canEnterScores: boolean
  canConfirmScores: boolean
  canResolveDisputes: boolean
  canExportResults: boolean
  canManageUsers: boolean
  canViewResults: boolean
}

// Role-based permissions
export const ROLE_PERMISSIONS: Record<UserRole, Permissions> = {
  admin: {
    canCreateCompetition: true,
    canEditCompetition: true,
    canDeleteCompetition: true,
    canAddShooters: true,
    canEditShooters: true,
    canDeleteShooters: true,
    canEnterScores: true,
    canConfirmScores: true,
    canResolveDisputes: true,
    canExportResults: true,
    canManageUsers: true,
    canViewResults: true,
  },
  scorer: {
    canCreateCompetition: false,
    canEditCompetition: true,
    canDeleteCompetition: false,
    canAddShooters: true,
    canEditShooters: true,
    canDeleteShooters: false,
    canEnterScores: true,
    canConfirmScores: true,
    canResolveDisputes: false,
    canExportResults: true,
    canManageUsers: false,
    canViewResults: true,
  },
  viewer: {
    canCreateCompetition: false,
    canEditCompetition: false,
    canDeleteCompetition: false,
    canAddShooters: false,
    canEditShooters: false,
    canDeleteShooters: false,
    canEnterScores: false,
    canConfirmScores: false,
    canResolveDisputes: false,
    canExportResults: true,
    canManageUsers: false,
    canViewResults: true,
  },
}

// Role labels
export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrators',
  scorer: 'Skaitītājs',
  viewer: 'Skatītājs',
}

// Role descriptions
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: 'Pilna piekļuve visām funkcijām',
  scorer: 'Var ievadīt un apstiprināt rezultātus',
  viewer: 'Tikai skatīšanās režīms',
}

// Helper function to get permissions for a role
export function getPermissions(role: UserRole): Permissions {
  return ROLE_PERMISSIONS[role]
}

// Helper function to check if user has permission
export function hasPermission(user: User | null, permission: keyof Permissions): boolean {
  if (!user) return false
  const permissions = getPermissions(user.role)
  return permissions[permission]
}
