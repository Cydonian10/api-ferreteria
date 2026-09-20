Orden recomendado:

1. CreateProductHandler

- Verifica que llame a repository.create().
- Verifica que guarde el producto con repository.save().

2. UpdateProductHandler

- Actualiza un producto existente.
- Lanza NotFoundException si no existe.
- Verifica que conserve los campos esperados.
- Aquí probablemente descubrirás un bug: description llega en el comando, pero no se actualiza en el handler.

3. FindAllProductsHandler

- Verifica que consulte el repositorio.
- Verifica que ordene por id ASC.

4. ProductsController

- POST /products envía los datos al CommandBus.
- PATCH /products/:id envía correctamente el id.
- GET /products ejecuta la query correcta.

5. Pruebas e2e

- Crear producto.
- Listar productos.
- Actualizar producto.
- Actualizar un producto inexistente.
- Validar datos inválidos.
