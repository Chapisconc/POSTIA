import { test, expect } from '@playwright/test'

test('crear un producto y verlo en la lista', async ({ page }) => {
  const email = `owner-${Date.now()}@postia.test`
  const negocio = `Negocio ${Date.now()}`
  const producto = `Tacos de ${Date.now()}`

  await page.goto('/register')
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña').fill('postia12345')
  await page.getByRole('button', { name: /registrarse/i }).click()
  await page.waitForURL(/\/onboarding/)

  await page.getByLabel('Nombre del negocio').fill(negocio)
  await page.getByLabel('Slug').fill(`slug-${Date.now()}`)
  await page.getByRole('button', { name: /crear negocio/i }).click()
  await page.waitForURL(/\/dashboard/)

  await page.goto('/dashboard/productos')

  await expect(page.getByRole('heading', { name: /productos/i })).toBeVisible()

  await page.getByLabel('Nombre').fill(producto)
  await page.getByLabel('Precio').fill('45.50')
  await page.getByRole('button', { name: /agregar producto/i }).click()

  await expect(page.getByText(producto)).toBeVisible()
  await expect(page.getByText('$45.50')).toBeVisible()
})
