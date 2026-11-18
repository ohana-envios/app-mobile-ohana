# Paridad web y móvil — SCRUM-20 / SCRUM-21

Actualización: la API habilita la lectura administrativa de clientes y usuarios para `ADMIN` según la decisión del usuario. Las pantallas de lectura de web y móvil están conectadas en código a la API y usan la sesión operativa. El ingreso móvil emplea código con PKCE y requiere configuración del cliente nativo y de la API; todavía no se ha verificado con ZITADEL ni dispositivos reales. Las vistas previas de ambas plataformas siguen usando datos ficticios y conservan las mismas reglas.

Edición administrativa: web y móvil envían los cuatro campos de nombre y contacto y sus valores originales a `PATCH /api/customers/:customerId`. La API verifica el rol, valida los datos y rechaza con 409 un cambio concurrente en esos campos. Ambas interfaces conservan el borrador y ofrecen descartar y recargar. La persistencia y la concurrencia se probaron en PostgreSQL aislado con autenticación simulada; falta la prueba con ZITADEL y dispositivos reales. Las vistas previas siguen guardando solo en memoria. La auditoría continúa pendiente.

Direcciones: web y móvil conectan alta, edición, desactivación y reactivación a la API para administradores. El servidor valida la pertenencia al cliente y rechaza versiones desactualizadas y la desactivación de la última activa. La validación y concurrencia se probaron con PostgreSQL aislado; falta la prueba integrada con ZITADEL y dispositivos reales. La migración de estado debe coordinarse con el compañero antes de su aplicación en cualquier ambiente compartido.

Avance de integración: ambas plataformas tienen una fuente de lectura equivalente para clientes y usuarios y una consulta de sesión operativa (`/api/users/me`), sin sustituir errores por datos ficticios. La ficha móvil acepta una fuente de solo lectura y ambas plataformas omiten el estado de dirección cuando la API no lo proporciona. El token móvil se conserva solo en memoria y salir del panel no cierra necesariamente la sesión del navegador. El alta del cliente móvil en ZITADEL y su configuración en la API deben coordinarse con la integración de identidad existente.

## Fuente y alcance

La fuente principal es el documento `Documento final provisorio-ATI-330903-334109 Final 2026 Copiar.docx` entregado por el usuario, conservado en `../../api-ohana/docs/private/`. Los otros documentos de casos de uso y alcance copiados de Proyecto_Integrador son complementarios o históricos y no pueden reemplazarlo. Las decisiones expresas posteriores del usuario complementan esa fuente.

Esta entrega empareja las vistas previas administrativas existentes en web con pantallas nativas y conecta lectura y edición administrativa de datos de clientes. No implementa autogestión del cliente, administración real de permisos ni las demás escrituras. No corresponde declarar RF-16/RF-17 completos.

## Funciones equivalentes

| Función | Web | Móvil |
|---|---|---|
| Consulta de clientes: búsqueda, estado, paginación y ficha | Vista previa | Vista previa nativa |
| Edición de nombre, razón social, email y teléfono | API conectada; prueba real pendiente | API conectada; prueba real pendiente |
| Alta y edición de direcciones con validaciones y aviso de duplicados | API conectada; prueba real de identidad pendiente | API conectada; prueba real de identidad pendiente |
| Desactivar/reactivar clientes sin borrar datos | Temporal | Temporal |
| Desactivar/reactivar direcciones conservando historial visible | API conectada; prueba real de identidad pendiente | API conectada; prueba real de identidad pendiente |
| Conservar al menos una dirección activa | Interfaz y API | Interfaz y API |
| Consulta de usuarios: búsqueda, rol, acceso y paginación | Vista previa | Vista previa nativa |
| Cambio de rol y acceso: edición, revisión y confirmación | Temporal | Temporal |
| Evidencia del último cambio de acceso (actor, fecha, antes/después) | Temporal, sin persistencia | Temporal, sin persistencia |
| Estados de carga, error, reintento y resultados vacíos | Implementados | Implementados |
| Lectura administrativa con sesión real | Conectada en código; prueba real pendiente | Conectada en código; configuración y prueba real pendientes |
| Otras escrituras, auditoría y otros permisos | Pendientes | Pendientes |

Para desactivar la última dirección se debe agregar o reactivar otra primero. Los estados del cliente y de la cuenta de acceso siguen separados; no se conceden permisos al cambiar filtros ni al reactivar una ficha comercial. La relación operativa definitiva de ambos estados debe resolverse contra el documento principal antes de implementar efectos reales.

## Diseño

Ambas vistas previas usan la paleta verde del prototipo, tarjetas claras, radios y navegación inferior entre Clientes y Control/Usuarios. La web carga Plus Jakarta Sans con alternativa del sistema; móvil usa la tipografía nativa. Los controles móviles se adaptan a pantalla táctil y teclado, con etiquetas accesibles y altura mínima de 52 puntos. No se replican las secciones de otros sprints ni se modifica la pantalla de autenticación del compañero.

