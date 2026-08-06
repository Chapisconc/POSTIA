import { test, expect } from '@playwright/test'

test('registrar un pedido desde el POS con total calculado', async ({ page }) => {
  const email = `pos-${Date.now()}@postia.test`
  const negocio = `Negocio POS ${Date.now()}`

  await page.goto('/register')
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña').fill('postia12345')
  await page.getByRole('button', { name: /registrarse/i }).click()
  await page.waitForURL(/\/onboarding/)

  await page.getByLabel('Nombre del negocio').fill(negocio)
  await page.getByLabel('Slug').fill(`slug-pos-${Date.now()}`)
  await page.getByRole('button', { name: /crear negocio/i }).click()
  await page.waitForURL(/\/dashboard/)

  await page.request.post('/api/products', {
    data: { name: 'Tacos de pastor', price: 50 },
  })
  await page.request.post('/api/products', {
    data: { name: 'Refresco de cola', price: 25 },
  })

  await page.goto('/pos')

  await expect(page.getByRole('heading', { name: /punto de venta/i })).toBeVisible()
  await expect(page.getByText('Tacos de pastor')).toBeVisible()

  await page.getByRole('button', { name: 'Tacos de pastor $50.00' }).click()
  await page.getByRole('button', { name: 'Refresco de cola $25.00' }).click()
  await page.getByRole('button', { name: 'Refresco de cola $25.00' }).click()

  const ticket = page.locator('section[aria-label="Ticket"]')
  await expect(ticket.getByText('Tacos de pastor')).toBeVisible()
  await expect(ticket.getByText('$50.00').first()).toBeVisible()

  const subtotalText = await ticket.getByTestId('subtotal').innerText()
  expect(subtotalText).toContain('$100.00')
  const taxText = await ticket.getByTestId('tax').innerText()
  expect(taxText).toContain('$16.00')
  const totalText = await ticket.getByTestId('total').innerText()
  expect(totalText).toContain('$116.00')

  await ticket.getByRole('combobox', { name: /tipo de pedido/i }).selectOption('En mesa')
  await page.getByRole('button', { name: /registrar pedido/i }).click()

  await expect(page.getByRole('heading', { name: /pedido registrado/i })).toBeVisible()
  await expect(page.getByText('$116.00')).toBeVisible()
})
