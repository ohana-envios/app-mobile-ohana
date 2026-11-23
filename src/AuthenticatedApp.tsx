import { ProposalAlerts } from './preview/ProposalAlerts';
import { PushSetup } from './preview/PushSetup';
import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { SelfCustomerScreen } from './preview/SelfCustomerScreen';
import { InvitationClaim } from './preview/InvitationViews';
import { EmailInvitations } from './preview/EmailInvitations';
import { createEmailInvitationsSource } from './preview/email-invitations';
import { AdminCustomerRegistration } from './preview/AdminCustomerRegistration';
import { createRegistrationsSource } from './preview/registrations';
import { RegistrationScreen, PendingRegistrations } from './preview/RegistrationScreens';
import { createApiCustomersSource, createApiUsersSource, getOperationalSession } from './preview/api-sources';
import { CustomersScreen } from './preview/CustomersScreen';
import { CouriersScreen } from './preview/CouriersScreen';
import { ShipmentScreen } from './preview/ShipmentScreen';
import { ShipmentList } from './preview/ShipmentList';
import { MyCustody } from './preview/MyCustody';
import { MyTasks } from './preview/MyTasks';
import { DayPlanning } from './preview/DayPlanning';
import { shareReceipt } from './receipt-download';
import { UsersScreen } from './preview/UsersScreen';
import { Button } from './preview/Controls';
import { palette, styles } from './preview/styles';
import { makeAdminSession, makeCustomerSession, makeStaffSession, type AdminSession, type CustomerSession, type StaffSession } from './session-policy';
import { createAuthenticatedTransport } from './authenticated-transport';

WebBrowser.maybeCompleteAuthSession();

type Config = { issuer: string; clientId: string; projectId: string; api: string };

function configFromEnvironment(): Config | null {
  const issuer = process.env.EXPO_PUBLIC_ZITADEL_ISSUER_URL?.trim();
  const clientId = process.env.EXPO_PUBLIC_ZITADEL_MOBILE_CLIENT_ID?.trim();
  const projectId = process.env.EXPO_PUBLIC_ZITADEL_PROJECT_ID?.trim();
  const api = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (!issuer || !clientId || !projectId || !/^\d+$/.test(projectId) || !api) return null;
  try {
    const issuerUrl = new URL(issuer);
    const apiUrl = new URL(api);
    if (issuerUrl.protocol !== 'https:' || issuerUrl.pathname !== '/' || issuerUrl.search || issuerUrl.hash || issuerUrl.username || issuerUrl.password) return null;
    if (apiUrl.protocol !== 'https:' || apiUrl.pathname !== '/' || apiUrl.search || apiUrl.hash || apiUrl.username || apiUrl.password) return null;
    return { issuer: issuerUrl.origin, clientId, projectId, api: apiUrl.origin };
  } catch { return null; }
}

export function AuthenticatedApp({ onExit }: { onExit: () => void }) {
  const config = configFromEnvironment();
  if (!config) return <SafeAreaView style={styles.safe}><View style={styles.content}>
    <Text style={styles.heading}>Acceso todavía no configurado</Text>
    <Text style={styles.text}>La conexión móvil con Ohana requiere configuración del ambiente.</Text>
    <Button title="Volver" onPress={onExit} />
  </View></SafeAreaView>;
  return <SignIn config={config} onExit={onExit} />;
}

