import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import api, { getErrorMessage } from '../api/client';

const CATEGORIES = [
  { value: 'temizlik', label: 'Temizlik', icon: 'trash-outline' },
  { value: 'teknik', label: 'Teknik/Bakım', icon: 'construct-outline' },
  { value: 'guvenlik', label: 'Güvenlik', icon: 'shield-checkmark-outline' },
  { value: 'diger', label: 'Diğer', icon: 'ellipsis-horizontal-circle-outline' }
];

export default function CreateReportScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

  const [photo, setPhoto] = useState(null); // { uri }
  const [category, setCategory] = useState('teknik');
  const [description, setDescription] = useState('');
  const [building, setBuilding] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [capturing, setCapturing] = useState(false);

  const takePhoto = async () => {
    if (!cameraRef.current || !isCameraReady || capturing) return;
    setCapturing(true);
    try {
      const result = await cameraRef.current.takePictureAsync({ quality: 0.6 });
      setPhoto(result);
      await getLocation();
    } catch (err) {
      Alert.alert('Fotoğraf çekilemedi', 'Kamera hazır değildi, lütfen tekrar deneyin.');
    } finally {
      setCapturing(false);
    }
  };

  const getLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Konum izni gerekli', 'Konum olmadan rapor gönderilemez.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch (err) {
      Alert.alert('Konum alınamadı', err.message);
    } finally {
      setLocationLoading(false);
    }
  };

  const retake = () => {
    setPhoto(null);
    setLocation(null);
    setIsCameraReady(false);
  };

  const handleSubmit = async () => {
    if (!photo) {
      Alert.alert('Fotoğraf eksik', 'Önce bir fotoğraf çekmelisiniz.');
      return;
    }
    if (!location) {
      Alert.alert('Konum eksik', 'Konum alınamadı, tekrar deneyin.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('photo', {
        uri: photo.uri,
        name: 'report.jpg',
        type: 'image/jpeg'
      });
      formData.append('category', category);
      formData.append('description', description);
      formData.append('building', building);
      formData.append('lat', String(location.lat));
      formData.append('lng', String(location.lng));
      formData.append('isAnonymous', String(isAnonymous));

      await api.post('/reports', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      Alert.alert('Gönderildi', 'Raporunuz başarıyla iletildi.', [
        { text: 'Tamam', onPress: () => navigation.navigate('Home') }
      ]);
    } catch (err) {
      Alert.alert('Gönderilemedi', getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Kamera izni henüz sorulmadıysa
  if (!permission) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1e3a8a" /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Ionicons name="camera-outline" size={40} color="#ccc" style={{ marginBottom: 12 }} />
        <Text style={styles.permText}>Fotoğraf çekebilmek için kamera izni gerekiyor.</Text>
        <TouchableOpacity style={styles.permButton} onPress={requestPermission} activeOpacity={0.85}>
          <Text style={styles.permButtonText}>İzin Ver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Henüz fotoğraf çekilmediyse kamerayı göster
  if (!photo) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
          onCameraReady={() => setIsCameraReady(true)}
        />
        <View style={styles.cameraHint}>
          <Text style={styles.cameraHintText}>
            {isCameraReady ? 'Sorunu net şekilde çerçeveye al' : 'Kamera hazırlanıyor...'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.shutterButton, (!isCameraReady || capturing) && { opacity: 0.5 }]}
          onPress={takePhoto}
          activeOpacity={0.8}
          disabled={!isCameraReady || capturing}
        >
          {capturing ? (
            <ActivityIndicator size="small" color="#1e3a8a" />
          ) : (
            <View style={styles.shutterInner} />
          )}
        </TouchableOpacity>
      </View>
    );
  }

  // Fotoğraf çekildikten sonra: form ekranı
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.formContainer}
        keyboardShouldPersistTaps="handled"
      >
      <View style={styles.previewWrapper}>
        <Image source={{ uri: photo.uri }} style={styles.preview} />
        <TouchableOpacity onPress={retake} style={styles.retakeBtn} activeOpacity={0.85}>
          <Ionicons name="camera-reverse-outline" size={16} color="#1e3a8a" />
          <Text style={styles.retakeText}>Yeniden çek</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionLabelRow}>
        <Ionicons name="location-outline" size={16} color="#1e3a8a" />
        <Text style={styles.label}>Konum</Text>
      </View>
      {locationLoading ? (
        <View style={styles.locationRow}>
          <ActivityIndicator size="small" color="#1e3a8a" />
          <Text style={styles.locationText}>Konum alınıyor...</Text>
        </View>
      ) : location ? (
        <View style={styles.locationRow}>
          <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
          <Text style={[styles.locationText, { color: '#16a34a' }]}>
            Konum alındı ({location.lat.toFixed(5)}, {location.lng.toFixed(5)})
          </Text>
        </View>
      ) : (
        <TouchableOpacity onPress={getLocation} style={styles.locationRow}>
          <Ionicons name="refresh-outline" size={16} color="#1e3a8a" />
          <Text style={styles.locationText}>Konumu tekrar dene</Text>
        </TouchableOpacity>
      )}

      <View style={styles.sectionLabelRow}>
        <Ionicons name="pricetag-outline" size={16} color="#1e3a8a" />
        <Text style={styles.label}>Kategori</Text>
      </View>
      <View style={styles.categoryRow}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c.value}
            style={[styles.categoryChip, category === c.value && styles.categoryChipActive]}
            onPress={() => setCategory(c.value)}
            activeOpacity={0.85}
          >
            <Ionicons
              name={c.icon}
              size={15}
              color={category === c.value ? '#fff' : '#555'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.categoryChipText, category === c.value && styles.categoryChipTextActive]}>
              {c.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.sectionLabelRow}>
        <Ionicons name="business-outline" size={16} color="#1e3a8a" />
        <Text style={styles.label}>Bina / Konum adı (opsiyonel)</Text>
      </View>
      <TextInput
        style={styles.input}
        placeholder="Örn: Mühendislik Fakültesi B Blok"
        value={building}
        onChangeText={setBuilding}
      />

      <View style={styles.sectionLabelRow}>
        <Ionicons name="create-outline" size={16} color="#1e3a8a" />
        <Text style={styles.label}>Açıklama (opsiyonel)</Text>
      </View>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Sorunu kısaca anlatın..."
        multiline
        numberOfLines={4}
        value={description}
        onChangeText={setDescription}
      />

      <View style={styles.anonymousRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Anonim gönder</Text>
          <Text style={styles.anonymousHint}>Kampüs akışında adın gizlenir</Text>
        </View>
        <Switch
          value={isAnonymous}
          onValueChange={setIsAnonymous}
          trackColor={{ false: '#e5e5e5', true: '#93a5e0' }}
          thumbColor={isAnonymous ? '#1e3a8a' : '#fff'}
        />
      </View>

      <TouchableOpacity
        style={[styles.submitButton, submitting && { opacity: 0.6 }]}
        onPress={handleSubmit}
        disabled={submitting}
        activeOpacity={0.85}
      >
        {submitting ? (
          <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
        ) : (
          <Ionicons name="send" size={16} color="#fff" style={{ marginRight: 8 }} />
        )}
        <Text style={styles.submitButtonText}>
          {submitting ? 'Gönderiliyor...' : 'Raporu Gönder'}
        </Text>
      </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#fff' },
  permText: { textAlign: 'center', marginBottom: 16, color: '#555' },
  permButton: { backgroundColor: '#1e3a8a', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 10 },
  permButtonText: { color: '#fff', fontWeight: '600' },

  cameraContainer: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  cameraHint: {
    position: 'absolute',
    top: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20
  },
  cameraHintText: { color: '#fff', fontSize: 13 },
  shutterButton: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#fff' },

  formContainer: { padding: 20, paddingBottom: 40 },
  previewWrapper: { marginBottom: 20 },
  preview: { width: '100%', height: 220, borderRadius: 14, backgroundColor: '#eee' },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#eef2ff'
  },
  retakeText: { color: '#1e3a8a', fontSize: 13, fontWeight: '600', marginLeft: 6 },

  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginTop: 4 },
  label: { fontWeight: '700', fontSize: 14, marginLeft: 6 },

  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  locationText: { color: '#555', marginLeft: 8, fontSize: 13 },

  anonymousRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20
  },
  anonymousHint: { color: '#888', fontSize: 12, marginTop: 2 },

  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingVertical: 9,
    paddingHorizontal: 14,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#fafafa'
  },
  categoryChipActive: { backgroundColor: '#1e3a8a', borderColor: '#1e3a8a' },
  categoryChipText: { color: '#333', fontSize: 13, fontWeight: '500' },
  categoryChipTextActive: { color: '#fff', fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    fontSize: 15,
    backgroundColor: '#fafafa'
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#1e3a8a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#1e3a8a',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 3
  },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});
