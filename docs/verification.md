# Verificación inicial — SCRUM-16

Fecha: 08/11/2026. Rama local: `feat/scrum-16-mobile-base`.

- `npm install` en Terminal: 465 paquetes instalados inicialmente; `npx expo install --check` ajustó React Native a 0.88.1 para Expo 58.0.23.
- `npm run typecheck`: aprobado.
- `npm run export:ios`: bundle iOS generado desde `index.ts` (617 módulos).
- `npm run export:android`: bundle Android generado desde `index.ts` (615 módulos).
- `npm ci --offline` desde el lockfile versionado: 456 paquetes instalados correctamente en el entorno de trabajo.
- La instalación informó cinco vulnerabilidades moderadas. Falta revisar el detalle con `npm audit`; no aplicar `npm audit fix --force` sin analizar el cambio de versiones.

La exportación valida los bundles JavaScript. Aún faltan arranque en simulador/dispositivo iOS y Android, build nativo y revisión de otro integrante antes de dar SCRUM-16 por terminada. La cuenta Auth0, la API operativa y los identificadores de tienda se configurarán en tareas posteriores.


## Cierre de sesi?n m?vil con el proveedor

Registrar `ohanaenvios://auth/logout` como URI de redirecci?n posterior al cierre en la aplicaci?n m?vil de ZITADEL del ambiente correspondiente. La app cierra la sesi?n local, intenta revocar el token y abre el cierre de sesi?n del proveedor. Si no puede confirmar ambas operaciones, muestra una advertencia. Verificar en Android e iOS con el proveedor real: ingreso, cierre, retorno a la app y que el siguiente ingreso vuelva a pedir credenciales. Las diferencias entre navegadores y la configuraci?n del proveedor requieren esta prueba; la compilaci?n por s? sola no confirma el cierre de cookies.
