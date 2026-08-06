import { test, expect } from '@playwright/test'

test('los módulos nuevos se renderizan y la caja funciona', async ({ page }) => {
  const email = `modulos-${Date.now()}@postia.test`
  const negocio = `Negocio Módulos ${Date.now()}`

  await page.goto('/register')
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña').fill('postia12345')
  await page.getByRole('button', { name: /registrarse/i }).click()
  await page.waitForURL(/\/onboarding/)

  await page.getByLabel('Nombre del negocio').fill(negocio)
  await page.getByLabel('Slug').fill(`slug-modulos-${Date.now()}`)
  await page.getByRole('button', { name: /crear negocio/i }).click()
  await page.waitForURL(/\/dashboard/)

  const pages: { path: string; heading: RegExp }[] = [
    { path: '/caja', heading: /caja/i },
    { path: '/cocina', heading: /cocina/i },
    { path: '/inventario', heading: /inventario/i },
    { path: '/delivery', heading: /delivery/i },
    { path: '/reservaciones', heading: /reservaciones/i },
    { path: '/facturacion', heading: /facturaci[oó]n/i },
    { path: '/promociones', heading: /promociones/i },
    { path: '/puntos', heading: /puntos/i },
    { path: '/sucursales', heading: /sucursales/i },
  ]

  for (const { path, heading } of pages) {
    await page.goto(path)
    await expect(page.getByRole('heading', { name: heading })).toBeVisible()
  }

  await page.goto('/caja')
  await page.getByLabel('Monto inicial').fill('500')
  await page.getByRole('button', { name: /abrir caja/i }).click()
  await expect(page.getByText('Caja abierta')).toBeVisible()

  const registers = await (await page.request.get('/api/caja')).json()
  const openRegister = (registers as { id: number; status: string }[]).find(
    (r) => r.status === 'abierta',
  )
  expect(openRegister).toBeDefined()
  const closeRes = await page.request.patch(`/api/caja/${openRegister!.id}/close`, {
    data: { closing_amount: 1200 },
  })
  expect(closeRes.status()).toBe(200)

  await page.goto('/caja')
  await expect(page.getByText('Cierre: $1,200.00')).toBeVisible()

  await page.goto('/sucursales')
  await page.getByLabel('Nombre').fill('Sucursal Centro')
  await page.getByLabel('Dirección').fill('Av. Juárez 123')
  await page.getByRole('button', { name: /agregar sucursal/i }).click()
  await expect(page.getByText('Sucursal Centro')).toBeVisible()
  await expect(page.getByText('Av. Juárez 123')).toBeVisible()
})
