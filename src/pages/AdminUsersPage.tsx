import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { createUser, fetchUsers, updateUserRole } from '../services/users'
import { useAuth } from '../hooks/useAuth'
import { Table } from '../components/ui/Table'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Card } from '../components/ui/Card'

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
  const { data = [] } = useQuery({ queryKey: ['users'], queryFn: fetchUsers })
  const [updating, setUpdating] = useState<string | null>(null)

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
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: 'seller' | 'admin' }) => updateUserRole(id, role),
    onSuccess: () => {
      toast.success('Rol actualizado')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setUpdating(null)
    },
    onError: (error) => {
      const err = error as Error
      toast.error(err.message || 'No se pudo actualizar rol')
      setUpdating(null)
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

      <Table headers={['Usuario', 'Rol', 'Acciones']}>
        {data.map((user) => {
          const role = String(user.role ?? '').toLowerCase()
          const isOwner = role === 'owner'
          const isSelf = user.id === profile?.id
          const nextRole: 'seller' | 'admin' | null = role === 'admin' ? 'seller' : role === 'seller' ? 'admin' : null
          const isSelfDowngrade = isSelf && role === 'admin' && nextRole === 'seller'
          const isProtected = isOwner || isSelfDowngrade || !nextRole

          return (
            <tr key={user.id}>
              <td className="px-4 py-3">
                <div className="text-sm font-medium text-[#0F172A]">{user.full_name ?? user.email}</div>
                <div className="text-xs text-[#5B677A]">{user.email}</div>
              </td>
              <td className="px-4 py-3 text-sm uppercase tracking-[0.2em] text-[#5B677A]">{user.role}</td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      if (!nextRole || isProtected) return
                      setUpdating(user.id)
                      updateMutation.mutate({ id: user.id, role: nextRole })
                    }}
                    disabled={updating === user.id || isProtected}
                  >
                    {isOwner
                      ? 'Owner protegido'
                      : isSelfDowngrade
                        ? 'Tu cuenta (protegida)'
                        : role === 'admin'
                          ? 'Hacer seller'
                          : 'Hacer admin'}
                  </Button>
                </div>
              </td>
            </tr>
          )
        })}
      </Table>
    </div>
  )
}
