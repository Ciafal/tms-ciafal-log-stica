import React, { createContext, useContext, useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { UserProfile, UserRole, getUserPermissions, Permissions } from '@/domain/rules'

interface AuthContextType {
  user: UserProfile | null
  role: UserRole
  permissions: Permissions
  setSimulatedRole: (role: UserRole) => void
  logout: () => void
  isLoading: boolean
}

const DEFAULT_USER: UserProfile = {
  id: 'usr-admin-master',
  name: 'Administrador Master CIAFAL',
  email: 'ciafal@ciafal.com.br',
  role: 'admin_master',
  phone: '11999990001',
}

const AuthContext = createContext<AuthContextType>({
  user: DEFAULT_USER,
  role: 'admin_master',
  permissions: getUserPermissions('admin_master'),
  setSimulatedRole: () => {},
  logout: () => {},
  isLoading: false,
})

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(DEFAULT_USER)
  const [role, setRole] = useState<UserRole>('admin_master')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Check local pocketbase auth
    if (pb.authStore.isValid && pb.authStore.model) {
      const model = pb.authStore.model
      const userRole = (model.role as UserRole) || 'admin_master'
      setUser({
        id: model.id,
        name: model.name || 'Usuário Corporativo',
        email: model.email,
        role: userRole,
        phone: model.phone,
      })
      setRole(userRole)
    }
  }, [])

  const setSimulatedRole = (newRole: UserRole) => {
    setRole(newRole)
    if (user) {
      setUser({
        ...user,
        role: newRole,
      })
    }
  }

  const logout = () => {
    pb.authStore.clear()
    setUser(null)
  }

  const permissions = getUserPermissions(role)

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        permissions,
        setSimulatedRole,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