function SignIn({ config, onExit }: { config: Config; onExit: () => void }) {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [staffSession, setStaffSession] = useState<StaffSession | null>(null);
  const [customerSession, setCustomerSession] = useState<CustomerSession | null>(null);
  const [registrationSession, setRegistrationSession] = useState<{ accessToken: string; expiresAt: number } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [discovery, setDiscovery] = useState<AuthSession.DiscoveryDocument | null>(null);
  const [discoveryAttempt, setDiscoveryAttempt] = useState(0);
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'ohanaenvios', path: 'auth/callback' });
  useEffect(() => {
    let active = true;
    setDiscovery(null);
    setError('');
    AuthSession.fetchDiscoveryAsync(config.issuer).then((document) => {
      const authorization = new URL(document.authorizationEndpoint ?? '');
      const token = new URL(document.tokenEndpoint ?? '');
      if (document.discoveryDocument?.issuer !== config.issuer || authorization.protocol !== 'https:' || token.protocol !== 'https:') throw new Error('Configuración de identidad inválida');
      if (active) setDiscovery(document);
    }).catch(() => { if (active) setError('No se pudo conectar con el servicio de acceso.'); });
    return () => { active = false; };
  }, [config.issuer, discoveryAttempt]);
  const [request, , promptAsync] = AuthSession.useAuthRequest({
    clientId: config.clientId, redirectUri, responseType: AuthSession.ResponseType.Code,
    usePKCE: true, codeChallengeMethod: AuthSession.CodeChallengeMethod.S256,
    scopes: ['openid', 'profile', 'email', `urn:zitadel:iam:org:project:id:${config.projectId}:aud`],
  }, discovery);
  useEffect(() => {
    if (!session) return;
    const timeout = setTimeout(() => { setSession(null); setError('Tu sesión venció. Ingresá nuevamente.'); }, Math.max(0, session.expiresAt - Date.now()));
    return () => clearTimeout(timeout);
  }, [session]);
  useEffect(() => { if (!staffSession) return; const timeout = setTimeout(() => { setStaffSession(null); setError('Tu sesión venció. Ingresá nuevamente.'); }, Math.max(0, staffSession.expiresAt - Date.now())); return () => clearTimeout(timeout); }, [staffSession]);
  useEffect(() => { if (!customerSession) return; const timeout = setTimeout(() => { setCustomerSession(null); setError('Tu sesión venció. Ingresá nuevamente.'); }, Math.max(0, customerSession.expiresAt - Date.now())); return () => clearTimeout(timeout); }, [customerSession]);
  useEffect(() => { if (!registrationSession) return; const timeout = setTimeout(() => { setRegistrationSession(null); setError('Tu sesión venció. Ingresá nuevamente.'); }, Math.max(0, registrationSession.expiresAt - Date.now())); return () => clearTimeout(timeout); }, [registrationSession]);
  async function signOut() {
    if (busy) return;
    const active = session ?? staffSession ?? customerSession ?? registrationSession;
    setBusy(true); setError('');
    setSession(null); setStaffSession(null); setCustomerSession(null); setRegistrationSession(null);
    let revoked = false; let providerClosed = false;
    try {
      const endpoint = discovery?.revocationEndpoint;
      if (active && endpoint && new URL(endpoint).origin === config.issuer) {
        revoked = await AuthSession.revokeAsync({ clientId: config.clientId, token: active.accessToken }, { revocationEndpoint: endpoint });
      }
    } catch { /* The local session stays closed even if the provider is unavailable. */ }
    try {
      const endpoint = discovery?.endSessionEndpoint;
      if (endpoint && new URL(endpoint).origin === config.issuer) {
        const redirect = AuthSession.makeRedirectUri({ scheme: 'ohanaenvios', path: 'auth/logout' });
        const url = new URL(endpoint);
        url.searchParams.set('client_id', config.clientId);
        url.searchParams.set('post_logout_redirect_uri', redirect);
        const result = await WebBrowser.openAuthSessionAsync(url.toString(), redirect);
        providerClosed = result.type === 'success';
      }
    } catch { /* Report an unconfirmed provider logout below. */ }
    if (!revoked || !providerClosed) setError('La sesión local se cerró, pero no pudimos confirmar el cierre completo en el proveedor de identidad.');
    setBusy(false);
  }
  async function signIn(register = false) {
    if (!request?.codeVerifier || !discovery?.tokenEndpoint || busy) return;
    setBusy(true); setError('');
    try {
      const result = await promptAsync();
      if (result.type === 'cancel' || result.type === 'dismiss') return;
      if (result.type !== 'success' || !result.params.code) throw new Error('No se pudo iniciar sesión');
      const token = await AuthSession.exchangeCodeAsync({ clientId: config.clientId, code: result.params.code, redirectUri, extraParams: { code_verifier: request.codeVerifier } }, discovery);
      if (!token.accessToken || !token.expiresIn) throw new Error('Sesión inválida');
      if (register) { setRegistrationSession({ accessToken: token.accessToken, expiresAt: (token.issuedAt + token.expiresIn) * 1000 }); return; }
      const transport = async <T,>(path: string, init: { signal: AbortSignal }): Promise<T> => {
        const response = await fetch(`${config.api}${path}`, { signal: init.signal, headers: { Authorization: `Bearer ${token.accessToken}` } });
        if (!response.ok) throw new Error('Acceso no habilitado');
        return response.json() as Promise<T>;
      };
      const user = await getOperationalSession(transport, new AbortController().signal);
      if (user.role === 'CUSTOMER') setCustomerSession(makeCustomerSession(token.accessToken, token.expiresIn, user, token.issuedAt * 1000));
      else if (user.role === 'OPERATOR' || user.role === 'COURIER') setStaffSession(makeStaffSession(token.accessToken, token.expiresIn, user, token.issuedAt * 1000));
      else setSession(makeAdminSession(token.accessToken, token.expiresIn, user, token.issuedAt * 1000));
    } catch { setError('No se pudo ingresar. Verificá tu acceso e intentá nuevamente.'); }
    finally { setBusy(false); }
  }
  if (staffSession) return <StaffShipments config={config} session={staffSession} onExit={() => void signOut()} />;
  if (customerSession) return <SelfCustomerScreen api={config.api} session={customerSession} onExit={() => void signOut()} />;
  if (registrationSession) return <RegistrationContainer config={config} session={registrationSession} onExit={() => void signOut()} />;
  if (session) return <AdminDirectory config={config} session={session} onExit={() => void signOut()} />;
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.heading}>Ingresar a Ohana</Text>
    <Text style={styles.text}>Si se te pide configurar el segundo factor, seguí los pasos de ZITADEL y confirmá el método antes de volver a Ohana.</Text>
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    {!discovery && error ? <Button title="Reintentar conexión" onPress={() => setDiscoveryAttempt((value) => value + 1)} /> : null}
    <Button primary title={busy ? 'Ingresando…' : 'Iniciar sesión'} disabled={!request || !discovery?.tokenEndpoint || busy} onPress={() => void signIn()} />
    <Text style={styles.muted}>Si olvidaste tu contraseña, ingresá tu correo en la pantalla de acceso y elegí la opción para recuperarla.</Text>
    <Button title="Recuperar contraseña" disabled={!request || !discovery?.tokenEndpoint || busy} onPress={() => void signIn()} />
    <Button title="Registro o invitación" disabled={!request || !discovery?.tokenEndpoint || busy} onPress={() => void signIn(true)} />
    <Button title="Volver" disabled={busy} onPress={onExit} />
  </ScrollView></SafeAreaView>;
}

