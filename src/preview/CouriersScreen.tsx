import { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Button, Field, Pagination } from './Controls';
import { styles } from './styles';
import { CourierUserLink } from './CourierUserLink';

type Courier = { id: string; displayName: string; active: boolean; available: boolean; vehicle: string | null; capacity: string | null; workingHours: string | null; notes: string | null; version: number; activeAssignmentCount: number; userId: string | null; user: { id: string; displayName: string; email: string; enabled: boolean; role: string } | null };
type Draft = { displayName: string; active: boolean; available: boolean; vehicle: string; capacity: string; workingHours: string; notes: string };
type Request = <T>(path: string, init: { signal: AbortSignal; method?: string; headers?: Record<string, string>; body?: string }) => Promise<T>;
const blank: Draft = { displayName: '', active: true, available: true, vehicle: '', capacity: '', workingHours: '', notes: '' };

export function CouriersScreen({ request }: { request: Request }) {
  const [items, setItems] = useState<Courier[]>([]); const [page, setPage] = useState(1); const [pages, setPages] = useState(0);
  const [search, setSearch] = useState(''); const [revision, setRevision] = useState(0); const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Courier | null>(null); const [editing, setEditing] = useState(false);
  const [duplicates, setDuplicates] = useState<Courier[]>([]); const [duplicateName, setDuplicateName] = useState('');
  const [draft, setDraft] = useState<Draft>(blank); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController(); setLoading(true);
    request<{ items: Courier[]; totalPages: number }>(`/api/couriers?${new URLSearchParams({ search, page: String(page) })}`, { signal: controller.signal })
      .then((result) => { setItems(result.items); setPages(result.totalPages); setError(''); })
      .catch(() => { if (!controller.signal.aborted) setError('No se pudo cargar la lista.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [request, search, page, revision]);
  function edit(item: Courier) {
    setSelected(item); setDraft({ displayName: item.displayName, active: item.active, available: item.available, vehicle: item.vehicle ?? '', capacity: item.capacity ?? '', workingHours: item.workingHours ?? '', notes: item.notes ?? '' }); setEditing(true); setError('');
  }
  async function save(reviewed = false) {
    if (!draft.displayName.trim()) { setError('Ingresá el nombre del repartidor.'); return; }
    setBusy(true); setError('');
    try {
      if (!selected || selected.displayName.trim().toLowerCase() !== draft.displayName.trim().toLowerCase()) {
        const query = new URLSearchParams({ name: draft.displayName.trim(), ...(selected ? { exclude: selected.id } : {}) });
        const result = await request<{ possibleDuplicate: boolean; matches: Courier[] }>(`/api/couriers/possible-duplicate?${query}`, { signal: new AbortController().signal });
        if (result.possibleDuplicate && (!reviewed || duplicateName !== draft.displayName.trim().toLowerCase())) { setDuplicates(result.matches); setDuplicateName(draft.displayName.trim().toLowerCase()); return; }
      }
      const reducing = selected && ((selected.active && !draft.active) || (selected.available && !draft.available));
      await request<Courier>(selected ? `/api/couriers/${encodeURIComponent(selected.id)}` : '/api/couriers', { signal: new AbortController().signal, method: selected ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...draft, ...(selected ? { version: selected.version, ...(reducing ? { confirmedActiveAssignments: selected.activeAssignmentCount } : {}) } : {}) }) });
      setDuplicates([]); setEditing(false); setSelected(null); setRevision((v) => v + 1);
    } catch { setError('No se pudo guardar. Si la ficha cambió, volvé a cargarla.'); } finally { setBusy(false); }
  }
  function confirmSave() {
    if (selected && ((selected.active && !draft.active) || (selected.available && !draft.available))) Alert.alert('Cambiar disponibilidad', selected.activeAssignmentCount ? `Este repartidor tiene ${selected.activeAssignmentCount} tarea(s) activas. ¿Querés continuar?` : '¿Querés cambiar la disponibilidad o desactivar esta ficha?', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Continuar', onPress: () => void save() }]);
    else void save();
  }
  return <View><Text accessibilityRole="header" style={styles.heading}>Repartidores</Text>
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    {editing && duplicates.length > 0 && duplicateName === draft.displayName.trim().toLowerCase() ? <View><Text accessibilityRole="header" style={styles.text}>Revisá las fichas con el mismo nombre</Text>{duplicates.map((item) => <Text key={item.id} style={styles.text}>{item.displayName} · {item.active ? 'Activo' : 'Inactivo'} · {item.available ? 'Disponible' : 'No disponible'} · Vehículo: {item.vehicle || 'sin indicar'} · Horario: {item.workingHours || 'sin indicar'} · {item.notes || 'sin observaciones'}</Text>)}<Text style={styles.text}>Si corresponde a otra persona, podés guardar igualmente.</Text><Button title="Guardar igualmente" disabled={busy} onPress={() => void save(true)} /></View> : null}
    {editing ? <View>
      {([['displayName', 'Nombre', 120], ['vehicle', 'Vehículo', 120], ['capacity', 'Capacidad', 120], ['workingHours', 'Horario de trabajo', 120], ['notes', 'Observaciones', 1000]] as const).map(([key, label, max]) => <Field key={key} label={label} value={draft[key]} maxLength={max} onChange={(value) => setDraft({ ...draft, [key]: value })} />)}
      <Button title={draft.active ? 'Ficha activa' : 'Ficha inactiva'} onPress={() => setDraft({ ...draft, active: !draft.active })} />
      <Button title={draft.available ? 'Disponible' : 'No disponible'} onPress={() => setDraft({ ...draft, available: !draft.available })} />
      <Button title={busy ? 'Guardando…' : 'Guardar'} disabled={busy} onPress={confirmSave} />
      <Button title="Cancelar" disabled={busy} onPress={() => setEditing(false)} />
      {selected && <CourierUserLink courier={selected} request={request} onChanged={() => { setSelected(null); setEditing(false); setRevision((value) => value + 1); }} />}
    </View> : <View><Button title="Agregar repartidor" onPress={() => { setSelected(null); setDraft(blank); setEditing(true); setError(''); }} />
      <Field label="Buscar por nombre" value={search} maxLength={120} onChange={(value) => { setPage(1); setSearch(value); }} />
      {loading ? <Text style={styles.text}>Cargando…</Text> : items.length === 0 ? <Text style={styles.text}>No hay repartidores para mostrar.</Text> : items.map((item) => <View key={item.id}><Text style={styles.text}>{item.displayName} · {!item.active ? 'Inactivo' : item.available ? 'Disponible' : 'No disponible'}</Text><Button title="Ver o editar" onPress={() => edit(item)} /></View>)}
      <Pagination page={page} pages={pages} onChange={setPage} />
    </View>}
  </View>;
}
