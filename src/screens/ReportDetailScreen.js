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
  Platform
} from 'react-native';
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
