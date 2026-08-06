import { test, expect } from '@playwright/test'

test('un usuario sin negocio es redirigido a onboarding', async ({ page }) => {
  const email = `novato-${Date.now()}@postia.test`

  await page.goto('/register')

  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña').fill('postia12345')
  await page.getByRole('button', { name: /registrarse/i }).click()

  await page.waitForURL(/\/onboarding/)

  await page.goto('/dashboard')

  await page.waitForURL(/\/onboarding/)
  await expect(page.getByRole('heading', { name: /crea tu negocio/i })).toBeVisible()
})
