import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'react-native';
import api from '../../services/api';
import { runFLCycle, loadLocalModel } from '../../services/ml';
import { detectVehicleType, getVehicleConfig } from '../../utils/mockData';

export default function Predictions() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [prediction, setPrediction] = useState<any>(null);
  const [localModel, setLocalModel] = useState<any>(null);
  const [trainingStatus, setTrainingStatus] = useState<'idle' | 'training' | 'done' | 'error'>('idle');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedVehicle) {
      loadPrediction();
      loadLocalModel().then(setLocalModel);
    }
  }, [selectedVehicle]);

  const loadData = async () => {
    try {
      const res = await api.get('/vehicles');
      setVehicles(res.data);
      if (res.data.length > 0) setSelectedVehicle(res.data[0]);
    } catch (e) {
      console.log('Error loading vehicles:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadPrediction = async () => {
    if (!selectedVehicle) return;
    try {
      const res = await api.get('/fl/prediction', {
        params: { vehicle_id: selectedVehicle.id },
      });
      setPrediction(res.data);
    } catch (e) {
      console.log('Error loading prediction:', e);
      setPrediction(null);
    }
  };

  const handleTrainAndUpload = async () => {
    if (!selectedVehicle) return;
    setTrainingStatus('training');
    try {
      const model = await runFLCycle(selectedVehicle.id, selectedVehicle.model);
      setLocalModel(model);
      setTrainingStatus('done');
      await loadPrediction();
      Alert.alert(
        'Training Complete',
        `Local model trained.\nAccuracy: ${(model.accuracy * 100).toFixed(1)}%\nOnly weights were sent — no raw data left your device.`,
      );
    } catch (err: any) {
      setTrainingStatus('error');
      Alert.alert('Training Failed', err.message || 'Unknown error');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    if (selectedVehicle) await loadPrediction();
    setRefreshing(false);
  };

  const confidenceColor = (c: number) =>
    c >= 0.8 ? '#10B981' : c >= 0.6 ? '#F59E0B' : '#EF4444';

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>FL PREDICTIONS</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
      >
        {vehicles.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="analytics-outline" size={80} color="#64748B" />
            <Text style={styles.emptyTitle}>No Vehicles Yet</Text>
            <Text style={styles.emptyText}>Add a vehicle to start FL predictions</Text>
          </View>
        ) : (
          <>
            {/* Vehicle selector */}
            {vehicles.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selector}>
                {vehicles.map(v => (
                  <TouchableOpacity
                    key={v.id}
                    style={[styles.chip, selectedVehicle?.id === v.id && styles.chipActive]}
                    onPress={() => setSelectedVehicle(v)}
                  >
                    <Text style={[styles.chipText, selectedVehicle?.id === v.id && styles.chipTextActive]}>
                      {v.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Vehicle image header */}
            {selectedVehicle && (() => {
              const vtype = detectVehicleType(selectedVehicle);
              const cfg   = getVehicleConfig(vtype);
              return (
                <View style={styles.vehicleHero}>
                  <Image source={{ uri: cfg.image_url }} style={styles.vehicleHeroImg} resizeMode="contain" />
                  <View style={styles.vehicleHeroOverlay}>
                    <Text style={styles.vehicleHeroName}>{selectedVehicle.model}</Text>
                    <Text style={styles.vehicleHeroSub}>{cfg.city} · {selectedVehicle.registration_number}</Text>
                  </View>
                </View>
              );
            })()}

            {/* Privacy badge */}
            <View style={styles.privacyBadge}>
              <Ionicons name="shield-checkmark" size={16} color="#10B981" />
              <Text style={styles.privacyText}>
                On-device training — raw data never leaves your phone
              </Text>
            </View>

            {/* Prediction card */}
            {prediction ? (
              <>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Battery Health Prediction</Text>
                  <Text style={styles.bigNumber}>{prediction.battery_health_pred}%</Text>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${prediction.battery_health_pred}%`,
                          backgroundColor:
                            prediction.battery_health_pred > 80
                              ? '#10B981'
                              : prediction.battery_health_pred > 60
                              ? '#F59E0B'
                              : '#EF4444',
                        },
                      ]}
                    />
                  </View>

                  <View style={styles.row}>
                    <View style={styles.metricBox}>
                      <Text style={styles.metricLabel}>Degradation Rate</Text>
                      <Text style={styles.metricValue}>{prediction.degradation_rate}%/mo</Text>
                    </View>
                    <View style={styles.metricBox}>
                      <Text style={styles.metricLabel}>Confidence</Text>
                      <Text
                        style={[
                          styles.metricValue,
                          { color: confidenceColor(prediction.confidence) },
                        ]}
                      >
                        {(prediction.confidence * 100).toFixed(0)}%
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.card}>
                  <View style={styles.cardRow}>
                    <Ionicons name="calendar" size={24} color="#8B5CF6" />
                    <View style={{ marginLeft: 12 }}>
                      <Text style={styles.cardLabel}>Recommended Service Date</Text>
                      <Text style={styles.cardValue}>{prediction.service_due_date}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.card}>
                  <View style={styles.cardRow}>
                    <Ionicons
                      name={prediction.is_personalized ? 'person-circle' : 'globe'}
                      size={24}
                      color={prediction.is_personalized ? '#3B82F6' : '#64748B'}
                    />
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text style={styles.cardLabel}>Model Type</Text>
                      <Text style={styles.cardValue}>
                        {prediction.is_personalized
                          ? 'Personalised (70% global + 30% your data)'
                          : 'Global model (contribute to personalise)'}
                      </Text>
                    </View>
                  </View>
                </View>
              </>
            ) : (
              <View style={styles.card}>
                <Text style={styles.cardLabel}>No prediction available yet.</Text>
                <Text style={[styles.cardLabel, { fontSize: 13, marginTop: 4 }]}>
                  Train the local model below to generate a personalised prediction.
                </Text>
              </View>
            )}

            {/* Local model status */}
            {localModel && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Local Model</Text>
                <Text style={styles.cardLabel}>
                  Last trained: {new Date(localModel.trainedAt).toLocaleDateString()}
                </Text>
                <Text style={styles.cardLabel}>
                  Accuracy: {(localModel.accuracy * 100).toFixed(1)}% | Loss:{' '}
                  {localModel.loss.toFixed(4)}
                </Text>
              </View>
            )}

            {/* Train button */}
            <TouchableOpacity
              style={[styles.trainButton, trainingStatus === 'training' && styles.trainButtonDisabled]}
              onPress={handleTrainAndUpload}
              disabled={trainingStatus === 'training'}
            >
              {trainingStatus === 'training' ? (
                <>
                  <ActivityIndicator color="#FFFFFF" size="small" style={{ marginRight: 8 }} />
                  <Text style={styles.trainButtonText}>Training on-device…</Text>
                </>
              ) : (
                <>
                  <Ionicons name="flash" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.trainButtonText}>
                    {localModel ? 'Retrain & Contribute' : 'Train Local Model'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.disclaimer}>
              Training runs entirely on your device. Only model weights (not your data) are shared
              with the federated server to improve global predictions.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: '#0F172A' },
  vehicleHero:       { backgroundColor: '#1E293B', marginHorizontal: 16, marginTop: 16, borderRadius: 16, overflow: 'hidden' },
  vehicleHeroImg:    { width: '100%', height: 170, backgroundColor: '#0F172A' },
  vehicleHeroOverlay:{ backgroundColor: 'rgba(15,23,42,0.75)', padding: 12 },
  vehicleHeroName:   { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  vehicleHeroSub:    { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  header:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                       paddingHorizontal: 16, paddingTop: 50, paddingBottom: 16, backgroundColor: '#1E293B' },
  headerTitle:       { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', letterSpacing: 1 },
  content:           { flex: 1 },
  emptyState:        { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyTitle:        { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', marginTop: 16, marginBottom: 8 },
  emptyText:         { fontSize: 16, color: '#64748B' },
  selector:          { paddingHorizontal: 16, paddingVertical: 16 },
  chip:              { backgroundColor: '#1E293B', paddingHorizontal: 20, paddingVertical: 10,
                       borderRadius: 20, marginRight: 12, borderWidth: 1, borderColor: '#334155' },
  chipActive:        { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  chipText:          { color: '#94A3B8', fontSize: 14, fontWeight: '600' },
  chipTextActive:    { color: '#FFFFFF' },
  privacyBadge:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#064E3B',
                       marginHorizontal: 16, marginBottom: 16, padding: 12, borderRadius: 12, gap: 8 },
  privacyText:       { color: '#6EE7B7', fontSize: 13, flex: 1 },
  card:              { backgroundColor: '#1E293B', marginHorizontal: 16, marginBottom: 16,
                       padding: 20, borderRadius: 16 },
  cardTitle:         { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 12 },
  cardLabel:         { fontSize: 14, color: '#94A3B8', marginBottom: 4 },
  cardValue:         { fontSize: 15, color: '#FFFFFF', fontWeight: '600' },
  cardRow:           { flexDirection: 'row', alignItems: 'center' },
  bigNumber:         { fontSize: 52, fontWeight: 'bold', color: '#3B82F6', marginBottom: 12 },
  progressBar:       { height: 10, backgroundColor: '#334155', borderRadius: 5,
                       overflow: 'hidden', marginBottom: 16 },
  progressFill:      { height: '100%', borderRadius: 5 },
  row:               { flexDirection: 'row', gap: 12 },
  metricBox:         { flex: 1, backgroundColor: '#0F172A', padding: 12, borderRadius: 10 },
  metricLabel:       { fontSize: 12, color: '#64748B', marginBottom: 4 },
  metricValue:       { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
  trainButton:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                       backgroundColor: '#3B82F6', marginHorizontal: 16, marginBottom: 16,
                       padding: 18, borderRadius: 14 },
  trainButtonDisabled:{ opacity: 0.6 },
  trainButtonText:   { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  disclaimer:        { color: '#475569', fontSize: 12, textAlign: 'center',
                       marginHorizontal: 24, marginBottom: 32, lineHeight: 18 },
});
