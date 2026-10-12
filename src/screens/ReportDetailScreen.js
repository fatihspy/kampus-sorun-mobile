import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import api, { getErrorMessage, resolveImageUrl } from '../api/client';
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

const CATEGORY_LABELS = {
  temizlik: 'Temizlik',
  teknik: 'Teknik/Bakım',
  guvenlik: 'Güvenlik',
  diger: 'Diğer'
};

function InfoRow({ icon, label, value }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color="#1e3a8a" style={{ marginRight: 10 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function ReportDetailScreen({ route }) {
  const { id } = route.params;
  const { user } = useAuth();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [voting, setVoting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [resolving, setResolving] = useState(false);

  const isStaff = user?.role === 'personel' || user?.role === 'yonetici';

  const fetchReport = async () => {
    try {
      const { data } = await api.get(`/reports/${id}`);
      setReport(data);
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [id]);

  const updateStatus = async (newStatus) => {
    setUpdatingStatus(true);
    try {
      await api.patch(`/reports/${id}/status`, { status: newStatus });
      await fetchReport();
    } catch (err) {
      Alert.alert('Güncellenemedi', getErrorMessage(err));
    } finally {
      setUpdatingStatus(false);
    }
  };

  const resolveWithPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Kamera izni gerekli', 'Çözüm fotoğrafı çekebilmek için kamera izni vermelisin.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({ quality: 0.6 });
      if (result.canceled) return;

      setResolving(true);
      const photo = result.assets[0];
      const formData = new FormData();
      formData.append('photo', {
        uri: photo.uri,
        name: 'resolved.jpg',
        type: 'image/jpeg'
      });

      await api.post(`/reports/${id}/resolve-photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      await fetchReport();
      Alert.alert('Tamamlandı', 'Rapor çözüldü olarak işaretlendi.');
    } catch (err) {
      Alert.alert('İşlem başarısız', getErrorMessage(err));
    } finally {
      setResolving(false);
    }
  };

  const toggleUpvote = async () => {
    if (!report || voting) return;
    setVoting(true);
    // İyimser güncelleme
    setReport((prev) => ({
      ...prev,
      hasUpvoted: !prev.hasUpvoted,
      upvoteCount: (prev.upvoteCount || 0) + (prev.hasUpvoted ? -1 : 1)
    }));
    try {
      await api.post(`/reports/${id}/upvote`);
    } catch (err) {
      fetchReport(); // hata olursa gerçek veriyle senkronize et
    } finally {
      setVoting(false);
    }
  };

  const submitComment = async () => {
    if (!commentText.trim()) return;
    setPostingComment(true);
    try {
      const { data: newComment } = await api.post(`/reports/${id}/comments`, { text: commentText.trim() });
      setReport((prev) => ({ ...prev, comments: [...(prev.comments || []), newComment] }));
      setCommentText('');
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
    } finally {
      setPostingComment(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1e3a8a" />
      </View>
    );
  }

  if (errorMessage && !report) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={36} color="#ccc" />
        <Text style={styles.notFound}>{errorMessage}</Text>
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={36} color="#ccc" />
        <Text style={styles.notFound}>Rapor bulunamadı.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        <Image source={{ uri: resolveImageUrl(report.photoUrl) }} style={styles.image} />

        <View style={styles.body}>
          <View style={styles.topRow}>
            <Text style={styles.category}>{CATEGORY_LABELS[report.category] || report.category}</Text>
            <Text style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[report.status] }]}>
              {STATUS_LABELS[report.status]}
            </Text>
          </View>

          <View style={styles.subRow}>
            <Text style={styles.reporterLine}>
              {report.isAnonymous ? 'Anonim gönderim' : report.reporter?.name || 'Bilinmiyor'}
            </Text>
            <TouchableOpacity style={styles.voteBtn} onPress={toggleUpvote} activeOpacity={0.8}>
              <Ionicons
                name={report.hasUpvoted ? 'arrow-up-circle' : 'arrow-up-circle-outline'}
                size={22}
                color={report.hasUpvoted ? '#1e3a8a' : '#999'}
              />
              <Text style={[styles.voteCount, report.hasUpvoted && { color: '#1e3a8a' }]}>
                {report.upvoteCount ?? 0}
              </Text>
            </TouchableOpacity>
          </View>

          {report.description ? <Text style={styles.desc}>{report.description}</Text> : null}

          <View style={styles.infoCard}>
            <InfoRow icon="business-outline" label="Bina / Konum adı" value={report.building} />
            <InfoRow icon="people-outline" label="Sorumlu birim" value={report.assignedUnit?.name} />
            <InfoRow
              icon="time-outline"
              label="Gönderim tarihi"
              value={new Date(report.createdAt).toLocaleString('tr-TR')}
            />
          </View>

          {isStaff && report.status !== 'cozuldu' ? (
            <View style={styles.staffCard}>
              <View style={styles.sectionLabelRow}>
                <Ionicons name="construct-outline" size={18} color="#1e3a8a" />
                <Text style={styles.staffTitle}>Personel İşlemleri</Text>
              </View>

              {report.status === 'yeni' ? (
                <TouchableOpacity
                  style={styles.staffSecondaryBtn}
                  onPress={() => updateStatus('inceleniyor')}
                  disabled={updatingStatus}
                  activeOpacity={0.85}
                >
                  {updatingStatus ? (
                    <ActivityIndicator size="small" color="#1e3a8a" />
                  ) : (
                    <>
                      <Ionicons name="time-outline" size={16} color="#1e3a8a" style={{ marginRight: 6 }} />
                      <Text style={styles.staffSecondaryBtnText}>İnceleniyor olarak işaretle</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={[styles.staffPrimaryBtn, resolving && { opacity: 0.6 }]}
                onPress={resolveWithPhoto}
                disabled={resolving}
                activeOpacity={0.85}
              >
                {resolving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="camera" size={16} color="#fff" style={{ marginRight: 8 }} />
                )}
                <Text style={styles.staffPrimaryBtnText}>
                  {resolving ? 'Yükleniyor...' : 'Fotoğraf Çekip Çözüldü İşaretle'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {report.resolvedPhotoUrl ? (
            <View style={styles.resolvedSection}>
              <View style={styles.sectionLabelRow}>
                <Ionicons name="checkmark-done-circle" size={18} color="#16a34a" />
                <Text style={styles.resolvedLabel}>Çözüldükten sonra</Text>
              </View>
              <Image source={{ uri: resolveImageUrl(report.resolvedPhotoUrl) }} style={styles.resolvedImage} />
              {report.resolvedAt ? (
                <Text style={styles.resolvedDate}>
                  {new Date(report.resolvedAt).toLocaleString('tr-TR')}
                </Text>
              ) : null}
            </View>
          ) : null}

          <View style={styles.commentsSection}>
            <View style={styles.sectionLabelRow}>
              <Ionicons name="chatbubbles-outline" size={18} color="#1e3a8a" />
              <Text style={styles.commentsTitle}>Yorumlar {report.comments?.length ? `(${report.comments.length})` : ''}</Text>
            </View>

            {report.comments && report.comments.length > 0 ? (
              report.comments.map((c) => (
                <View key={c._id} style={styles.commentItem}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentAuthor}>
                      {c.author?.name || 'Kullanıcı'}
                      {c.author?.role && c.author.role !== 'ogrenci' ? ' · Personel' : ''}
                    </Text>
                    <Text style={styles.commentDate}>
                      {new Date(c.createdAt).toLocaleDateString('tr-TR')}
                    </Text>
                  </View>
                  <Text style={styles.commentText}>{c.text}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noComments}>Henüz yorum yok.</Text>
            )}

            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentInput}
                placeholder="Bir yorum yaz..."
                value={commentText}
                onChangeText={setCommentText}
                multiline
              />
              <TouchableOpacity
                style={[styles.commentSendBtn, (!commentText.trim() || postingComment) && { opacity: 0.5 }]}
                onPress={submitComment}
                disabled={!commentText.trim() || postingComment}
              >
                {postingComment ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={16} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  notFound: { color: '#999', marginTop: 10, textAlign: 'center', paddingHorizontal: 30 },
  image: { width: '100%', height: 260, backgroundColor: '#eee' },
  body: { padding: 20 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  category: { fontSize: 20, fontWeight: '700' },
  statusBadge: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden'
  },
  subRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  reporterLine: { fontSize: 13, color: '#888' },
  voteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  voteCount: { fontSize: 13, fontWeight: '700', color: '#999' },
  desc: { fontSize: 15, color: '#444', lineHeight: 21, marginBottom: 20 },
  infoCard: {
    backgroundColor: '#f8f9fb',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  infoLabel: { fontSize: 12, color: '#999', marginBottom: 2 },
  infoValue: { fontSize: 14, color: '#222', fontWeight: '500' },

  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 6 },

  staffCard: {
    backgroundColor: '#eef2ff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#dbe4ff'
  },
  staffTitle: { fontWeight: '700', fontSize: 14, color: '#1e3a8a' },
  staffSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1e3a8a',
    borderRadius: 10,
    paddingVertical: 12,
    marginBottom: 10,
    backgroundColor: '#fff'
  },
  staffSecondaryBtnText: { color: '#1e3a8a', fontWeight: '700', fontSize: 13 },
  staffPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16a34a',
    borderRadius: 10,
    paddingVertical: 14
  },
  staffPrimaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  resolvedSection: { marginBottom: 24 },
  resolvedLabel: { fontWeight: '700', fontSize: 14, color: '#16a34a' },
  resolvedImage: { width: '100%', height: 200, borderRadius: 12, backgroundColor: '#eee' },
  resolvedDate: { color: '#999', fontSize: 12, marginTop: 6 },

  commentsSection: { marginTop: 4 },
  commentsTitle: { fontWeight: '700', fontSize: 14 },
  commentItem: {
    backgroundColor: '#f8f9fb',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8
  },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  commentAuthor: { fontWeight: '700', fontSize: 12, color: '#1e3a8a' },
  commentDate: { fontSize: 11, color: '#aaa' },
  commentText: { fontSize: 13, color: '#333' },
  noComments: { color: '#999', fontSize: 13, marginBottom: 12 },
  commentInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 8 },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    backgroundColor: '#fafafa',
    maxHeight: 100
  },
  commentSendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1e3a8a',
    justifyContent: 'center',
    alignItems: 'center'
  }
});
