import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Field } from '../components/ui/Field'
import logo from '../assets/myphone.jpeg'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (values: FormValues) => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    })
    setLoading(false)
    if (error) {
      toast.error('Credenciales inválidas')
      return
    }
    toast.success('Bienvenido a MyPhone')
    navigate('/dashboard')
  }

  return (
    <div className="relative min-h-screen bg-[#F6F8FB] px-4">
      <img
        src={logo}
        alt=""
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-10 hidden h-64 w-64 -translate-x-1/2 rounded-full object-cover opacity-[0.05] md:block"
      />
      <div className="mx-auto flex min-h-screen max-w-md items-center">
        <div className="w-full rounded-2xl border border-[#E6EBF2] bg-white p-8 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(11,74,162,0.08)] text-sm font-semibold text-[#0B4AA2]">
              M
            </div>
            <div>
              <p className="text-sm font-semibold tracking-[-0.02em] text-[#0F172A]">MyPhone</p>
              <p className="text-xs text-[#5B677A]">Business Premium</p>
            </div>
          </div>
          <h1 className="mt-6 text-2xl font-semibold tracking-[-0.02em] text-[#0F172A]">Ingreso rápido</h1>
          <p className="mt-1 text-sm text-[#5B677A]">Accedé con tu cuenta para gestionar stock y ventas.</p>

          <form className="mt-6 space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <Field label="Email">
              <Input type="email" placeholder="mail@myphone.com" {...form.register('email')} />
            </Field>
            <Field label="Password">
              <Input type="password" placeholder="••••••••" {...form.register('password')} />
            </Field>

            <Button className="w-full" disabled={loading}>
              {loading ? 'Ingresando...' : 'Entrar'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
