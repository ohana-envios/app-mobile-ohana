import { useEffect, useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { createApiCustomersSource, createApiUsersSource, getOperationalSession } from './preview/api-sources';
import { CustomersScreen } from './preview/CustomersScreen';
import { UsersScreen } from './preview/UsersScreen';
import { Button } from './preview/Controls';
import { palette, styles } from './preview/styles';
import { makeAdminSession, type AdminSession } from './session-policy';
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
  async function signIn() {
    if (!request?.codeVerifier || !discovery?.tokenEndpoint || busy) return;
    setBusy(true); setError('');
    try {
      const result = await promptAsync();
      if (result.type === 'cancel' || result.type === 'dismiss') return;
      if (result.type !== 'success' || !result.params.code) throw new Error('No se pudo iniciar sesión');
      const token = await AuthSession.exchangeCodeAsync({ clientId: config.clientId, code: result.params.code, redirectUri, extraParams: { code_verifier: request.codeVerifier } }, discovery);
      if (!token.accessToken || !token.expiresIn) throw new Error('Sesión inválida');
      const transport = async <T,>(path: string, init: { signal: AbortSignal }): Promise<T> => {
        const response = await fetch(`${config.api}${path}`, { signal: init.signal, headers: { Authorization: `Bearer ${token.accessToken}` } });
        if (!response.ok) throw new Error('Acceso no habilitado');
        return response.json() as Promise<T>;
      };
      const user = await getOperationalSession(transport, new AbortController().signal);
      setSession(makeAdminSession(token.accessToken, token.expiresIn, user, token.issuedAt * 1000));
    } catch { setError('No se pudo ingresar. Verificá tu acceso e intentá nuevamente.'); }
    finally { setBusy(false); }
  }
  if (session) return <AdminDirectory config={config} session={session} onExit={() => setSession(null)} />;
  return <SafeAreaView style={styles.safe}><View style={styles.content}>
    <Text style={styles.heading}>Ingresar a Ohana</Text>
    <Text style={styles.text}>Consultá clientes y usuarios con tu cuenta habilitada.</Text>
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    {!discovery && error ? <Button title="Reintentar conexión" onPress={() => setDiscoveryAttempt((value) => value + 1)} /> : null}
    <Button title={busy ? 'Ingresando…' : 'Iniciar sesión'} disabled={!request || !discovery?.tokenEndpoint || busy} onPress={() => void signIn()} />
    <Button title="Volver" disabled={busy} onPress={onExit} />
  </View></SafeAreaView>;
}

function AdminDirectory({ config, session, onExit }: { config: Config; session: AdminSession; onExit: () => void }) {
  const [tab, setTab] = useState<'customers' | 'users'>('customers');
  const sources = useMemo(() => {
    const request = createAuthenticatedTransport(config.api, session);
    return { customers: createApiCustomersSource(request), users: createApiUsersSource(request) };
  }, [config.api, session]);
  return <SafeAreaView style={styles.safe}>
    <ScrollView key={tab} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}><Text style={styles.heading}>Ohana</Text><Text style={styles.muted}>{session.name}</Text></View>
      {tab === 'customers' ? <CustomersScreen source={sources.customers} /> : <UsersScreen source={sources.users} />}
      <Button title="Salir del panel" onPress={onExit} />
    </ScrollView>
    <View accessibilityRole="tablist" style={styles.nav}>
      {(['customers', 'users'] as const).map((item) => <Pressable key={item} accessibilityRole="tab" accessibilityState={{ selected: tab === item }}
        onPress={() => setTab(item)} style={[styles.navTab, tab === item && { backgroundColor: 'white' }]}>
        <Text style={[styles.navText, tab === item && { color: palette.brand }]}>{item === 'customers' ? 'Clientes' : 'Usuarios'}</Text>
      </Pressable>)}
    </View>
  </SafeAreaView>;
}
