import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../services/api';

export default function ParkingHistory() {
  const router = useRouter();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    try {
      const res = await api.get('/parking');
      setRecords(res.data);
    } catch (e) {
      console.log('Error loading parking:', e);
    } finally {
      setLoading(false);
    }
  };

  const openMaps = (lat: number, lng: number) => {
    Linking.openURL(`https://www.google.com/maps?q=${lat},${lng}`);
  };

  const formatDate = (isoStr: string) => {
    try {
      return new Date(isoStr).toLocaleString();
    } catch {
      return isoStr;
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>PARKING RECORD</Text>
        <View style={styles.placeholder} />
      </View>

      {records.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="map-outline" size={80} color="#64748B" />
          <Text style={styles.emptyTitle}>No Parking Records</Text>
          <Text style={styles.emptyText}>Your parking locations will appear here</Text>
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Ionicons name="location" size={24} color="#3B82F6" />
                <View style={styles.cardInfo}>
                  <Text style={styles.locationText}>{item.location}</Text>
                  <Text style={styles.coordsText}>
                    {parseFloat(item.latitude).toFixed(4)}, {parseFloat(item.longitude).toFixed(4)}
                  </Text>
                  <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.mapsButton}
                onPress={() => openMaps(item.latitude, item.longitude)}
              >
                <Ionicons name="map" size={16} color="#FFFFFF" />
                <Text style={styles.mapsButtonText}>Open in Maps</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#0F172A' },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                      paddingHorizontal: 16, paddingTop: 50, paddingBottom: 16, backgroundColor: '#1E293B' },
  backButton:       { padding: 8 },
  headerTitle:      { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', letterSpacing: 1 },
  placeholder:      { width: 40 },
  list:             { padding: 16 },
  card:             { backgroundColor: '#1E293B', borderRadius: 16, padding: 16, marginBottom: 12 },
  cardTop:          { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  cardInfo:         { flex: 1, marginLeft: 12 },
  locationText:     { fontSize: 15, fontWeight: '600', color: '#FFFFFF', marginBottom: 4 },
  coordsText:       { fontSize: 12, color: '#64748B', marginBottom: 4 },
  dateText:         { fontSize: 12, color: '#94A3B8' },
  mapsButton:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                      backgroundColor: '#3B82F6', borderRadius: 10, paddingVertical: 10, gap: 8 },
  mapsButtonText:   { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  emptyState:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTitle:       { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF', marginTop: 16, marginBottom: 8 },
  emptyText:        { fontSize: 14, color: '#64748B' },
});
