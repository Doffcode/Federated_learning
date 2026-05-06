import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  RefreshControl,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { useRouter } from 'expo-router';
import { Platform } from 'react-native';
import { MOCK_VEHICLES, MOCK_RIDES, DEMO_LOCATION, detectVehicleType, getVehicleConfig, generateMockRides } from '../../utils/mockData';
import { loadLocalModel } from '../../services/ml';

const { width } = Dimensions.get('window');

export default function Home() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lastRide, setLastRide] = useState<any>(null);
  const [parking, setParking] = useState<any>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicleIdx, setSelectedVehicleIdx] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [flStats, setFlStats] = useState<any>(null);
  const [localModel, setLocalModel] = useState<any>(null);

  const vehicle = vehicles[selectedVehicleIdx] || null;

  useEffect(() => {
    loadData();
    loadLocalModel().then(setLocalModel);
  }, [selectedVehicleIdx]);

  const loadData = async () => {
    // Vehicles MUST load independently — if rides/parking fail, we still need
    // the vehicle list so "Load Demo Data" duplicate check works correctly.
    try {
      const vehiclesRes = await api.get('/vehicles');
      if (vehiclesRes.data && vehiclesRes.data.length > 0) {
        setVehicles(vehiclesRes.data);
        setSelectedVehicleIdx(0);
        console.log(`📱 Loaded ${vehiclesRes.data.length} vehicles`);
      }
    } catch (_) {}

    // Rides and parking can fail silently (empty state is valid)
    try {
      const ridesRes = await api.get('/rides/latest');
      if (ridesRes.data) {
        setLastRide(ridesRes.data);
        setHasData(true);
      }
    } catch (_) {}

    try {
      const parkingRes = await api.get('/parking/latest');
      if (parkingRes.data) setParking(parkingRes.data);
    } catch (_) {}

    // FL stats are non-critical
    try {
      const [globalRes, statsRes] = await Promise.all([
        api.get('/fl/global-model'),
        api.get('/fl/stats'),
      ]);
      setFlStats({ global: globalRes.data, stats: statsRes.data });
    } catch (_) {}
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleLoadMockData = async () => {
    try {
      console.log('🔄 Starting load demo data...');

      let vehicleId: string;
      let vtype = 'tesla';
      let currentVehicle = vehicles[selectedVehicleIdx];

      if (currentVehicle) {
        console.log('✓ Using existing vehicle:', currentVehicle.id);
        vehicleId = currentVehicle.id;
        vtype = detectVehicleType(currentVehicle);
      } else {
        console.log('➕ Creating new default vehicle...');
        const vehiclePayload = getVehicleConfig('tesla');
        const vehicleRes = await api.post('/vehicles', vehiclePayload);
        vehicleId = vehicleRes.data.id;
        vtype = 'tesla';
      }

      console.log(`➕ Creating mock rides for vehicle type: ${vtype}...`);
      const ridesToCreate = generateMockRides(vtype);
      for (const ride of ridesToCreate) {
        await api.post('/rides', { ...ride, vehicle_id: vehicleId });
      }

      console.log('✓ Demo data loading complete');
      Alert.alert('Success', 'Demo data loaded successfully!');

      // Step 4: Reload all data from backend
      console.log('🔄 Reloading data...');
      await loadData();
      console.log('✓ Data reloaded');
    } catch (error: any) {
      console.error('❌ Load demo data failed:', error);
      console.error('📊 Full error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          method: error.config?.method,
          url: error.config?.url,
          data: error.config?.data,
        },
      });
      Alert.alert('Error', error.response?.data?.detail || error.message || 'Failed to load demo data');
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login');
          },
        },
      ]
    );
  };

  const getTimeSinceRide = () => {
    if (!lastRide) return '';
    const rideDate = new Date(lastRide.created_at);
    const now = new Date();
    const diff = Math.floor((now.getTime() - rideDate.getTime()) / 1000 / 60);
    
    if (diff < 60) return `${diff} Min ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)} Hr ${diff % 60} Min ago`;
    return `${Math.floor(diff / 1440)} days ${Math.floor((diff % 1440) / 60)} Hr ${diff % 60} Min ago`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setDrawerOpen(!drawerOpen)}>
          <Ionicons name="menu" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>HOME</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="add" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="bluetooth" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Vehicle Tabs (for multi-vehicle support) */}
      {vehicles.length > 1 && (
        <View style={styles.vehicleTabs}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsContainer}
          >
            {vehicles.map((v, idx) => (
              <TouchableOpacity
                key={v.id}
                style={[
                  styles.tab,
                  selectedVehicleIdx === idx && styles.tabActive
                ]}
                onPress={() => setSelectedVehicleIdx(idx)}
              >
                <Text
                  style={[
                    styles.tabText,
                    selectedVehicleIdx === idx && styles.tabTextActive
                  ]}
                >
                  {v.model || 'Vehicle'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Drawer Backdrop */}
      {drawerOpen && (
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1}
          onPress={() => setDrawerOpen(false)}
        />
      )}

      {/* Drawer Menu */}
      {drawerOpen && (
        <View style={styles.drawer}>
          <View style={styles.drawerHeader}>
            <View style={styles.profileSection}>
              <View style={styles.profileImage}>
                <Ionicons name="person" size={40} color="#3B82F6" />
              </View>
              <Text style={styles.profileName}>{user?.name}</Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
              <TouchableOpacity
                style={styles.editProfile}
                onPress={() => { setDrawerOpen(false); router.push('/edit-profile'); }}
              >
                <Ionicons name="create-outline" size={16} color="#3B82F6" />
                <Text style={styles.editProfileText}>Edit Profile</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.drawerMenu}>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                setDrawerOpen(false);
                Alert.alert('Info', 'You are already on the Home screen');
              }}
            >
              <Ionicons name="home" size={24} color="#3B82F6" />
              <Text style={styles.menuItemText}>HOME</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setDrawerOpen(false);
                router.push('/(tabs)/analytics');
              }}
            >
              <Ionicons name="location" size={24} color="#94A3B8" />
              <Text style={styles.menuItemText}>RIDING HISTORY</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setDrawerOpen(false);
                router.push('/parking-history');
              }}
            >
              <Ionicons name="map" size={24} color="#94A3B8" />
              <Text style={styles.menuItemText}>PARKING RECORD</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                setDrawerOpen(false);
                router.push('/vehicles');
              }}
            >
              <Ionicons name="bicycle" size={24} color="#94A3B8" />
              <Text style={styles.menuItemText}>YOUR VEHICLES</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                setDrawerOpen(false);
                Alert.alert('About Us', 'EV Service App\n\nYour complete electric vehicle management solution.\n\nVersion 1.0.0');
              }}
            >
              <Ionicons name="information-circle" size={24} color="#94A3B8" />
              <Text style={styles.menuItemText}>ABOUT US</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                setDrawerOpen(false);
                Alert.alert('Privacy Policy', 'Your data is stored securely and never shared with third parties.');
              }}
            >
              <Ionicons name="shield-checkmark" size={24} color="#94A3B8" />
              <Text style={styles.menuItemText}>PRIVACY POLICY</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => {
                setDrawerOpen(false);
                handleLogout();
              }}
            >
              <Ionicons name="person-remove" size={24} color="#94A3B8" />
              <Text style={styles.menuItemText}>LOGOUT</Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.drawerFooter}>
            <TouchableOpacity
              style={styles.footerButton}
              onPress={() => {
                setDrawerOpen(false);
                router.push('/change-password');
              }}
            >
              <Ionicons name="key" size={20} color="#3B82F6" />
              <Text style={styles.footerButtonText}>CHANGE PASSWORD</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Main Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
        }
      >
        {!hasData ? (
          <View style={styles.emptyState}>
            <Ionicons name="car-sport-outline" size={80} color="#64748B" />
            <Text style={styles.emptyTitle}>No Rides Yet</Text>
            <Text style={styles.emptyText}>Load demo data to get started</Text>
            <TouchableOpacity style={styles.demoButton} onPress={handleLoadMockData}>
              <Text style={styles.demoButtonText}>Load Demo Data</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Vehicle Image — specific to vehicle type */}
            {vehicle && (() => {
              const vtype = detectVehicleType(vehicle);
              const cfg   = getVehicleConfig(vtype);
              return (
                <View style={styles.vehicleImageContainer}>
                  <Image
                    source={{ uri: cfg.image_url }}
                    style={styles.vehicleImage}
                    resizeMode="contain"
                  />
                  <View style={styles.vehicleBadge}>
                    <Text style={styles.vehicleBadgeText}>{vehicle.model}</Text>
                    <Text style={styles.vehicleBadgeSub}>{cfg.city} · {vehicle.registration_number}</Text>
                  </View>
                </View>
              );
            })()}

            {/* Last Ride Info */}
            {lastRide && (
              <View style={styles.rideCard}>
                <View style={styles.rideHeader}>
                  <Text style={styles.rideTitle}>Your Last Ride</Text>
                  <Text style={styles.rideTime}>{getTimeSinceRide()}</Text>
                </View>
                <View style={styles.rideDetails}>
                  <View style={styles.rideDate}>
                    <Text style={styles.rideDateText}>{lastRide.date}</Text>
                  </View>
                  <View style={styles.rideDistance}>
                    <Text style={styles.rideDistanceValue}>{lastRide.distance} Km</Text>
                  </View>
                </View>
                <View style={styles.rideLocation}>
                  <Ionicons name="bicycle" size={16} color="#94A3B8" />
                  <Text style={styles.rideLocationText}>{vehicle?.registration_number || 'N/A'}</Text>
                </View>
                <View style={styles.rideLocation}>
                  <Ionicons name="time" size={16} color="#94A3B8" />
                  <Text style={styles.rideLocationText}>
                    {lastRide.start_time} - {lastRide.end_time}
                  </Text>
                </View>
                <View style={styles.rideLocation}>
                  <Ionicons name="hourglass" size={16} color="#94A3B8" />
                  <Text style={styles.rideLocationText}>{lastRide.duration} Min</Text>
                </View>
                <View style={styles.rideRoute}>
                  <View style={styles.routePoint}>
                    <View style={styles.greenDot} />
                    <Text style={styles.routeText} numberOfLines={2}>{lastRide.start_location}</Text>
                  </View>
                  <View style={styles.routeDivider} />
                  <View style={styles.routePoint}>
                    <View style={styles.redDot} />
                    <Text style={styles.routeText} numberOfLines={2}>{lastRide.end_location}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* FL Status Card */}
            <View style={styles.flCard}>
              <View style={styles.flHeader}>
                <Ionicons name="hardware-chip" size={20} color="#3B82F6" />
                <Text style={styles.flTitle}>Federated Learning</Text>
                {flStats?.stats?.total_uploads > 0 && (
                  <View style={styles.flLiveBadge}>
                    <Text style={styles.flLiveText}>● LIVE</Text>
                  </View>
                )}
              </View>

              <View style={styles.flRow}>
                <View style={styles.flStat}>
                  <Text style={styles.flStatLabel}>Global Round</Text>
                  <Text style={styles.flStatValue}>
                    {flStats?.stats?.latest_round ?? '—'}
                  </Text>
                </View>
                <View style={styles.flStat}>
                  <Text style={styles.flStatLabel}>Uploads</Text>
                  <Text style={styles.flStatValue}>
                    {flStats?.stats?.total_uploads ?? '—'}
                  </Text>
                </View>
                <View style={styles.flStat}>
                  <Text style={styles.flStatLabel}>Global Accuracy</Text>
                  <Text style={[styles.flStatValue, { color: '#10B981' }]}>
                    {flStats?.stats?.latest_accuracy
                      ? `${(flStats.stats.latest_accuracy * 100).toFixed(1)}%`
                      : '—'}
                  </Text>
                </View>
              </View>

              {localModel ? (
                <View style={styles.flContribRow}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={styles.flContribText}>
                    You contributed — local accuracy{' '}
                    {(localModel.accuracy * 100).toFixed(1)}%
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.flTrainBtn}
                  onPress={() => router.push('/(tabs)/predictions')}
                >
                  <Ionicons name="flash" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.flTrainBtnText}>Train to Contribute</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Parking Record */}
            {parking && (
              <View style={styles.mapCard}>
                <Text style={styles.mapTitle}>Last Known Parking Record</Text>
                <View style={styles.webMapPlaceholder}>
                  <Ionicons name="location" size={48} color="#3B82F6" />
                  <Text style={styles.locationText}>{parking.location}</Text>
                  <Text style={styles.coordinatesText}>
                    {parking.latitude.toFixed(4)}, {parking.longitude.toFixed(4)}
                  </Text>
                  <TouchableOpacity 
                    style={styles.mapButton}
                    onPress={() => {
                      const url = `https://www.google.com/maps?q=${parking.latitude},${parking.longitude}`;
                      Linking.openURL(url);
                    }}
                  >
                    <Ionicons name="map" size={20} color="#FFFFFF" />
                    <Text style={styles.mapButtonText}>View on Map</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
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
  headerIcons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 4,
  },
  vehicleTabs: {
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingVertical: 8,
  },
  tabsContainer: {
    paddingHorizontal: 12,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#334155',
    borderWidth: 1,
    borderColor: '#475569',
  },
  tabActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: width * 0.75,
    backgroundColor: '#1E293B',
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  drawerHeader: {
    backgroundColor: '#334155',
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  profileSection: {
    alignItems: 'center',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 12,
  },
  editProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editProfileText: {
    fontSize: 14,
    color: '#3B82F6',
  },
  drawerMenu: {
    flex: 1,
    paddingTop: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 16,
  },
  menuItemText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
  drawerFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  footerButtonText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  content: {
    flex: 1,
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
    marginBottom: 24,
  },
  demoButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  demoButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  vehicleImageContainer: {
    width: '100%',
    height: 240,
    backgroundColor: '#1E293B',
  },
  vehicleImage: {
    width: '100%',
    height: '100%',
  },
  vehicleBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15,23,42,0.75)',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  vehicleBadgeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  vehicleBadgeSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  rideCard: {
    backgroundColor: '#1E293B',
    margin: 16,
    padding: 20,
    borderRadius: 16,
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  rideTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  rideTime: {
    fontSize: 14,
    color: '#64748B',
  },
  rideDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  rideDate: {
    flex: 1,
  },
  rideDateText: {
    fontSize: 16,
    color: '#94A3B8',
  },
  rideDistance: {
    alignItems: 'flex-end',
  },
  rideDistanceValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  rideLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  rideLocationText: {
    fontSize: 14,
    color: '#94A3B8',
    flex: 1,
  },
  rideRoute: {
    marginTop: 16,
    gap: 4,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  greenDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
  },
  redDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
  },
  routeDivider: {
    width: 2,
    height: 16,
    backgroundColor: '#334155',
    marginLeft: 5,
  },
  routeText: {
    fontSize: 14,
    color: '#94A3B8',
    flex: 1,
  },
  flCard:        { backgroundColor: '#1E293B', margin: 16, marginTop: 0, padding: 16, borderRadius: 16 },
  flHeader:      { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 },
  flTitle:       { fontSize: 15, fontWeight: 'bold', color: '#FFFFFF', flex: 1 },
  flLiveBadge:   { backgroundColor: '#064E3B', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  flLiveText:    { color: '#10B981', fontSize: 10, fontWeight: '700' },
  flRow:         { flexDirection: 'row', gap: 8, marginBottom: 14 },
  flStat:        { flex: 1, backgroundColor: '#0F172A', borderRadius: 10, padding: 10, alignItems: 'center' },
  flStatLabel:   { fontSize: 10, color: '#64748B', marginBottom: 4, textAlign: 'center' },
  flStatValue:   { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
  flContribRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  flContribText: { color: '#10B981', fontSize: 13 },
  flTrainBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                   backgroundColor: '#3B82F6', borderRadius: 10, paddingVertical: 10 },
  flTrainBtnText:{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  mapCard: {
    backgroundColor: '#1E293B',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 16,
  },
  mapTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  mapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  marker: {
    backgroundColor: '#EF4444',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webMapPlaceholder: {
    height: 200,
    backgroundColor: '#334155',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  locationText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginTop: 12,
    textAlign: 'center',
  },
  coordinatesText: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
  },
  mapNote: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 16,
    fontStyle: 'italic',
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  mapButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});