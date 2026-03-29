import type { ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { hasPermission } from './types/auth'
import type { Permissions } from './types/auth'

interface Props {
  permission: keyof Permissions
  children: ReactNode
  onClick?: () => void
  className?: string
  disabled?: boolean
  title?: string
}

export default function ProtectedButton({ 
  permission, 
  children, 
  onClick, 
  className = '', 
  disabled = false,
  title
}: Props) {
  const { user } = useAuth()
  const allowed = hasPermission(user, permission)

  if (!allowed) {
    return null
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={className}
    >
      {children}
    </button>
  )
}
