import { test, expect } from '@playwright/test'

test('el reporte de ventas refleja los pedidos cobrados', async ({ page }) => {
  const email = `reportes-${Date.now()}@postia.test`
  const negocio = `Negocio Reportes ${Date.now()}`

  await page.goto('/register')
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña').fill('postia12345')
  await page.getByRole('button', { name: /registrarse/i }).click()
  await page.waitForURL(/\/onboarding/)

  await page.getByLabel('Nombre del negocio').fill(negocio)
  await page.getByLabel('Slug').fill(`slug-reportes-${Date.now()}`)
  await page.getByRole('button', { name: /crear negocio/i }).click()
  await page.waitForURL(/\/dashboard/)

  const productRes = await page.request.post('/api/products', {
    data: { name: 'Pizza familiar', price: 200 },
  })
  const product = await productRes.json()

  const config = await (await page.request.get('/api/config')).json()
  const orderTypeId = config.orderTypes[0].id
  const paymentMethodId = config.paymentMethods[0].id

  const orderRes = await page.request.post('/api/orders', {
    data: {
      order_type_id: orderTypeId,
      items: [{ product_id: product.id, name: 'Pizza familiar', qty: 1, unit_price: 200 }],
    },
  })
  expect(orderRes.status()).toBe(201)
  const order = await orderRes.json()

  const chargeRes = await page.request.patch(`/api/orders/${order.id}`, {
    data: { payment_method_id: paymentMethodId },
  })
  expect(chargeRes.status()).toBe(200)

  await page.goto('/reportes')

  await expect(page.getByRole('heading', { name: /reporte de ventas/i })).toBeVisible()
  await expect(page.getByTestId('report-count')).toHaveText('1')
  await expect(page.getByTestId('report-total')).toHaveText('$232.00')
  await expect(page.getByText('Efectivo')).toBeVisible()
  await expect(page.getByText('1 pedidos')).toBeVisible()
})
