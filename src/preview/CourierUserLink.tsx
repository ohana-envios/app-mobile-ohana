import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Button, Field, Pagination } from './Controls';
import { styles } from './styles';

type User = { id: string; displayName: string; email: string; enabled: boolean; role: string };
type Request = <T>(path: string, init: { signal: AbortSignal; method?: string; headers?: Record<string, string>; body?: string }) => Promise<T>;
export function CourierUserLink({ courier, request, onChanged }: { courier: { id: string; userId: string | null; user: User | null }; request: Request; onChanged: () => void }) {
  const [search, setSearch] = useState(''); const [items, setItems] = useState<User[]>([]);
  const [page, setPage] = useState(1); const [pages, setPages] = useState(0);
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  async function find(nextPage: number) {
    setBusy(true); setMessage('');
    try {
      const params = new URLSearchParams({ role: 'COURIER', status: 'all', search, page: String(nextPage), pageSize: '20' });
      const result = await request<{ items: User[]; totalPages: number }>(`/api/users?${params}`, { signal: new AbortController().signal });
      setItems(result.items); setPage(nextPage); setPages(result.totalPages);
      if (!result.items.length) setMessage('No se encontraron cuentas de repartidor.');
    } catch { setMessage('No se pudieron cargar las cuentas.'); } finally { setBusy(false); }
  }
  async function link(userId: string | null) {
    setBusy(true); setMessage('');
    try { await request(`/api/couriers/${encodeURIComponent(courier.id)}/user`, { signal: new AbortController().signal, method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, expectedUserId: courier.userId }) }); onChanged(); }
    catch { setMessage('No se pudo vincular la cuenta. Verificá que no esté asociada a otra ficha y recargá.'); } finally { setBusy(false); }
  }
  function confirm(userId: string | null) { Alert.alert('Cuenta del repartidor', userId ? '¿Vincular esta cuenta a la ficha? Podrá consultar los envíos asignados.' : '¿Desvincular la cuenta de esta ficha?', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Confirmar', onPress: () => void link(userId) }]); }
  return <View><Text accessibilityRole="header" style={styles.heading}>Cuenta del repartidor</Text><Text style={styles.text}>{courier.user ? `${courier.user.displayName} · ${courier.user.email}${courier.user.role !== 'COURIER' ? ' · rol distinto de repartidor' : ''}${courier.user.enabled ? '' : ' · acceso deshabilitado'}` : 'Esta ficha no tiene una cuenta vinculada.'}</Text>
    {courier.userId && <Button title="Desvincular cuenta" disabled={busy} onPress={() => confirm(null)} />}
    <Field label="Buscar cuenta por nombre o correo" value={search} maxLength={120} onChange={setSearch} /><Button title="Buscar cuenta" disabled={busy} onPress={() => void find(1)} />
    {message ? <Text accessibilityRole="alert" style={styles.error}>{message}</Text> : null}
    {items.map((user) => <View key={user.id}><Text style={styles.text}>{user.displayName} · {user.email} · {user.enabled ? 'Habilitada' : 'Deshabilitada'}</Text><Button title="Vincular cuenta" disabled={busy || user.id === courier.userId} onPress={() => confirm(user.id)} /></View>)}
    {pages > 1 && <Pagination page={page} pages={pages} onChange={(value) => void find(value)} />}
  </View>;
}
