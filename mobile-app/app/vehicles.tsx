import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../services/api';

export default function Vehicles() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [model, setModel] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [batteryCapacity, setBatteryCapacity] = useState('');
  const [vehicleImage, setVehicleImage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      const response = await api.get('/vehicles');
      setVehicles(response.data);
    } catch (error) {
      console.log('Error loading vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setVehicleImage(base64Image);
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to pick image: ' + error.message);
    }
  };

  const handleAddVehicle = async () => {
    if (!name.trim() || !model.trim() || !registrationNumber.trim() || !batteryCapacity.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      await api.post('/vehicles', {
        name: name.trim(),
        model: model.trim(),
        registration_number: registrationNumber.trim().toUpperCase(),
        battery_capacity: parseInt(batteryCapacity),
        vehicle_image: vehicleImage || null,
      });

      Alert.alert('Success', 'Vehicle added successfully!');
      setModalVisible(false);
      resetForm();
      loadVehicles();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to add vehicle');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setName('');
    setModel('');
    setRegistrationNumber('');
    setBatteryCapacity('');
    setVehicleImage('');
  };

  const handleDeleteVehicle = (vehicleId: string, vehicleName: string) => {
    Alert.alert(
      'Delete Vehicle',
      `Are you sure you want to delete ${vehicleName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/vehicles/${vehicleId}`);
              Alert.alert('Success', 'Vehicle deleted');
              loadVehicles();
            } catch (error: any) {
              Alert.alert('Error', 'Failed to delete vehicle');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Vehicles</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <Text style={styles.emptyText}>Loading...</Text>
        ) : vehicles.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="bicycle-outline" size={80} color="#64748B" />
            <Text style={styles.emptyTitle}>No Vehicles</Text>
            <Text style={styles.emptyText}>Tap + to add your first vehicle</Text>
          </View>
        ) : (
          vehicles.map((vehicle) => (
            <View key={vehicle.id} style={styles.vehicleCard}>
              {vehicle.vehicle_image ? (
                <Image source={{ uri: vehicle.vehicle_image }} style={styles.vehicleImage} />
              ) : (
                <View style={styles.placeholderImage}>
                  <Ionicons name="bicycle" size={40} color="#64748B" />
                </View>
              )}
              <View style={styles.vehicleInfo}>
                <Text style={styles.vehicleName}>{vehicle.name}</Text>
                <Text style={styles.vehicleModel}>{vehicle.model}</Text>
                <Text style={styles.vehicleReg}>{vehicle.registration_number}</Text>
                <Text style={styles.vehicleBattery}>{vehicle.battery_capacity} kWh</Text>
              </View>
              <TouchableOpacity
                onPress={() => handleDeleteVehicle(vehicle.id, vehicle.name)}
                style={styles.deleteButton}
              >
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Vehicle</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.modalContent}>
            <TouchableOpacity onPress={pickImage} style={styles.imagePickerButton}>
              {vehicleImage ? (
                <Image source={{ uri: vehicleImage }} style={styles.selectedImage} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="camera" size={32} color="#64748B" />
                  <Text style={styles.imagePlaceholderText}>Tap to add vehicle photo</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.label}>Vehicle Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., My EV Bike"
              placeholderTextColor="#64748B"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>Model *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Yamaha FZ25"
              placeholderTextColor="#64748B"
              value={model}
              onChangeText={setModel}
            />

            <Text style={styles.label}>Registration Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., AP39JE5596"
              placeholderTextColor="#64748B"
              value={registrationNumber}
              onChangeText={setRegistrationNumber}
              autoCapitalize="characters"
            />

            <Text style={styles.label}>Battery Capacity (kWh) *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 50"
              placeholderTextColor="#64748B"
              value={batteryCapacity}
              onChangeText={setBatteryCapacity}
              keyboardType="numeric"
            />

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.buttonDisabled]}
              onPress={handleAddVehicle}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>
                {saving ? 'Adding...' : 'Add Vehicle'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
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
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  addButton: {
    padding: 8,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
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
    textAlign: 'center',
  },
  vehicleCard: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  vehicleImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  placeholderImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehicleInfo: {
    flex: 1,
    marginLeft: 16,
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  vehicleModel: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 2,
  },
  vehicleReg: {
    fontSize: 14,
    color: '#3B82F6',
    marginBottom: 2,
  },
  vehicleBattery: {
    fontSize: 12,
    color: '#64748B',
  },
  deleteButton: {
    padding: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#1E293B',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalContent: {
    flex: 1,
    padding: 24,
  },
  imagePickerButton: {
    marginBottom: 24,
  },
  selectedImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  imagePlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    height: 56,
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 32,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});