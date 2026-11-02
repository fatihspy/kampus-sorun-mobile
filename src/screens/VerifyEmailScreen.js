import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api, { getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import LogoLockup from '../components/LogoLockup';

const RESEND_SECONDS = 60;

export default function VerifyEmailScreen({ route, navigation }) {
  const { email, autoResend } = route.params;
  const { verifyEmail } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(autoResend ? 0 : RESEND_SECONDS);

  // Yeniden gönder düğmesi için geri sayım
  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const resendCode = async (silent = false) => {
    setResending(true);
    try {
      await api.post('/auth/resend-verification', { email });
      setSecondsLeft(RESEND_SECONDS);
      if (!silent) Alert.alert('Kod gönderildi', 'E-postana yeni bir kod gönderdik. Spam klasörüne de bak.');
    } catch (err) {
      if (silent && err.response?.status === 429) {
        // Kod az önce gönderilmiş (örn. kayıttan hemen sonra giriş denendi): sessizce geri sayıma geç
        setSecondsLeft(RESEND_SECONDS);
      } else {
        Alert.alert('Kod gönderilemedi', getErrorMessage(err));
      }
    } finally {
      setResending(false);
    }
  };

  // Girişte doğrulanmamış hesap bulunduysa ekran açılır açılmaz yeni kod iste
  useEffect(() => {
    if (autoResend) resendCode(true);
  }, []);

  const handleVerify = async () => {
    if (code.trim().length !== 6) {
      Alert.alert('Eksik bilgi', '6 haneli kodu gir.');
      return;
    }
    setLoading(true);
    try {
      await verifyEmail(email, code.trim());
      // Başarılı olunca kullanıcı oturumu açılır, uygulama kendiliğinden ana ekrana geçer
    } catch (err) {
      Alert.alert('Doğrulanamadı', getErrorMessage(err));
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <LogoLockup size={56} style={{ marginBottom: 16 }} />
        <Text style={styles.title}>E-postanı doğrula</Text>
        <Text style={styles.subtitle}>
          {autoResend
            ? `${email} adresine yeni bir kod gönderiyoruz. Gelen kodu gir.`
            : `${email} adresine 6 haneli bir kod gönderdik. Gelen kutunu ve spam klasörünü kontrol et.`}
        </Text>

        <View style={styles.inputWrapper}>
          <Ionicons name="keypad-outline" size={18} color="#999" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="6 haneli kod"
            keyboardType="number-pad"
            maxLength={6}
            value={code}
            onChangeText={setCode}
            autoFocus
          />
        </View>

        <TouchableOpacity style={styles.button} onPress={handleVerify} disabled={loading} activeOpacity={0.85}>
          <Text style={styles.buttonText}>{loading ? 'Doğrulanıyor...' : 'Doğrula'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => resendCode(false)} disabled={resending || secondsLeft > 0}>
          <Text style={styles.link}>
            Kod gelmedi mi?{' '}
            <Text style={[styles.linkBold, (resending || secondsLeft > 0) && { opacity: 0.45 }]}>
              {secondsLeft > 0 ? `Tekrar gönder (${secondsLeft} sn)` : 'Tekrar gönder'}
            </Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>Girişe dön</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  container: { flexGrow: 1, justifyContent: 'center', padding: 28 },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 32, lineHeight: 19 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 14,
    backgroundColor: '#fafafa'
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 14, fontSize: 18, letterSpacing: 6 },
  button: {
    backgroundColor: '#1e3a8a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#1e3a8a',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 3
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  link: { color: '#888', textAlign: 'center', marginTop: 20, fontSize: 13 },
  linkBold: { color: '#1e3a8a', fontWeight: '700' }
});
