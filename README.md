# Ohana Envíos — app móvil

Base Expo SDK 58 + React Native 0.88 + TypeScript para iOS y Android. Usa la paleta y la organización inicial del prototipo web de Ohana: resumen, envíos y perfil. No hay métricas simuladas ni inicio de sesión ficticio.

## Iniciar

Requiere Node.js 22.13 o superior y npm. Desde este directorio:

```bash
npm install
npx expo install --check
npm run typecheck
npm start
```

En el menú de Expo, presione `i` para el simulador iOS (macOS con Xcode) o `a` para el emulador Android (Android Studio). También puede usar una compilación de desarrollo en un dispositivo físico. `npm run ios` y `npm run android` abren directamente el destino correspondiente. Las carpetas nativas se generan solo cuando haga falta con `npx expo prebuild`; no están versionadas en esta base.

Para comprobar que el bundle se genera para ambas plataformas, ejecute `npm run build`; este comando corre TypeScript y exporta iOS y Android. También puede ejecutar `npm run export:ios` y `npm run export:android` por separado. CI ejecuta los mismos pasos.

## Estructura

- `App.tsx`: navegación y pantallas iniciales.
- `src/components/`: componentes reutilizables.
- `src/theme.ts`: colores compartidos con la identidad visual web.
- `app.json`: configuración de Expo para iOS y Android.

## Próximas integraciones

`EXPO_PUBLIC_API_BASE_URL` se reserva para la API; al probar en un teléfono físico no use `localhost`, sino la IP de su máquina en la red local o una URL de desarrollo accesible. Las variables `EXPO_PUBLIC_` son públicas: no guardar secretos allí. El inicio de sesión móvil, la persistencia segura de sesión, Auth0/MFA y los casos de uso reales se incorporarán en tareas posteriores. Antes de compilar para tiendas, confirmar identificadores de paquete, iconos, política de permisos y cuentas de Apple/Google con el equipo.
