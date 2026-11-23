import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Field, Filters, Pagination } from './Controls';
import { styles as s } from './styles';
import type { PendingPage, RegistrationDraft, RegistrationsSource } from './registrations';

export function RegistrationScreen({ source, onExit }: { source: RegistrationsSource; onExit: () => void }) {
  const [draft, setDraft] = useState<RegistrationDraft>({ displayName: '', type: 'PERSON', phone: '' });
  const [review, setReview] = useState(false); const [busy, setBusy] = useState(false); const [done, setDone] = useState(false); const [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null); useEffect(() => () => controller.current?.abort(), []);
  async function submit() { if (busy) return; setBusy(true); setError(''); const pending = new AbortController(); controller.current = pending;
    try { await source.register(draft, pending.signal); if (!pending.signal.aborted) setDone(true); }
    catch { if (!pending.signal.aborted) setError('No se pudo completar la solicitud. Revisá los datos o contactá a Ohana.'); }
    finally { if (!pending.signal.aborted) setBusy(false); }
  }
  return <View style={s.card}><Text accessibilityRole="header" style={s.heading}>{done ? 'Solicitud enviada' : 'Solicitar alta de cliente'}</Text>
    {done ? <Text style={s.text}>Tu registro está pendiente de revisión. Podrás operar cuando se habilite tu cuenta.</Text> : <>
      <Text style={s.muted}>Usaremos el correo verificado de tu cuenta. El acceso queda pendiente hasta que Ohana lo habilite.</Text>
      {review ? <><Text style={s.text}>Nombre: {draft.displayName}</Text><Text style={s.text}>Tipo: {draft.type === 'PERSON' ? 'Persona' : 'Empresa'}</Text><Text style={s.text}>Teléfono: {draft.phone || 'Sin informar'}</Text></> : <>
        <Field label="Nombre o razón comercial" value={draft.displayName} maxLength={120} onChange={displayName => setDraft({ ...draft, displayName })} />
        <Filters label="Tipo de cliente" value={draft.type} options={[{ value: 'PERSON', label: 'Persona' }, { value: 'COMPANY', label: 'Empresa' }]} onChange={type => setDraft({ ...draft, type })} />
        <Field label="Teléfono (opcional)" value={draft.phone} maxLength={40} kind="phone" onChange={phone => setDraft({ ...draft, phone })} />
      </>}
      {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}
      {review && <Button title="Volver a editar" disabled={busy} onPress={() => setReview(false)} />}
      <Button title={busy ? 'Enviando…' : review ? 'Confirmar solicitud' : 'Revisar solicitud'} disabled={busy || !draft.displayName.trim()} onPress={() => review ? void submit() : setReview(true)} />
    </>}
    <Button title="Salir" disabled={busy} onPress={onExit} />
  </View>;
}

export function PendingRegistrations({ source }: { source: RegistrationsSource }) {
  const [page, setPage] = useState(1); const [version, setVersion] = useState(0); const [data, setData] = useState<PendingPage | null>(null);
  const [error, setError] = useState(''); const [selected, setSelected] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  useEffect(() => { const controller = new AbortController(); setData(null); setError('');
    source.list(page, controller.signal).then(value => { if (!controller.signal.aborted) { if (page > Math.max(1, value.totalPages)) setPage(Math.max(1, value.totalPages)); else setData(value); } }).catch(() => { if (!controller.signal.aborted) setError('No se pudieron cargar las solicitudes.'); });
    return () => controller.abort();
  }, [source, page, version]);
  async function approve(id: string) { if (busy) return; setBusy(true); setError(''); try { await source.approve(id, new AbortController().signal); setSelected(null); setVersion(n => n + 1); } catch { setError('No se pudo habilitar. La solicitud puede haber cambiado; recargá la lista.'); } finally { setBusy(false); } }
  return <View style={s.card}><Text accessibilityRole="header" style={s.heading}>Clientes pendientes</Text>
    {error ? <><Text accessibilityRole="alert" style={s.error}>{error}</Text><Button title="Recargar" onPress={() => setVersion(n => n + 1)} /></> : null}
    {!data && !error && <Text style={s.muted}>Cargando solicitudes…</Text>}{data && data.items.length === 0 && <Text style={s.text}>No hay solicitudes pendientes.</Text>}
    {data?.items.map(item => <View key={item.id}><Text style={s.heading}>{item.customer.displayName}</Text><Text style={s.text}>{item.customer.type === 'PERSON' ? 'Persona' : 'Empresa'} · {item.customer.email} · {item.customer.phone || 'Sin teléfono'}</Text>
      {selected === item.id ? <><Text style={s.text}>¿Confirmás la habilitación de este cliente y su acceso?</Text><Button title="Confirmar habilitación" disabled={busy} onPress={() => void approve(item.id)} /><Button title="Cancelar" disabled={busy} onPress={() => setSelected(null)} /></> : <Button title="Revisar habilitación" onPress={() => setSelected(item.id)} />}</View>)}
    {data && data.totalPages > 1 && <Pagination page={page} pages={data.totalPages} onChange={setPage} />}
  </View>;
}