## Contratos y reglas

`src/preview/customers/`, `src/preview/users/` y `src/preview/api-sources.ts` contienen copias controladas de los archivos TypeScript equivalentes de web: tipos, validadores y fuentes de datos. Son repositorios independientes; no se agregaron imports hacia carpetas hermanas ni dependencias de runtime entre ellos.

Si cambia una regla, actualizar ambas copias y ejecutar las mismas pruebas en ambos repositorios. Con ambos repositorios en carpetas hermanas, `node scripts/check-web-parity.mjs` verifica igualdad de los siete archivos y de las cinco suites de datos compartidas. Se conserva la proyección de campos permitidos y la validación en la fuente, además de la interfaz. Los datos ficticios y las pruebas se mantienen iguales. El generador de IDs de prueba y las copias de registros no dependen de APIs exclusivas del navegador.

Las vistas previas usan metadatos propios; la API utiliza `Address.active` mediante una migración aditiva que debe coordinarse. Los límites de texto y la advertencia de duplicados siguen siendo las decisiones provisionales ya documentadas en web, no nuevas reglas atribuidas al documento.

## Cómo probar móvil

Para el acceso administrativo real, configurar las variables públicas de `.env.example` con el issuer HTTPS, el identificador de cliente nativo, el proyecto y la API HTTPS del ambiente de desarrollo. Estos valores son públicos y no deben contener secretos. La API necesita el mismo cliente nativo en `ZITADEL_MOBILE_CLIENT_IDS`. Usar un build de desarrollo con el esquema `ohanaenvios` registrado en ZITADEL; Expo Go no acredita el retorno nativo. La sesión se limita a la duración del token y al salir se borra de memoria, sin garantizar cierre de la sesión del proveedor. No se ha probado aún con credenciales reales.

```powershell
npm ci
npm start
```

Abrir la app mediante un dispositivo o emulador compatible con la versión de Expo del proyecto. En desarrollo aparece el botón **Probar Clientes y Usuarios · Datos ficticios**. Permite entrar a la simulación administrativa; no representa una sesión real. Salir y volver a entrar reinicia los datos de clientes.

1. Buscar y filtrar clientes, recorrer las páginas y abrir una ficha.
2. Editar datos, cancelar, probar email inválido y guardar una corrección.
3. Agregar/editar una dirección, probar campos obligatorios y aviso de duplicados.
4. Desactivar una dirección y comprobar que se conserva; comprobar que la última activa queda bloqueada.
5. Agregar o reactivar otra y comprobar que ahora puede desactivarse la anterior.
6. Cancelar y confirmar cambios de estado del cliente y direcciones; comprobar que sus estados no cambian entre sí.
7. En Usuarios, combinar búsqueda, rol y estado de acceso; probar resultados vacíos y limpiar filtros.
8. Revisar teclado, lector de pantalla, tamaños de texto y pantallas pequeñas en iOS y Android.

## Verificación y límites

Las 24 pruebas de datos y validaciones se ejecutan en cada repositorio:

```powershell
node --experimental-strip-types --test test/*.test.mjs
npm run build
```

El build móvil verifica TypeScript y exporta JavaScript/Hermes para iOS y Android. Una exportación no es un instalador ni acredita uso real en dispositivo. También se comprueba por separado el empaquetado de la vista de desarrollo y que los marcadores de datos ficticios no aparezcan en los artefactos normales de producción. La entrada a la simulación y su import están limitadas por `__DEV__`; no existe acceso alternativo a servicios reales.

Las pruebas de datos no ejecutan eventos React Native. La validación visual y de interacción en un dispositivo sigue pendiente. Tampoco se verificó MFA, correo, cuentas reales ni conectividad con API en móvil. La diferencia Auth0/documento frente a ZITADEL/API permanece a coordinar con el compañero.

No se modificaron dependencias, lockfile, CI, esquema, migraciones ni proveedor de identidad. Se habilitaron imports TypeScript con extensión en el chequeo sin emisión, para ejecutar las mismas reglas con Node y Metro.


Resultado del primer emparejamiento 14/11/2026: 24 pruebas por repositorio (48 ejecuciones), verificación de paridad, build web, TypeScript móvil y exportaciones normales/de desarrollo iOS/Android aprobados. No se encontraron marcadores de fixtures ni la entrada de simulación en los artefactos normales. Las exportaciones de desarrollo sí contienen pantallas y datos ficticios. Revisión visual en dispositivo pendiente.

Siguiente tramo: 27 pruebas por repositorio al agregar cambios de rol/acceso a usuarios existentes. Ver `web-ohana/docs/scrum-20-preview.md` para reglas, límites y distinción de CU18. La vista previa móvil crea su propia fuente de usuarios al entrar; cambiar de pestaña conserva las modificaciones, y salir/reingresar las reinicia. El bloqueo de pérdida del propio acceso administrativo es una protección provisional de la simulación, no una nueva regla atribuida al documento. Persistencia, auditoría y alta/aprobación siguen pendientes.
