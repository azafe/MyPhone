import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { createUser, fetchUsers, updateUserRole } from '../services/users'
import { Table } from '../components/ui/Table'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().min(1),
  role: z.enum(['seller', 'admin']),
})

type FormValues = z.infer<typeof schema>

export function AdminUsersPage() {
  const queryClient = useQueryClient()
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
  })

  const onSubmit = (values: FormValues) => createMutation.mutate(values)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-ink">Usuarios</h2>
        <p className="text-sm text-ink/60">Gestión de cuentas y roles.</p>
      </div>

      <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-soft">
        <h3 className="text-lg font-semibold text-ink">Nuevo vendedor</h3>
        <form className="mt-4 grid gap-3 md:grid-cols-4" onSubmit={form.handleSubmit(onSubmit)}>
          <Field label="Email">
            <Input {...form.register('email')} />
          </Field>
          <Field label="Password temporal">
            <Input {...form.register('password')} />
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
      </div>

      <Table headers={['Usuario', 'Rol', 'Acciones']}>
        {data.map((user) => (
          <tr key={user.id}>
            <td className="px-4 py-3">
              <div className="text-sm font-medium text-ink">{user.full_name ?? user.email}</div>
              <div className="text-xs text-ink/50">{user.email}</div>
            </td>
            <td className="px-4 py-3 text-sm uppercase tracking-[0.2em] text-ink/60">{user.role}</td>
            <td className="px-4 py-3">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setUpdating(user.id)
                    updateMutation.mutate({ id: user.id, role: user.role === 'admin' ? 'seller' : 'admin' })
                  }}
                  disabled={updating === user.id}
                >
                  {user.role === 'admin' ? 'Hacer seller' : 'Hacer admin'}
                </Button>
              </div>
            </td>
          </tr>
        ))}
      </Table>
    </div>
  )
}
