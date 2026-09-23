import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Backend artık Render'da kalıcı olarak çalışıyor — yerel IP/hotspot ayarına gerek yok.
const BASE_URL = 'https://kampus-sorun.onrender.com/api';

// Fotoğraf gibi /api altında olmayan kaynaklar için sunucu kök adresi
export const SERVER_URL = BASE_URL.replace(/\/api$/, '');

// Rapor fotoğrafları artık Cloudinary'nin tam (https://...) adresiyle geliyor;
// eski/olası göreli yollar için geriye dönük uyumluluk sağlar.
export function resolveImageUrl(path) {
  if (!path) return null;
  return path.startsWith('http') ? path : `${SERVER_URL}${path}`;
}

const api = axios.create({ baseURL: BASE_URL });

// Her isteğe otomatik olarak JWT token ekle
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Sunucuya hiç ulaşılamadığında (backend kapalı, ağ sorunu vb.) anlamlı bir mesaj ekle
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      error.friendlyMessage = 'Sunucuya bağlanılamadı. İnternet bağlantınızı ve backend sunucusunun çalıştığını kontrol edin.';
    }
    return Promise.reject(error);
  }
);

// Bir hatadan kullanıcıya gösterilecek en uygun mesajı çıkarır
export function getErrorMessage(err) {
  return err.friendlyMessage || err.response?.data?.error || err.message || 'Bilinmeyen bir hata oluştu.';
}

export default api;
