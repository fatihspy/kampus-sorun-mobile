import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api, { resolveImageUrl, getErrorMessage } from '../api/client';

const STATUS_LABELS = { yeni: 'Yeni', inceleniyor: 'İnceleniyor', cozuldu: 'Çözüldü' };
const STATUS_COLORS = { yeni: '#dc2626', inceleniyor: '#d97706', cozuldu: '#16a34a' };
const CATEGORY_LABELS = { temizlik: 'Temizlik', teknik: 'Teknik/Bakım', guvenlik: 'Güvenlik', diger: 'Diğer' };

export default function CampusFeedScreen({ navigation }) {
  const [reports, setReports] = useState([]);
  const [sort, setSort] = useState('recent'); // 'recent' | 'popular'
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  const fetchFeed = async (sortMode = sort) => {
    try {
      const { data } = await api.get(`/reports/feed?sort=${sortMode}`);
      setReports(data);
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchFeed();
    }, [sort])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFeed();
    setRefreshing(false);
  };

  const toggleUpvote = async (reportId) => {
    // İyimser güncelleme: arayüzü hemen değiştir, sunucudan onay bekleme
    setReports((prev) =>
      prev.map((r) =>
        r._id === reportId
          ? { ...r, hasUpvoted: !r.hasUpvoted, upvoteCount: r.upvoteCount + (r.hasUpvoted ? -1 : 1) }
          : r
      )
    );
    try {
      await api.post(`/reports/${reportId}/upvote`);
    } catch (err) {
      fetchFeed(); // hata olursa gerçek veriyle senkronize et
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Kampüs Akışı</Text>
        <View style={styles.sortToggle}>
          <TouchableOpacity
            style={[styles.sortBtn, sort === 'recent' && styles.sortBtnActive]}
            onPress={() => setSort('recent')}
          >
            <Text style={[styles.sortText, sort === 'recent' && styles.sortTextActive]}>Yeni</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortBtn, sort === 'popular' && styles.sortBtnActive]}
            onPress={() => setSort('popular')}
          >
            <Text style={[styles.sortText, sort === 'popular' && styles.sortTextActive]}>Popüler</Text>
          </TouchableOpacity>
        </View>
      </View>

      {errorMessage ? (
        <View style={styles.errorBanner}>
          <Ionicons name="cloud-offline-outline" size={18} color="#dc2626" />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      <FlatList
        data={reports}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color="#1e3a8a" />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="megaphone-outline" size={40} color="#ccc" />
              <Text style={styles.empty}>Henüz kampüste paylaşılmış rapor yok</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('ReportDetail', { id: item._id })}
          >
            <Image source={{ uri: resolveImageUrl(item.photoUrl) }} style={styles.thumb} />
            <View style={styles.cardBody}>
              <View style={styles.cardTop}>
                <Text style={styles.category}>{CATEGORY_LABELS[item.category] || item.category}</Text>
                <Text style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] }]}>
                  {STATUS_LABELS[item.status]}
                </Text>
              </View>
              <Text style={styles.reporterLine}>
                {item.isAnonymous ? 'Anonim' : item.reporter?.name || 'Bilinmiyor'}
                {item.building ? ` · ${item.building}` : ''}
              </Text>
              {item.description ? (
                <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
              ) : null}
            </View>
            <TouchableOpacity
              style={styles.voteBtn}
              onPress={() => toggleUpvote(item._id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={item.hasUpvoted ? 'arrow-up-circle' : 'arrow-up-circle-outline'}
                size={26}
                color={item.hasUpvoted ? '#1e3a8a' : '#999'}
              />
              <Text style={[styles.voteCount, item.hasUpvoted && { color: '#1e3a8a' }]}>
                {item.upvoteCount}
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  sortToggle: { flexDirection: 'row', backgroundColor: '#f0f0f0', borderRadius: 10, padding: 3, alignSelf: 'flex-start' },
  sortBtn: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 8 },
  sortBtnActive: { backgroundColor: '#1e3a8a' },
  sortText: { color: '#666', fontSize: 13, fontWeight: '600' },
  sortTextActive: { color: '#fff' },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 12,
    borderRadius: 10
  },
  errorText: { color: '#dc2626', fontSize: 13, marginLeft: 8, flex: 1 },
  emptyContainer: { alignItems: 'center', paddingTop: 80 },
  empty: { color: '#999', marginTop: 10, fontSize: 14 },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    alignItems: 'center'
  },
  thumb: { width: 56, height: 56, borderRadius: 10, backgroundColor: '#eee', marginRight: 12 },
  cardBody: { flex: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  category: { fontWeight: '700', fontSize: 14 },
  badge: { color: '#fff', fontSize: 10, fontWeight: '700', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  reporterLine: { fontSize: 12, color: '#888', marginBottom: 3 },
  desc: { fontSize: 13, color: '#555' },
  voteBtn: { alignItems: 'center', marginLeft: 10, width: 44 },
  voteCount: { fontSize: 12, fontWeight: '700', color: '#999', marginTop: 2 }
});
