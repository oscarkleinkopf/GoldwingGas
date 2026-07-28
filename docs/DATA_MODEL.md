# Modelo de datos

Clave de persistencia: **`goldwing_gas_state`** (JSON en `localStorage`).

## Objeto `state`

```js
{
  fuelLogs: FuelLog[],
  maintLogs: MaintLog[],
  shelterChecks: {
    airFilter: string,   // '' | ISO date u otra marca de inspección
    fuses: string,
    radiator: string
  },
  settings: {
    modelYear: string,   // '1975' … '1979'
    initialOdo: number,  // km de referencia / baseline
    currency: string     // símbolo, p. ej. '$'
  }
}
```

### `FuelLog`

| Campo | Tipo | Notas |
|-------|------|--------|
| `date` | string | `YYYY-MM-DD` |
| `odometer` | number | km; `0` permitido (no entra en dedupe ni en eficiencia) |
| `liters` | number | litros cargados |
| `cost` | number | entero en moneda local |
| `type` | string | p. ej. `Turismo`, `Ciudad`, `Autopista` |
| `station` | string | opcional |
| `notes` | string | opcional |
| `image` | string | data URL base64 o `''` |
| `efficiency` | number \| null | **calculado** en runtime por `calculateStats`; no hace falta persistirlo, pero puede quedar en el JSON |

### `MaintLog`

| Campo | Tipo | Notas |
|-------|------|--------|
| `date` | string | `YYYY-MM-DD` |
| `type` | string | Debe alinear con claves de `MAINTENANCE_SCHEDULES` cuando sea un servicio del tablero |
| `odometer` | number | km |
| `cost` | number | |
| `notes` | string | |

Tipos de mantenimiento conocidos (luces del tablero):

- `Correas de Distribución`
- `Sincronización Carburadores`
- `Ajuste de Válvulas`
- `Cambio de Aceite y Filtro`
- `Aceite Transmisión Final`
- `Platinos y Bujías`

## Seed

Si no hay `localStorage`, `seedState()` carga `SEED_FUEL_LOGS` y `SEED_MAINT_LOGS` (odómetro ~45 000 km, año 1978). El reset desde Ajustes **vacía** logs y pone `initialOdo` en 0 (no vuelve a seedear).

## Migraciones / compatibilidad

En `loadData()`, si falta `shelterChecks`, se inicializa. Al añadir campos nuevos:

1. Extiende el default en `seedState` / objeto inicial.
2. Añade un fallback en `loadData` (como con `shelterChecks`).
3. Actualiza esta página y el ejemplo de JSON de backup.

**No renombres** claves existentes sin un paso de migración que copie el valor antiguo.

## Backup JSON

Export (`btn-export-data`) descarga el `state` completo:

```json
{
  "fuelLogs": [ /* ... */ ],
  "maintLogs": [ /* ... */ ],
  "shelterChecks": { "airFilter": "", "fuses": "", "radiator": "" },
  "settings": { "modelYear": "1978", "initialOdo": 45000, "currency": "$" }
}
```

Import exige al menos `fuelLogs`, `maintLogs` y `settings`.

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
