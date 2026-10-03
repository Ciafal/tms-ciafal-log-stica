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
    // Check local pocketbase auth defensivamente
    try {
      if (pb.authStore.isValid && pb.authStore.model) {
        const rawModel = pb.authStore.model
        // Validação estrita: model deve ser objeto não-nulo e não-string com id presente
        if (
          typeof rawModel === 'object' &&
          rawModel !== null &&
          'id' in rawModel &&
          Boolean((rawModel as Record<string, unknown>).id)
        ) {
          const model = rawModel as Record<string, unknown>
          const userRole = (model?.role as UserRole) || 'admin_master'
          setUser({
            id: String(model?.id),
            name: (model?.name as string) || 'Usuário Corporativo',
            email: (model?.email as string) || '',
            role: userRole,
            phone: (model?.phone as string) || undefined,
          })
          setRole(userRole)
        }
      }
    } catch (err) {
      console.warn('[AuthProvider] Falha defensiva ao restaurar sessão de autenticação:', err)
      // Preserva o fallback padrão sem derrubar a aplicação
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
