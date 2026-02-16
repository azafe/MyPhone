import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Field } from '../components/ui/Field'
import logo from '../assets/myphone.png'

const schema = z.object({
  email: z.string().email('Ingresá un email válido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const [loading, setLoading] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (values: FormValues) => {
    try {
      setLoading(true)
      await signIn(values)
      toast.success('Bienvenido a MyPhone')
      navigate('/stock')
    } catch (error) {
      const err = error as Error
      toast.error(err.message || 'No se pudo iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F6F8FB] px-4">
      <div className="mx-auto flex min-h-screen max-w-md items-center">
        <div className="w-full rounded-2xl border border-[#E6EBF2] bg-white p-8 shadow-[0_20px_40px_rgba(15,23,42,0.10)]">
          <div className="flex items-center justify-center">
            <img src={logo} alt="MyPhone" className="mb-6 h-10 w-auto object-contain" />
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-[#0F172A]">Ingreso</h1>
          <p className="mt-1 text-sm text-[#5B677A]">Accedé con tu cuenta para operar stock y ventas.</p>

          <form className="mt-6 space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <Field label="Email">
              <Input type="email" placeholder="mail@myphone.com" {...form.register('email')} />
            </Field>
            <Field label="Password">
              <Input type="password" placeholder="••••••••" {...form.register('password')} />
            </Field>

            {(form.formState.errors.email || form.formState.errors.password) && (
              <div className="space-y-1 text-xs text-[#DC2626]">
                {form.formState.errors.email?.message && <p>{form.formState.errors.email.message}</p>}
                {form.formState.errors.password?.message && <p>{form.formState.errors.password.message}</p>}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Ingresando...' : 'Entrar'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
