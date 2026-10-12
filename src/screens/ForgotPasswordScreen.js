import React, { useState } from 'react';
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
import LogoLockup from '../components/LogoLockup';

export default function ForgotPasswordScreen({ navigation }) {
  const [step, setStep] = useState(1); // 1: e-posta gir, 2: kod + yeni şifre gir
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const requestCode = async () => {
    if (!email.trim()) {
      Alert.alert('Eksik bilgi', 'E-posta adresini gir.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      Alert.alert('Kod gönderildi', 'E-postana 6 haneli bir kod gönderdik. Gelen kutunu (ve spam klasörünü) kontrol et.');
      setStep(2);
    } catch (err) {
      Alert.alert('Hata', getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!code.trim() || !newPassword) {
      Alert.alert('Eksik bilgi', 'Kodu ve yeni şifreni gir.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email: email.trim(),
        code: code.trim(),
        newPassword
      });
      Alert.alert('Başarılı', 'Şifren güncellendi, şimdi giriş yapabilirsin.', [
        { text: 'Tamam', onPress: () => navigation.navigate('Login') }
      ]);
    } catch (err) {
      Alert.alert('Hata', getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <LogoLockup size={56} style={{ marginBottom: 16 }} />
        <Text style={styles.title}>Şifremi Unuttum</Text>
        <Text style={styles.subtitle}>
          {step === 1
            ? 'Kayıtlı e-postanı gir, sana bir sıfırlama kodu gönderelim.'
            : `${email} adresine gönderdiğimiz kodu ve yeni şifreni gir.`}
        </Text>

        {step === 1 ? (
          <>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={18} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="ornek@ogrenci.ege.edu.tr"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <TouchableOpacity style={styles.button} onPress={requestCode} disabled={loading} activeOpacity={0.85}>
              <Text style={styles.buttonText}>{loading ? 'Gönderiliyor...' : 'Kod Gönder'}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.inputWrapper}>
              <Ionicons name="keypad-outline" size={18} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="6 haneli kod"
                keyboardType="number-pad"
                maxLength={6}
                value={code}
                onChangeText={setCode}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Yeni şifre (en az 6 karakter)"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />
            </View>

            <TouchableOpacity style={styles.button} onPress={resetPassword} disabled={loading} activeOpacity={0.85}>
              <Text style={styles.buttonText}>{loading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={requestCode} disabled={loading}>
              <Text style={styles.link}>Kod gelmedi mi? <Text style={styles.linkBold}>Tekrar gönder</Text></Text>
            </TouchableOpacity>
          </>
        )}

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
  logoCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1e3a8a',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20
  },
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
  input: { flex: 1, paddingVertical: 14, fontSize: 15 },
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
