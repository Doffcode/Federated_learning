import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { detectVehicleType, getVehicleConfig } from '../../utils/mockData';

export default function Insights() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedVehicle) {
      loadVehicleHealth();
    }
  }, [selectedVehicle]);

  const loadData = async () => {
    try {
      const vehiclesRes = await api.get('/vehicles');
      setVehicles(vehiclesRes.data);
      if (vehiclesRes.data.length > 0 && !selectedVehicle) {
        setSelectedVehicle(vehiclesRes.data[0]);
      }
    } catch (error) {
      console.log('Error loading vehicles:', error);
    }
  };

  const loadVehicleHealth = async () => {
    try {
      const healthRes = await api.get(`/vehicles/${selectedVehicle.id}/health`);
      setHealth(healthRes.data);
    } catch (error) {
      console.log('Error loading health:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    if (selectedVehicle) {
      await loadVehicleHealth();
    }
    setRefreshing(false);
  };

  const getRecommendation = () => {
    if (!health) return null;

    if (health.battery_health < 70) {
      return 'Battery health is degrading. Consider battery service or replacement.';
    }
    if (health.service_due_km < 500) {
      return `Service due in ${health.service_due_km} km. Schedule maintenance soon.`;
    }
    if (health.charging_status !== 'OK') {
      return 'Charging system needs attention. Check with service center.';
    }
    if (health.degradation_level === 'high') {
      return 'High degradation detected. Comprehensive vehicle check recommended.';
    }
    return 'Vehicle health is good. Continue regular maintenance.';
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>INSIGHTS</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
        }
      >
        {vehicles.length > 0 && health ? (
          <>
            {/* Vehicle Selector */}
            {vehicles.length > 1 && (
              <View style={styles.selector}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {vehicles.map((vehicle) => (
                    <TouchableOpacity
                      key={vehicle.id}
                      style={[
                        styles.vehicleChip,
                        selectedVehicle?.id === vehicle.id && styles.vehicleChipActive,
                      ]}
                      onPress={() => setSelectedVehicle(vehicle)}
                    >
                      <Text
                        style={[
                          styles.vehicleChipText,
                          selectedVehicle?.id === vehicle.id && styles.vehicleChipTextActive,
                        ]}
                      >
                        {vehicle.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Vehicle Image + Dataset Stats */}
            {selectedVehicle && (() => {
              const vtype = detectVehicleType(selectedVehicle);
              const cfg   = getVehicleConfig(vtype);
              return (
                <View style={styles.vehicleHeroCard}>
                  <Image source={{ uri: cfg.image_url }} style={styles.vehicleHeroImage} resizeMode="contain" />
                  <View style={styles.vehicleHeroInfo}>
                    <Text style={styles.vehicleHeroName}>{selectedVehicle.model}</Text>
                    <Text style={styles.vehicleHeroSub}>{cfg.city} · {selectedVehicle.registration_number}</Text>
                    <View style={styles.vehicleStatRow}>
                      <View style={styles.vehicleStat}>
                        <Text style={styles.vehicleStatVal}>{cfg.avg_range_km} km</Text>
                        <Text style={styles.vehicleStatLbl}>Range</Text>
                      </View>
                      <View style={styles.vehicleStat}>
                        <Text style={styles.vehicleStatVal}>{cfg.battery_capacity} kWh</Text>
                        <Text style={styles.vehicleStatLbl}>Battery</Text>
                      </View>
                      <View style={styles.vehicleStat}>
                        <Text style={styles.vehicleStatVal}>{cfg.vehicle_age_years.toFixed(1)} yr</Text>
                        <Text style={styles.vehicleStatLbl}>Age</Text>
                      </View>
                      <View style={styles.vehicleStat}>
                        <Text style={styles.vehicleStatVal}>{cfg.charging_rate_kw} kW</Text>
                        <Text style={styles.vehicleStatLbl}>Charge</Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })()}

            {/* Battery Health */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Battery Health</Text>
              <Text style={styles.batteryValue}>{health.battery_health}%</Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${health.battery_health}%`,
                      backgroundColor:
                        health.battery_health > 80
                          ? '#10B981'
                          : health.battery_health > 50
                          ? '#F59E0B'
                          : '#EF4444',
                    },
                  ]}
                />
              </View>
            </View>

            {/* Service Due */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="build" size={24} color="#3B82F6" />
                <View style={styles.cardContent}>
                  <Text style={styles.cardLabel}>Service Due</Text>
                  <Text style={styles.cardSubtext}>All good</Text>
                </View>
                <Text style={styles.serviceDue}>{health.service_due_km} km</Text>
              </View>
            </View>

            {/* Charging Status */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="flash" size={24} color="#F59E0B" />
                <View style={styles.cardContent}>
                  <Text style={styles.cardLabel}>Charging Status</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    health.charging_status === 'OK' ? styles.statusOk : styles.statusWarning,
                  ]}
                >
                  <Text style={styles.statusText}>{health.charging_status}</Text>
                </View>
              </View>
            </View>

            {/* Degradation Level */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="trending-down" size={24} color="#10B981" />
                <View style={styles.cardContent}>
                  <Text style={styles.cardLabel}>Degradation Level</Text>
                </View>
                <Text
                  style={[
                    styles.degradationText,
                    {
                      color:
                        health.degradation_level === 'low'
                          ? '#10B981'
                          : health.degradation_level === 'medium'
                          ? '#F59E0B'
                          : '#EF4444',
                    },
                  ]}
                >
                  {health.degradation_level}
                </Text>
              </View>
            </View>

            {/* Last Service */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="calendar" size={24} color="#8B5CF6" />
                <View style={styles.cardContent}>
                  <Text style={styles.cardLabel}>Last Service</Text>
                </View>
                <Text style={styles.dateText}>{health.last_service_date || 'N/A'}</Text>
              </View>
            </View>

            {/* Recommendations */}
            <View style={styles.recommendationsCard}>
              <Text style={styles.recommendationsTitle}>Recommendations</Text>
              <View style={styles.recommendation}>
                <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />
                <Text style={styles.recommendationText}>{getRecommendation()}</Text>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="bulb-outline" size={80} color="#64748B" />
            <Text style={styles.emptyTitle}>No Vehicle Data</Text>
            <Text style={styles.emptyText}>Add a vehicle to see insights</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  vehicleHeroCard: {
    backgroundColor: '#1E293B',
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  vehicleHeroImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#0F172A',
  },
  vehicleHeroInfo: {
    padding: 14,
  },
  vehicleHeroName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  vehicleHeroSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 12,
  },
  vehicleStatRow: {
    flexDirection: 'row',
    gap: 8,
  },
  vehicleStat: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
  },
  vehicleStatVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3B82F6',
  },
  vehicleStatLbl: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#1E293B',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  content: {
    flex: 1,
  },
  selector: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  vehicleChip: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  vehicleChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  vehicleChipText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  vehicleChipTextActive: {
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
  },
  cardLabel: {
    fontSize: 16,
    color: '#94A3B8',
    marginBottom: 8,
  },
  batteryValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#10B981',
    marginBottom: 16,
  },
  progressBar: {
    height: 12,
    backgroundColor: '#334155',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
  },
  cardSubtext: {
    fontSize: 12,
    color: '#64748B',
  },
  serviceDue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusOk: {
    backgroundColor: '#10B981',
  },
  statusWarning: {
    backgroundColor: '#F59E0B',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  degradationText: {
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'lowercase',
  },
  dateText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  recommendationsCard: {
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 20,
    borderRadius: 16,
  },
  recommendationsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  recommendation: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
  },
});