function RegistrationContainer({ config, session, onExit }: { config: Config; session: { accessToken: string; expiresAt: number }; onExit: () => void }) {
  const [hasInvite, setHasInvite] = useState(false);
  const source = useMemo(() => createRegistrationsSource(createAuthenticatedTransport(config.api, session)), [config.api, session]);
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><View style={styles.row}>
      <Button title="Solicitar alta" selected={!hasInvite} onPress={() => setHasInvite(false)} />
      <Button title="Tengo una invitación" selected={hasInvite} onPress={() => setHasInvite(true)} />
    </View>
    {hasInvite ? <><InvitationClaim source={source} /><Button title="Salir" onPress={onExit} /></> : <RegistrationScreen source={source} onExit={onExit} />}</ScrollView></SafeAreaView>;
}

function StaffShipments({ config, session, onExit }: { config: Config; session: StaffSession; onExit: () => void }) {
  const request = useMemo(() => createAuthenticatedTransport(config.api, session), [config.api, session]);
  const [custodyRevision, setCustodyRevision] = useState(0);
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><Text accessibilityRole="header" style={styles.heading}>Hola, {session.name}</Text>{session.role === 'COURIER' && <><MyTasks request={request} externalRevision={custodyRevision} onCustodyUpdated={() => setCustodyRevision((v) => v + 1)} /><MyCustody key={custodyRevision} request={request} /></>}<ShipmentList request={request} downloadReceipt={(id) => shareReceipt(config.api, session, id)} own={session.role === 'COURIER'} canChangeStatus={session.role === 'COURIER'} onCustodyUpdated={() => setCustodyRevision((v) => v + 1)} readOnly /><Button title="Salir" onPress={onExit} /></ScrollView></SafeAreaView>;
}

