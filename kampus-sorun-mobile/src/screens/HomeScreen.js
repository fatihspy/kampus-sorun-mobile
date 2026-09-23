import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api, { getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';

const STATUS_LABELS = {
  yeni: 'Yeni',
  inceleniyor: 'İnceleniyor',
  cozuldu: 'Çözüldü'
};

const STATUS_COLORS = {
  yeni: '#dc2626',
  inceleniyor: '#d97706',
  cozuldu: '#16a34a'
};

const CATEGORY_ICONS = {
  temizlik: 'trash-outline',
  teknik: 'construct-outline',
  guvenlik: 'shield-checkmark-outline',
  diger: 'ellipsis-horizontal-circle-outline'
};

const CATEGORY_LABELS = {
  temizlik: 'Temizlik',
  teknik: 'Teknik/Bakım',
  guvenlik: 'Güvenlik',
  diger: 'Diğer'
};

function initials(name = '') {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [reports, setReports] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchReports = async () => {
    try {
      const { data } = await api.get('/reports');
      setReports(data);
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const visibleReports = statusFilter ? reports.filter((r) => r.status === statusFilter) : reports;

  // Ekrana her dönüldüğünde listeyi tazele (yeni rapor gönderildikten sonra dahil)
  useFocusEffect(
    useCallback(() => {
      fetchReports();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReports();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(user?.name)}</Text>
          </View>
          <View>
            <Text style={styles.greeting}>Merhaba, {user?.name?.split(' ')[0]}</Text>
            <Text style={styles.role}>{user?.role}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={20} color="#dc2626" />
        </TouchableOpacity>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.reportButton}
          onPress={() => navigation.navigate('CreateReport')}
          activeOpacity={0.85}
        >
          <Ionicons name="camera" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.reportButtonText}>Sorun Bildir</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        {['', 'yeni', 'inceleniyor', 'cozuldu'].map((s) => (
          <TouchableOpacity
            key={s || 'all'}
            style={[styles.filterChip, statusFilter === s && styles.filterChipActive]}
            onPress={() => setStatusFilter(s)}
          >
            <Text style={[styles.filterChipText, statusFilter === s && styles.filterChipTextActive]}>
              {s ? STATUS_LABELS[s] : 'Tümü'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Raporlarım</Text>
        {visibleReports.length > 0 && <Text style={styles.sectionCount}>{visibleReports.length}</Text>}
      </View>

      {errorMessage ? (
        <View style={styles.errorBanner}>
          <Ionicons name="cloud-offline-outline" size={18} color="#dc2626" />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      <FlatList
        data={visibleReports}
        keyExtractor={(item) => item._id}
        contentContainerStyle={visibleReports.length === 0 && { flex: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color="#1e3a8a" />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={40} color="#ccc" />
              <Text style={styles.empty}>Henüz gönderilmiş rapor yok</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('ReportDetail', { id: item._id })}
          >
            <View style={[styles.statusBar, { backgroundColor: STATUS_COLORS[item.status] }]} />
            <View style={styles.iconCircle}>
              <Ionicons name={CATEGORY_ICONS[item.category] || 'help-circle-outline'} size={20} color="#1e3a8a" />
            </View>
            <View style={styles.cardBody}>
              <View style={styles.cardRow}>
                <Text style={styles.cardCategory}>{CATEGORY_LABELS[item.category] || item.category}</Text>
                <Text style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] }]}>
                  {STATUS_LABELS[item.status]}
                </Text>
              </View>
              {item.description ? (
                <Text style={styles.cardDesc} numberOfLines={1}>{item.description}</Text>
              ) : null}
              <Text style={styles.cardDate}>
                {new Date(item.createdAt).toLocaleDateString('tr-TR')}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    marginBottom: 20
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1e3a8a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  greeting: { fontSize: 17, fontWeight: '700' },
  role: { fontSize: 12, color: '#888', textTransform: 'capitalize' },
  logoutBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center'
  },
  reportButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#1e3a8a',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1e3a8a',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 3
  },
  reportButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  actionRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 20, gap: 10 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 16, gap: 8 },
  filterChip: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#f0f0f0'
  },
  filterChipActive: { backgroundColor: '#1e3a8a' },
  filterChipText: { fontSize: 12, color: '#666', fontWeight: '600' },
  filterChipTextActive: { color: '#fff' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12
  },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  sectionCount: {
    marginLeft: 8,
    fontSize: 12,
    color: '#1e3a8a',
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden'
  },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { color: '#999', marginTop: 10, fontSize: 14 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 12,
    borderRadius: 10
  },
  errorText: { color: '#dc2626', fontSize: 13, marginLeft: 8, flex: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    overflow: 'hidden'
  },
  statusBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  cardBody: { flex: 1 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardCategory: { fontWeight: '700', fontSize: 14 },
  badge: { color: '#fff', fontSize: 10, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: 'hidden' },
  cardDesc: { color: '#666', marginTop: 4, fontSize: 13 },
  cardDate: { color: '#aaa', fontSize: 11, marginTop: 4 }
});
