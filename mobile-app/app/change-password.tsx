import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'expo-router';

export default function ChangePassword() {
  const { changePassword } = useAuth();
  const router = useRouter();
  const [oldPassword, setOldPassword]       = useState('');
  const [newPassword, setNewPassword]       = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading]               = useState(false);
  const [showOld, setShowOld]               = useState(false);
  const [showNew, setShowNew]               = useState(false);
  const [showConfirm, setShowConfirm]       = useState(false);

  const handleSubmit = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await changePassword(oldPassword, newPassword);
      Alert.alert('Success', 'Password changed successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Failed', error.message || 'Could not change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CHANGE PASSWORD</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.iconSection}>
          <Ionicons name="lock-closed" size={60} color="#3B82F6" />
          <Text style={styles.subtitle}>Enter your current password and choose a new one</Text>
        </View>

        {/* Old Password */}
        <Text style={styles.label}>Current Password</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color="#64748B" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Current password"
            placeholderTextColor="#64748B"
            value={oldPassword}
            onChangeText={setOldPassword}
            secureTextEntry={!showOld}
          />
          <TouchableOpacity onPress={() => setShowOld(v => !v)}>
            <Ionicons name={showOld ? 'eye-off' : 'eye'} size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* New Password */}
        <Text style={styles.label}>New Password</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="key-outline" size={20} color="#64748B" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="New password (min 6 chars)"
            placeholderTextColor="#64748B"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showNew}
          />
          <TouchableOpacity onPress={() => setShowNew(v => !v)}>
            <Ionicons name={showNew ? 'eye-off' : 'eye'} size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Confirm New Password */}
        <Text style={styles.label}>Confirm New Password</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="checkmark-circle-outline" size={20} color="#64748B" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Confirm new password"
            placeholderTextColor="#64748B"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirm}
          />
          <TouchableOpacity onPress={() => setShowConfirm(v => !v)}>
            <Ionicons name={showConfirm ? 'eye-off' : 'eye'} size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Changing...' : 'Change Password'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#0F172A' },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    paddingHorizontal: 16, paddingTop: 50, paddingBottom: 16, backgroundColor: '#1E293B' },
  backButton:     { padding: 8 },
  headerTitle:    { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', letterSpacing: 1 },
  placeholder:    { width: 40 },
  scrollContent:  { padding: 24 },
  iconSection:    { alignItems: 'center', marginBottom: 32 },
  subtitle:       { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginTop: 12, lineHeight: 20 },
  label:          { fontSize: 14, fontWeight: '600', color: '#94A3B8', marginBottom: 8, marginTop: 16 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B',
                    borderRadius: 12, paddingHorizontal: 16 },
  inputIcon:      { marginRight: 12 },
  input:          { flex: 1, height: 56, color: '#FFFFFF', fontSize: 16 },
  button:         { backgroundColor: '#3B82F6', borderRadius: 12, height: 56,
                    justifyContent: 'center', alignItems: 'center', marginTop: 32 },
  buttonDisabled: { opacity: 0.6 },
  buttonText:     { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
});