const adminTabs = [
  { key: 'customers', label: 'Clientes', icon: '◉' },
  { key: 'shipments', label: 'Envíos', icon: '▤' },
  { key: 'couriers', label: 'Repartidores', icon: '◎' },
  { key: 'users', label: 'Usuarios', icon: '☰' },
] as const;

function AdminDirectory({ config, session, onExit }: { config: Config; session: AdminSession; onExit: () => void }) {
  const [tab, setTab] = useState<'customers' | 'users' | 'couriers' | 'shipments'>('customers');
  const [accessView, setAccessView] = useState<'directory' | 'pending' | 'email'>('directory');
  const [customersRevision, setCustomersRevision] = useState(0);
  const [shipmentsRevision, setShipmentsRevision] = useState(0); const [selectedShipmentId, setSelectedShipmentId] = useState<string | undefined>();
  const sources = useMemo(() => {
    const request = createAuthenticatedTransport(config.api, session);
    return { customers: createApiCustomersSource(request), users: createApiUsersSource(request), registrations: createRegistrationsSource(request), emailInvitations: createEmailInvitationsSource(request), request };
  }, [config.api, session]);
  const pushToken = useRef(''); const contentScroll = useRef<ComponentRef<typeof ScrollView>>(null);
  async function leaveAdmin() {
    if (pushToken.current) { try { await sources.request('/api/shipments/push-devices/deactivate', { signal: AbortSignal.timeout(3000), method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: pushToken.current }) }); } catch { /* El dispositivo deja de recibir avisos al vencer la sesi?n. */ } }
    onExit();
  }
  const openShipment = (id: string) => { setSelectedShipmentId(id); setShipmentsRevision((v) => v + 1); setTab('shipments'); contentScroll.current?.scrollTo({ y: 0, animated: true }); };
  return <SafeAreaView style={styles.safe}>
    <PushSetup request={sources.request} expiresAt={session.expiresAt} onToken={(token) => { pushToken.current = token; }} onOpen={openShipment} />
    <ScrollView ref={contentScroll} key={tab} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}><Text style={styles.heading}>Ohana</Text><Text style={styles.muted}>{session.name}</Text></View>
      <ProposalAlerts request={sources.request} onOpen={openShipment} />
      {tab === 'customers' ? <><Button title="Revisar solicitudes de clientes" onPress={() => { setAccessView('pending'); setTab('users'); }} /><AdminCustomerRegistration source={sources.registrations} onCreated={() => setCustomersRevision(value => value + 1)} /><CustomersScreen key={customersRevision} source={sources.customers} /></> : tab === 'couriers' ? <CouriersScreen request={sources.request} /> : tab === 'shipments' ? <><ShipmentList key={shipmentsRevision} request={sources.request} downloadReceipt={(id) => shareReceipt(config.api, session, id)} canChangeStatus initialShipmentId={selectedShipmentId} /><DayPlanning key={shipmentsRevision} request={sources.request} /><ShipmentScreen source={sources.customers} request={sources.request} registrations={sources.registrations} onCreated={() => setShipmentsRevision((v) => v + 1)} /></> : <>
        <View style={styles.row}>
          <Button title="Usuarios y roles" selected={accessView === 'directory'} onPress={() => setAccessView('directory')} />
          <Button title="Clientes pendientes" selected={accessView === 'pending'} onPress={() => setAccessView('pending')} />
          <Button title="Invitar por correo" selected={accessView === 'email'} onPress={() => setAccessView('email')} />
        </View>
        {accessView === 'pending' ? <PendingRegistrations source={sources.registrations} /> :
          accessView === 'email' ? <EmailInvitations source={sources.emailInvitations} /> : <UsersScreen source={sources.users} />}
      </>}
      <Button title="Salir del panel" onPress={() => void leaveAdmin()} />
    </ScrollView>
    <View accessibilityRole="tablist" style={styles.nav}>
      {adminTabs.map(item => <Pressable key={item.key} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{ selected: tab === item.key }}
        onPress={() => setTab(item.key)} style={[styles.navTab, tab === item.key && { flexGrow: 2, backgroundColor: palette.card }]}>
        <Text style={[styles.navText, tab === item.key && { color: palette.brand }]}>{item.icon}{tab === item.key ? ' ' + item.label : ''}</Text>
      </Pressable>)}
    </View>
  </SafeAreaView>;
}
