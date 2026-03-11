import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { confirmPasswordReset } from '../services/auth'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Field } from '../components/ui/Field'
import logo from '../assets/myphone.png'

const schema = z
  .object({
    password: z.string().min(6, 'Mínimo 6 caracteres'),
    confirm: z.string().min(6, 'Mínimo 6 caracteres'),
  })
  .refine((data) => data.password === data.confirm, {
    message: 'Las contraseñas no coinciden',
    path: ['confirm'],
  })

type FormValues = z.infer<typeof schema>

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [detecting, setDetecting] = useState(true)
  const [tokenError, setTokenError] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirm: '' },
  })

  useEffect(() => {
    // Supabase pone el access_token en el hash de la URL después del redirect de recuperación
    const hash = window.location.hash
    const params = new URLSearchParams(hash.replace('#', '?'))
    const token = params.get('access_token')
    const type = params.get('type')

    if (token && type === 'recovery') {
      setAccessToken(token)
      setDetecting(false)
      return
    }

    // También puede venir como query param en flujos PKCE
    const searchParams = new URLSearchParams(window.location.search)
    const code = searchParams.get('code')

    if (code) {
      // Intercambiar el code por una sesión usando Supabase
      supabase.auth
        .exchangeCodeForSession(code)
        .then(({ data, error }) => {
          if (error || !data.session) {
            setTokenError(true)
          } else {
            setAccessToken(data.session.access_token)
          }
          setDetecting(false)
        })
        .catch(() => {
          setTokenError(true)
          setDetecting(false)
        })
      return
    }

    // Sin token válido
    setTokenError(true)
    setDetecting(false)
  }, [])

  const onSubmit = async (values: FormValues) => {
    if (!accessToken) return

    try {
      setLoading(true)
      await confirmPasswordReset(accessToken, values.password)
      toast.success('Contraseña actualizada. Ya podés ingresar.')
      navigate('/login')
    } catch (error) {
      const err = error as Error
      toast.error(err.message || 'No se pudo actualizar la contraseña. El enlace puede haber expirado.')
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
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-[#0F172A]">Nueva contraseña</h1>

          {detecting && (
            <p className="mt-4 text-sm text-[#5B677A]">Verificando enlace...</p>
          )}

          {!detecting && tokenError && (
            <div className="mt-4">
              <p className="text-sm text-[#DC2626]">
                El enlace de recuperación es inválido o ya expiró.
              </p>
              <a
                href="/forgot-password"
                className="mt-4 block text-sm font-medium text-[#0F172A] underline underline-offset-4"
              >
                Solicitar un nuevo enlace
              </a>
            </div>
          )}

          {!detecting && !tokenError && (
            <>
              <p className="mt-1 text-sm text-[#5B677A]">Ingresá tu nueva contraseña.</p>
              <form className="mt-6 space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                <Field label="Nueva contraseña">
                  <Input type="password" placeholder="••••••••" {...form.register('password')} />
                </Field>
                <Field label="Repetir contraseña">
                  <Input type="password" placeholder="••••••••" {...form.register('confirm')} />
                </Field>

                {(form.formState.errors.password || form.formState.errors.confirm) && (
                  <div className="space-y-1 text-xs text-[#DC2626]">
                    {form.formState.errors.password?.message && (
                      <p>{form.formState.errors.password.message}</p>
                    )}
                    {form.formState.errors.confirm?.message && (
                      <p>{form.formState.errors.confirm.message}</p>
                    )}
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
