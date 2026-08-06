import { test, expect } from '@playwright/test'

test('registrar clientes desde el catálogo y consultarlos por API', async ({ page }) => {
  const email = `clientes-${Date.now()}@postia.test`
  const negocio = `Negocio Clientes ${Date.now()}`

  await page.goto('/register')
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña').fill('postia12345')
  await page.getByRole('button', { name: /registrarse/i }).click()
  await page.waitForURL(/\/onboarding/)

  await page.getByLabel('Nombre del negocio').fill(negocio)
  await page.getByLabel('Slug').fill(`slug-clientes-${Date.now()}`)
  await page.getByRole('button', { name: /crear negocio/i }).click()
  await page.waitForURL(/\/dashboard/)

  await page.getByRole('link', { name: 'Clientes', exact: true }).first().click()
  await page.waitForURL(/\/dashboard\/clientes/)

  await page.getByLabel('Nombre').fill('María López')
  await page.getByLabel('Correo').fill('maria@correo.mx')
  await page.getByLabel('Teléfono').fill('3312345678')
  await page.getByRole('button', { name: /agregar cliente/i }).click()

  await expect(page.getByText('María López')).toBeVisible()
  await expect(page.getByText('3312345678 · maria@correo.mx')).toBeVisible()

  const res = await page.request.get('/api/customers')
  expect(res.status()).toBe(200)
  const customers = await res.json()
  expect(customers.some((c: { name: string }) => c.name === 'María López')).toBe(true)

  const created = await page.request.post('/api/customers', {
    data: { name: 'Ana Torres', email: 'no-es-correo' },
  })
  expect(created.status()).toBe(400)
})
