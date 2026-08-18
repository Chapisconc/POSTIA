import { test, expect } from '@playwright/test'

test('registro, onboarding y dashboard muestran los módulos activos', async ({ page }) => {
  const email = `owner-${Date.now()}@postia.test`
  const negocio = `Taquería ${Date.now()}`

  await page.goto('/register')

  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña').fill('postia12345')
  await page.getByRole('button', { name: /registrarse/i }).click()

  await page.waitForURL(/\/onboarding/)

  await page.getByLabel('Nombre del negocio').fill(negocio)
  await page.getByLabel('Slug').fill(`taqueria-${Date.now()}`)
  await page.getByRole('button', { name: /crear negocio/i }).click()

  await page.waitForURL(/\/dashboard/)

  await expect(page.getByRole('heading', { name: negocio })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'POS' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Productos' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Caja' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Reportes' })).toBeVisible()
})
