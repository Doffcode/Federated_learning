import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BarChart } from 'react-native-gifted-charts';
import api from '../../services/api';

const SCREEN_WIDTH = Dimensions.get('window').width;
// card padding (20) × 2 + margin (16) × 2 = 72
const CHART_WIDTH = SCREEN_WIDTH - 72;

export default function Analytics() {
  const [summary, setSummary] = useState<any>(null);
  const [rides, setRides] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [summaryRes, ridesRes] = await Promise.all([
        api.get('/analytics/summary'),
        api.get('/rides'),
      ]);
      setSummary(summaryRes.data);
      setRides(ridesRes.data);
    } catch (error) {
      console.log('Error loading analytics:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getMonthlyData = () => {
    const monthlyDistance: { [key: string]: number } = {};
    
    rides.forEach(ride => {
      const month = ride.date.substring(0, 7); // YYYY-MM
      if (!monthlyDistance[month]) {
        monthlyDistance[month] = 0;
      }
      monthlyDistance[month] += ride.distance;
    });

    const sortedMonths = Object.keys(monthlyDistance).sort();
    const lastSixMonths = sortedMonths.slice(-6);

    return lastSixMonths.map(month => ({
      value: monthlyDistance[month],
      label: month.substring(5), // Just MM
      frontColor: '#3B82F6',
    }));
  };

  const barData = rides.length > 0 ? getMonthlyData() : [
    { value: 0, label: 'Jan', frontColor: '#3B82F6' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ANALYTICS</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
        }
      >
        {summary && (
          <>
            {/* Summary Cards */}
            <View style={styles.summaryGrid}>
              <View style={styles.summaryCard}>
                <Ionicons name="car-sport" size={32} color="#3B82F6" />
                <Text style={styles.summaryValue}>{summary.total_rides}</Text>
                <Text style={styles.summaryLabel}>Total Rides</Text>
              </View>

              <View style={styles.summaryCard}>
                <Ionicons name="navigate" size={32} color="#10B981" />
                <Text style={styles.summaryValue}>{summary.total_distance}</Text>
                <Text style={styles.summaryLabel}>Total Km</Text>
              </View>

              <View style={styles.summaryCard}>
                <Ionicons name="stats-chart" size={32} color="#F59E0B" />
                <Text style={styles.summaryValue}>{summary.average_distance}</Text>
                <Text style={styles.summaryLabel}>Avg Km/Ride</Text>
              </View>

              <View style={styles.summaryCard}>
                <Ionicons name="bicycle" size={32} color="#8B5CF6" />
                <Text style={styles.summaryValue}>{summary.total_vehicles}</Text>
                <Text style={styles.summaryLabel}>Vehicles</Text>
              </View>
            </View>

            {/* Monthly Distance Chart */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Monthly Distance (Km)</Text>
              <View style={styles.chartContainer}>
                <BarChart
                  data={barData}
                  width={CHART_WIDTH}
                  height={200}
                  barWidth={32}
                  spacing={24}
                  roundedTop
                  xAxisThickness={1}
                  yAxisThickness={1}
                  xAxisColor="#334155"
                  yAxisColor="#334155"
                  yAxisTextStyle={{ color: '#94A3B8', fontSize: 12 }}
                  xAxisLabelTextStyle={{ color: '#94A3B8', fontSize: 12 }}
                  noOfSections={4}
                  maxValue={Math.max(...barData.map(d => d.value)) * 1.2 || 100}
                />
              </View>
            </View>

            {/* Battery Health */}
            <View style={styles.healthCard}>
              <View style={styles.healthHeader}>
                <Ionicons name="battery-charging" size={32} color="#10B981" />
                <View style={styles.healthInfo}>
                  <Text style={styles.healthTitle}>Average Battery Health</Text>
                  <Text style={styles.healthValue}>{summary.average_battery_health}%</Text>
                </View>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${summary.average_battery_health}%` }]} />
              </View>
            </View>

            {/* Recent Rides */}
            <View style={styles.ridesSection}>
              <Text style={styles.sectionTitle}>Recent Rides</Text>
              {rides.slice(0, 5).map((ride, index) => (
                <View key={index} style={styles.rideItem}>
                  <View style={styles.rideIcon}>
                    <Ionicons name="navigate" size={20} color="#3B82F6" />
                  </View>
                  <View style={styles.rideInfo}>
                    <Text style={styles.rideDate}>{ride.date}</Text>
                    <Text style={styles.rideLocation} numberOfLines={1}>
                      {ride.start_location} → {ride.end_location}
                    </Text>
                  </View>
                  <View style={styles.rideStats}>
                    <Text style={styles.rideDistance}>{ride.distance} km</Text>
                    <Text style={styles.rideDuration}>{ride.duration} min</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {!summary && (
          <View style={styles.emptyState}>
            <Ionicons name="analytics-outline" size={80} color="#64748B" />
            <Text style={styles.emptyTitle}>No Analytics Data</Text>
            <Text style={styles.emptyText}>Start tracking rides to see analytics</Text>
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
  header: {
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#1E293B',
    alignItems: 'center',
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
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  summaryCard: {
    width: (SCREEN_WIDTH - 44) / 2,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 12,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#94A3B8',
  },
  chartCard: {
    backgroundColor: '#1E293B',
    margin: 16,
    padding: 20,
    borderRadius: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  chartContainer: {
    alignItems: 'center',
  },
  healthCard: {
    backgroundColor: '#1E293B',
    margin: 16,
    marginTop: 0,
    padding: 20,
    borderRadius: 16,
  },
  healthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  healthInfo: {
    marginLeft: 16,
    flex: 1,
  },
  healthTitle: {
    fontSize: 16,
    color: '#94A3B8',
    marginBottom: 4,
  },
  healthValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10B981',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#334155',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  ridesSection: {
    margin: 16,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  rideItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  rideIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rideInfo: {
    flex: 1,
  },
  rideDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  rideLocation: {
    fontSize: 12,
    color: '#94A3B8',
  },
  rideStats: {
    alignItems: 'flex-end',
  },
  rideDistance: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginBottom: 2,
  },
  rideDuration: {
    fontSize: 12,
    color: '#64748B',
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