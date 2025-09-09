# Cloudflare R2 CORS

En R2, crea una **CORS policy**:
- Allowed origins: `*` (o tu dominio)
- Allowed methods: `PUT, GET`
- Allowed headers: `content-type, authorization, x-amz-date, x-amz-content-sha256`
- Expose headers: `ETag`
- Max age: `86400`
