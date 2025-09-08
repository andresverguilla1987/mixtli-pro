-- Ejemplos específicos (opcional). Ajusta a tu esquema si aplica.
-- Este archivo se ejecuta DESPUÉS del script genérico sanitize-staging.js

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='users') THEN
    -- En users: enmascarar correos y teléfonos salvo cuentas internas
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='email') THEN
      EXECUTE $$UPDATE public.users
               SET email = CASE WHEN email ILIKE '%@mixtli.test' OR email ILIKE '%@example.invalid'
                                THEN email ELSE 'user_' || id || '@example.invalid' END$$;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='phone') THEN
      EXECUTE $$UPDATE public.users SET phone = '0000000000'$$;
    END IF;
  END IF;
END $$;
