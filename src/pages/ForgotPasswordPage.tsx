import { useState } from 'react'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { requestPasswordReset } from '../services/auth'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Field } from '../components/ui/Field'
import logo from '../assets/myphone.png'

const schema = z.object({
  email: z.string().email('Ingresá un email válido'),
})

type FormValues = z.infer<typeof schema>

export function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  })

  const onSubmit = async (values: FormValues) => {
    try {
      setLoading(true)
      await requestPasswordReset(values.email)
      setSent(true)
    } catch {
      toast.error('No se pudo enviar el email. Intentá de nuevo.')
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
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-[#0F172A]">Recuperar contraseña</h1>

          {sent ? (
            <div className="mt-6">
              <p className="text-sm text-[#5B677A]">
                Si el email está registrado, vas a recibir un enlace para restablecer tu contraseña en los próximos minutos.
              </p>
              <p className="mt-2 text-sm text-[#5B677A]">Revisá también la carpeta de spam.</p>
              <Link
                to="/login"
                className="mt-6 block text-center text-sm font-medium text-[#0F172A] underline underline-offset-4"
              >
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <>
              <p className="mt-1 text-sm text-[#5B677A]">
                Ingresá tu email y te enviamos un enlace para restablecer tu contraseña.
              </p>
              <form className="mt-6 space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                <Field label="Email">
                  <Input
                    type="email"
                    placeholder="mail@myphone.com"
                    {...form.register('email')}
                  />
                </Field>

                {form.formState.errors.email && (
                  <p className="text-xs text-[#DC2626]">{form.formState.errors.email.message}</p>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Enviando...' : 'Enviar enlace'}
                </Button>
              </form>

              <Link
                to="/login"
                className="mt-4 block text-center text-sm text-[#5B677A] hover:text-[#0F172A]"
              >
                Volver al inicio de sesión
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
