import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { createUser, deleteAdminUser, getAdminUsers, updateUserRole } from '../services/users'
import { useAuth } from '../hooks/useAuth'
import type { AdminUser } from '../types'
import { Table } from '../components/ui/Table'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Card } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().min(1),
  role: z.enum(['seller', 'admin']),
})

type FormValues = z.infer<typeof schema>

export function AdminUsersPage() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const { data = [], error, isLoading } = useQuery<AdminUser[]>({ queryKey: ['users'], queryFn: getAdminUsers })
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'seller' },
  })

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      toast.success('Usuario creado')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      form.reset({ role: 'seller' })
    },
    onError: (error) => {
      const err = error as Error
      toast.error(err.message || 'No se pudo crear el usuario')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: 'seller' | 'admin' }) => updateUserRole(id, role),
    onSuccess: () => {
      toast.success('Rol actualizado')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setUpdatingId(null)
    },
    onError: (error) => {
      const err = error as Error
      toast.error(err.message || 'No se pudo actualizar rol')
      setUpdatingId(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => deleteAdminUser(userId),
    onSuccess: () => {
      toast.success('Usuario eliminado')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setDeletingId(null)
      setDeleteTarget(null)
    },
    onError: (error) => {
      const err = error as Error
      toast.error(err.message || 'No se pudo eliminar el usuario')
      setDeletingId(null)
    },
  })

  const onSubmit = (values: FormValues) => createMutation.mutate(values)

  const handleCopyPassword = async () => {
    const password = form.getValues('password')?.trim()
    if (!password) {
      toast.error('Ingresá una contraseña temporal primero')
      return
    }

    if (!navigator.clipboard) {
      toast.error('Portapapeles no disponible en este navegador')
      return
    }

    try {
      await navigator.clipboard.writeText(password)
      toast.success('Contraseña copiada')
    } catch {
      toast.error('No se pudo copiar la contraseña')
    }
  }

  const currentRole = String(profile?.role ?? '').toLowerCase()
  const isCurrentOwner = currentRole === 'owner'
  const isCurrentAdmin = currentRole === 'admin'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#0F172A]">Usuarios</h2>
        <p className="text-sm text-[#5B677A]">Gestión de cuentas y roles.</p>
      </div>

      <Card className="p-5">
        <h3 className="text-lg font-semibold text-[#0F172A]">Nuevo vendedor</h3>
        <p className="mt-2 text-xs text-[#64748B]">
          Carga manual de usuarios. Para seeds masivos, usar un script/backend protegido (no desde cliente).
        </p>
        <form className="mt-4 grid gap-3 md:grid-cols-4" onSubmit={form.handleSubmit(onSubmit)}>
          <Field label="Email">
            <Input {...form.register('email')} />
          </Field>
          <Field label="Password temporal">
            <div className="flex items-center gap-2">
              <Input type="password" autoComplete="new-password" className="flex-1" {...form.register('password')} />
              <Button type="button" size="sm" variant="secondary" onClick={handleCopyPassword}>
                Copiar
              </Button>
            </div>
          </Field>
          <Field label="Nombre completo">
            <Input {...form.register('full_name')} />
          </Field>
          <Field label="Rol">
            <Select {...form.register('role')}>
              <option value="seller">Vendedor</option>
              <option value="admin">Admin</option>
            </Select>
          </Field>
          <Button type="submit" className="md:col-span-4" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creando...' : 'Crear usuario'}
          </Button>
        </form>
      </Card>

      {error ? (
        <div className="rounded-xl border border-[rgba(185,28,28,0.2)] bg-[rgba(185,28,28,0.08)] px-4 py-3 text-sm text-[#B91C1C]">
          No se pudo cargar usuarios: {(error as Error).message}
        </div>
      ) : null}

      <Table headers={['Nombre', 'Email', 'Rol', 'Estado', 'Acciones']}>
        {isLoading ? (
          <tr>
            <td className="px-4 py-6 text-sm text-[#5B677A]" colSpan={5}>
              Cargando usuarios...
            </td>
          </tr>
        ) : data.length === 0 ? (
          <tr>
            <td className="px-4 py-6 text-sm text-[#5B677A]" colSpan={5}>
              No hay usuarios para mostrar.
            </td>
          </tr>
        ) : (
          data.map((user) => {
            const role = String(user.role ?? '').toLowerCase() as AdminUser['role']
            const isOwner = role === 'owner'
            const isSelf = user.id === profile?.id
            const nextRole: 'seller' | 'admin' | null = role === 'admin' ? 'seller' : role === 'seller' ? 'admin' : null
            const isSelfDowngrade = isSelf && role === 'admin' && nextRole === 'seller'

            const canEditRole =
              Boolean(nextRole) &&
              !isOwner &&
              !isSelfDowngrade &&
              (isCurrentOwner || (isCurrentAdmin && role === 'seller'))

            const canDelete =
              !isOwner &&
              !isSelf &&
              (isCurrentOwner || (isCurrentAdmin && role === 'seller'))

            return (
              <tr key={user.id}>
                <td className="px-4 py-3 text-sm font-medium text-[#0F172A]">{user.full_name || user.email || 'Sin nombre'}</td>
                <td className="px-4 py-3 text-sm text-[#5B677A]">{user.email || '—'}</td>
                <td className="px-4 py-3 text-sm uppercase tracking-[0.12em] text-[#475569]">{role}</td>
                <td className="px-4 py-3 text-sm">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                      user.is_enabled ? 'bg-[rgba(22,163,74,0.14)] text-[#166534]' : 'bg-[rgba(148,163,184,0.2)] text-[#334155]'
                    }`}
                  >
                    {user.is_enabled ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        if (!nextRole || !canEditRole) return
                        setUpdatingId(user.id)
                        updateMutation.mutate({ id: user.id, role: nextRole })
                      }}
                      disabled={updatingId === user.id || !canEditRole}
                    >
                      {isOwner
                        ? 'Protegido'
                        : isSelfDowngrade
                          ? 'Tu cuenta'
                          : role === 'admin'
                            ? 'Hacer seller'
                            : 'Hacer admin'}
                    </Button>

                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setDeleteTarget(user)}
                      disabled={!canDelete || deletingId === user.id}
                    >
                      {isOwner ? 'Protegido' : isSelf ? 'Tu cuenta' : deletingId === user.id ? 'Eliminando...' : 'Eliminar'}
                    </Button>
                  </div>
                </td>
              </tr>
            )
          })
        )}
      </Table>

      <Modal
        open={Boolean(deleteTarget)}
        title="Confirmar eliminación"
        subtitle={
          deleteTarget ? `¿Eliminar usuario ${deleteTarget.full_name || deleteTarget.email || ''}? Esta acción no se puede deshacer.` : ''
        }
        onClose={() => {
          if (deleteMutation.isPending) return
          setDeleteTarget(null)
        }}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (!deleteTarget) return
                setDeletingId(deleteTarget.id)
                deleteMutation.mutate(deleteTarget.id)
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar usuario'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-[#5B677A]">
          Esta operación elimina la cuenta del usuario seleccionado y no se puede deshacer.
        </p>
      </Modal>
    </div>
  )
}
