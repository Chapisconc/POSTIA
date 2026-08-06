import { createProduct, listProducts } from '@/lib/products/products'
import type { ConfigClient } from '@/lib/config/service'

export async function handleListProductsRequest(orgId: string, client: ConfigClient) {
  try {
    const products = await listProducts(client as never, orgId)
    return Response.json(products, { status: 200 })
  } catch (error) {
    console.error('products-handler (GET):', error)
    return Response.json({ error: 'No se pudieron obtener los productos' }, { status: 500 })
  }
}

export async function handleCreateProductRequest(
  orgId: string,
  client: ConfigClient,
  request: Request,
) {
  let body: { name?: string; price?: number }

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  try {
    const product = await createProduct(client as never, orgId, {
      name: body.name ?? '',
      price: body.price ?? 0,
    })
    return Response.json(product, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message.includes('obligatorio')) {
      return Response.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof Error && error.message.includes('mayor o igual')) {
      return Response.json({ error: error.message }, { status: 400 })
    }
    console.error('products-handler (POST):', error)
    return Response.json({ error: 'No se pudo crear el producto' }, { status: 500 })
  }
}
