import { test, expect } from '@playwright/test'

test('avanzar el estado de un pedido desde la lista de pedidos', async ({ page }) => {
  const email = `pedidos-${Date.now()}@postia.test`
  const negocio = `Negocio Pedidos ${Date.now()}`

  await page.goto('/register')
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña').fill('postia12345')
  await page.getByRole('button', { name: /registrarse/i }).click()
  await page.waitForURL(/\/onboarding/)

  await page.getByLabel('Nombre del negocio').fill(negocio)
  await page.getByLabel('Slug').fill(`slug-pedidos-${Date.now()}`)
  await page.getByRole('button', { name: /crear negocio/i }).click()
  await page.waitForURL(/\/dashboard/)

  await page.request.post('/api/products', {
    data: { name: 'Hamburguesa doble', price: 90 },
  })

  const productsRes = await page.request.post('/api/products', {
    data: { name: 'Hamburguesa extra', price: 95 },
  })
  const product = await productsRes.json()

  const configRes = await page.request.get('/api/config')
  expect(configRes.status()).toBe(200)
  const config = await configRes.json()
  const orderTypeId = config.orderTypes[0].id

  const response = await page.request.post('/api/orders', {
    data: {
      order_type_id: orderTypeId,
      items: [{ product_id: product.id, name: 'Hamburguesa extra', qty: 1, unit_price: 95 }],
    },
  })
  expect(response.status()).toBe(201)

  await page.goto('/pedidos')

  await expect(page.getByRole('heading', { name: /pedidos/i })).toBeVisible()
  await expect(page.getByText('Hamburguesa extra')).toBeVisible()
  await expect(page.getByText('Nuevo')).toBeVisible()

  await page.getByRole('button', { name: /avanzar a preparando/i }).click()

  await expect(page.getByText('Preparando')).toBeVisible()
  await expect(page.getByRole('button', { name: /avanzar a listo/i })).toBeVisible()
})
