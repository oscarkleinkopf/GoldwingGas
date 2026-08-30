# Modelo de datos

Clave de persistencia del historial: **`goldwing_gas_state`** (JSON en `localStorage`).

Fotos de boletas/notas: IndexedDB **`goldwing_gas_photos`**, store `photos` (clave = `log.id`, valor = data URL).

## Objeto `state`

```js
{
  fuelLogs: FuelLog[],
  maintLogs: MaintLog[],
  rides: Ride[],
  shelterChecks: {
    airFilter: string,   // '' | ISO date u otra marca de inspección
    fuses: string,
    radiator: string
  },
  settings: {
    modelYear: string,   // '1975' … '1979'
    initialOdo: number,  // km de referencia / baseline
    currency: string,    // símbolo, p. ej. '$'
    lastBackupAt: string, // ISO datetime del último JSON descargado/compartido, o ''
    lang: string,         // 'es' | 'en' — idioma de la interfaz
    customMaintTypes: { name: string, interval: number }[]
  }
}
```

### `FuelLog`

| Campo | Tipo | Notas |
|-------|------|--------|
| `id` | string | UUID estable (se genera al crear o al migrar) |
| `date` | string | `YYYY-MM-DD` |
| `odometer` | number | km; `0` permitido (no entra en dedupe ni en eficiencia) |
| `liters` | number | litros cargados |
| `cost` | number | entero en moneda local |
| `type` | string | p. ej. `Turismo`, `Ciudad`, `Autopista` |
| `station` | string | opcional |
| `notes` | string | opcional |
| `photoId` | string | `id` del log si hay foto en IndexedDB; si no, `''` |
| `image` | string | **legado**: data URL. Tras migrar queda `''`; no se persiste en `localStorage` si IndexedDB funciona |
| `efficiency` | number \| null | **calculado** en runtime por `calculateStats`; se omite al guardar |
| `gpsKm` / `gpsEfficiency` | number \| null | **calculados** si hay un `Ride` ligado; no se persisten |

### `Ride` (GPX Beeline)

Solo resumen para complementar bencina. **No** se guarda la traza GPS.

| Campo | Tipo | Notas |
|-------|------|--------|
| `id` | string | UUID |
| `source` | string | `beeline` |
| `name` | string | nombre del track o del archivo |
| `date` | string | `YYYY-MM-DD` del primer punto con hora |
| `distanceKm` | number | haversine de la traza |
| `durationMin` | number \| null | si el GPX trae timestamps |
| `pointCount` | number | |
| `fuelLogId` | string | id de la carga ligada, o `''` |

Al importar: si hay una carga el mismo día o al día siguiente, se asigna `fuelLogId`. Duplicado = misma fecha y distancia &lt; 1 km.

### `MaintLog`

| Campo | Tipo | Notas |
|-------|------|--------|
| `id` | string | UUID |
| `date` | string | `YYYY-MM-DD` |
| `type` | string | Debe alinear con claves de `MAINTENANCE_SCHEDULES` cuando sea un servicio del tablero |
| `odometer` | number | km |
| `cost` | number | |
| `notes` | string | |
| `photoId` | string | igual que en FuelLog |
| `image` | string | legado; ver FuelLog |

Tipos de mantenimiento conocidos (luces del tablero):

- `Correas de Distribución`
- `Sincronización Carburadores`
- `Ajuste de Válvulas`
- `Cambio de Aceite y Filtro`
- `Aceite Transmisión Final`
- `Platinos y Bujías`

## Seed

Si no hay `localStorage`, `seedState()` carga `SEED_FUEL_LOGS` y `SEED_MAINT_LOGS` (odómetro ~45 000 km, año 1978). El reset desde Ajustes **vacía** logs, limpia IndexedDB de fotos y pone `initialOdo` en 0 (no vuelve a seedear).

## Migraciones / compatibilidad

En `loadData()`:

- Si falta `shelterChecks`, se inicializa.
- Si falta `settings.lastBackupAt`, queda `''`.
- Si falta `rides`, se inicializa `[]`.
- Si falta `settings.customMaintTypes`, queda `[]`.
- Cada log sin `id` recibe un UUID.
- Si `log.image` es un data URL, se mueve a IndexedDB (`photoId = id`) y se borra del JSON de `localStorage`.

Al añadir campos nuevos:

1. Extiende el default en `seedState` / objeto inicial.
2. Añade un fallback en `loadData` / `ensureSettingsDefaults`.
3. Actualiza esta página y el ejemplo de JSON de backup.

**No renombres** claves existentes sin un paso de migración que copie el valor antiguo.

## Backup JSON

Export descarga el `state` **más** las fotos:

```json
{
  "exportedAt": "2026-08-15T16:00:00.000Z",
  "fuelLogs": [ /* sin data URLs; con id y photoId */ ],
  "maintLogs": [ /* ... */ ],
  "rides": [ /* resumen GPX: date, distanceKm, fuelLogId */ ],
  "shelterChecks": { "airFilter": "", "fuses": "", "radiator": "" },
  "settings": { "modelYear": "1978", "initialOdo": 45000, "currency": "$", "lastBackupAt": "..." },
  "photos": {
    "<log.id>": "data:image/jpeg;base64,..."
  }
}
```

Import exige al menos `fuelLogs`, `maintLogs` y `settings`. Restaura `photos` a IndexedDB. Los JSON antiguos con `image` embebido en cada log también se migran.

Aviso de respaldo: si nunca se exportó o pasaron **14 días**, el tablero muestra un banner (se puede posponer en la sesión).

## CSV / TSV de bencina

Plantilla generada por la app:

```csv
Fecha;Kilometraje;Litros;Costo;Tipo;Notas
2026-05-15;45150;15.2;16500;Turismo;Carga inicial
```

### Separadores

Detección automática: tab → `;` → `,` (si hay ambos `,` y `;`, gana `;`).

### Cabeceras (match flexible, minúsculas)

| Campo | Palabras clave en header |
|-------|---------------------------|
| Fecha | `fech`, `date` |
| Odómetro | `kilomet`, `odo`, `read`, `km` |
| Litros | `litr`, `cant`, `vol`, `add` |
| Costo | `cost`, `tot`, `prec`, `val` |
| Tipo | `tipo`, `modo`, `style` (opcional) |
| Notas | `not`, `coment`, `detall` (opcional) |

Requeridos: fecha, kilometraje, litros, costo.

### Fechas aceptadas (`parseExcelDate`)

- `YYYY-MM-DD` / `YYYY/MM/DD`
- `DD/MM/YYYY` o `DD-MM-YYYY` (año 2 dígitos → `20xx`)
- Verbales: `14-Nov-2023`, `3-Ene-2024`, etc. (EN/ES)
- Fallback `Date` del motor JS

### Dedupe

Si `odometer > 0` y ya existe ese odómetro en `fuelLogs`, la fila se omite. Varios registros con odómetro `0` están permitidos.

## Reglas de cálculo relevantes

- Odómetro mostrado: máximo entre fuel, maint e `initialOdo`.
- Eficiencia de una carga: `(odoActual − odoAnteriorNoCero) / litros` en km/L.
- Consumo medio L/100km: `100 / avgKmPerLiter`.
- Luces de servicio: km desde el último `MaintLog` de ese `type` vs `MAINTENANCE_SCHEDULES[type].interval`.
