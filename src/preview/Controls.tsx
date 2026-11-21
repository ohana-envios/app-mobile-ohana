import { Pressable, Text, TextInput, View } from 'react-native';
import { palette, styles as s } from './styles';

export function Button({ title, onPress, disabled = false, selected = false, primary = false }: {
  title: string; onPress: () => void; disabled?: boolean; selected?: boolean; primary?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled, selected }} disabled={disabled}
    onPress={onPress} style={[s.button, primary && s.primaryButton, selected && s.selected, disabled && s.disabled]}>
    <Text style={[s.buttonText, primary && s.primaryText]}>{title}</Text>
  </Pressable>;
}

export function Field({ label, value, onChange, error, kind = 'text', maxLength }: {
  label: string; value: string; onChange: (value: string) => void; error?: string;
  kind?: 'text' | 'email' | 'phone' | 'code'; maxLength?: number;
}) {
  return <View style={s.field}>
    <Text style={s.label}>{label}</Text>
    <TextInput accessibilityLabel={label} accessibilityHint={error} value={value} onChangeText={onChange}
      style={[s.input, error ? { borderColor: palette.danger } : undefined]} maxLength={maxLength}
      keyboardType={kind === 'email' ? 'email-address' : kind === 'phone' ? 'phone-pad' : 'default'}
      autoCapitalize={kind === 'email' || kind === 'code' ? 'none' : 'sentences'} autoCorrect={kind === 'text'} />
    {error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
  </View>;
}

export function Filters<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: readonly { value: T; label: string }[]; onChange: (value: T) => void;
}) {
  return <View style={s.field}><Text style={s.label}>{label}</Text><View style={s.row}>
    {options.map((option) => <Button key={option.value} title={option.label} selected={value === option.value} onPress={() => onChange(option.value)} />)}
  </View></View>;
}

export function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (page: number) => void }) {
  return <View style={s.row}><Button title="Anterior" disabled={page <= 1} onPress={() => onChange(page - 1)} />
    <Text style={s.muted}>Página {page} de {Math.max(1, pages)}</Text>
    <Button title="Siguiente" disabled={page >= pages} onPress={() => onChange(page + 1)} />
  </View>;
}
