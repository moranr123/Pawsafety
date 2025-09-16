import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Dimensions
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

const ScanScreen = ({ navigation }) => {
  const { colors: COLORS } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [scannedData, setScannedData] = useState(null);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const cameraRef = useRef(null);
  const lastScannedData = useRef(null);
  const lastScanTime = useRef(0);
  const scanCooldown = 2000; // 2 seconds cooldown between scans

  // Auto-restart scanning when tab is focused
  useFocusEffect(
    React.useCallback(() => {
      setScanning(true);
      setScannedData(null);
      // Reset debouncing variables when screen is focused
      lastScannedData.current = null;
      lastScanTime.current = 0;
    }, [])
  );



  const handleBarCodeScanned = ({ type, data }) => {
    if (!scanning) return;
    
    const currentTime = Date.now();
    
    // Check if this is the same data as last scan and within cooldown period
    if (lastScannedData.current === data && (currentTime - lastScanTime.current) < scanCooldown) {
      return; // Ignore duplicate scans within cooldown period
    }
    
    // Update last scanned data and time
    lastScannedData.current = data;
    lastScanTime.current = currentTime;
    
    setScanning(false);
    setScannedData({ type, data });
    
    // Check if it's a pet ID or QR code
    if (data.includes('PET') || data.includes('pet') || type === 'org.iso.QRCode') {
      Alert.alert(
        'Pet ID Found!',
        `Scanned: ${data}\nType: ${type}\n\nFetching pet information...`,
        [
          { text: 'Contact Owner', onPress: () => handleContactOwner(data) },
          { text: 'View Details', onPress: () => handleViewDetails(data) },
          { text: 'Scan Again', onPress: () => restartScanning() },
          { text: 'Done', style: 'cancel' }
        ]
      );
    } else {
      Alert.alert(
        'Code Scanned',
        `Data: ${data}\nType: ${type}\n\nThis doesn't appear to be a pet ID. Try scanning a pet tag or QR code.`,
        [
          { text: 'Scan Again', onPress: () => restartScanning() },
          { text: 'Done', style: 'cancel' }
        ]
      );
    }
  };

  const handleContactOwner = (petId) => {
    Alert.alert('Contact Owner', `Contacting owner for pet ID: ${petId}\n\nThis would open contact options in a real app.`);
    restartScanning();
  };

  const handleViewDetails = (petId) => {
    Alert.alert('Pet Details', `Viewing details for pet ID: ${petId}\n\nThis would show pet profile in a real app.`);
    restartScanning();
  };

  const restartScanning = () => {
    setScanning(true);
    setScannedData(null);
    // Reset debouncing variables
    lastScannedData.current = null;
    lastScanTime.current = 0;
  };

  const toggleFlash = () => {
    setFlashEnabled(!flashEnabled);
  };

  // Create styles using current theme colors
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    header: {
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.md,
      paddingBottom: SPACING.sm,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    title: {
      fontSize: FONTS.sizes.xlarge,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text,
    },
    statusIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: COLORS.secondaryText,
      marginRight: SPACING.sm,
    },
    statusDotActive: {
      backgroundColor: COLORS.success,
    },
    statusText: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.medium,
      color: COLORS.text,
    },
    cameraContainer: {
      flex: 1,
      marginHorizontal: SPACING.md,
      marginBottom: SPACING.md,
      borderRadius: RADIUS.large,
      overflow: 'hidden',
      ...SHADOWS.heavy,
    },
    camera: {
      flex: 1,
    },
    cameraOverlay: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    overlayTop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: SPACING.lg,
    },
    instructionText: {
      color: COLORS.white,
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      textAlign: 'center',
      backgroundColor: 'rgba(0,0,0,0.3)',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderRadius: RADIUS.medium,
    },
    scanningArea: {
      flex: 2,
      justifyContent: 'center',
      alignItems: 'center',
    },
    scanFrame: {
      width: 250,
      height: 250,
      position: 'relative',
    },
    overlayBottom: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center',
    },
    corner: {
      position: 'absolute',
      width: 20,
      height: 20,
      borderColor: COLORS.golden,
      borderWidth: 3,
    },
    topLeft: {
      top: -2,
      left: -2,
      borderRightWidth: 0,
      borderBottomWidth: 0,
      borderTopLeftRadius: RADIUS.large,
    },
    topRight: {
      top: -2,
      right: -2,
      borderLeftWidth: 0,
      borderBottomWidth: 0,
      borderTopRightRadius: RADIUS.large,
    },
    bottomLeft: {
      bottom: -2,
      left: -2,
      borderRightWidth: 0,
      borderTopWidth: 0,
      borderBottomLeftRadius: RADIUS.large,
    },
    bottomRight: {
      bottom: -2,
      right: -2,
      borderLeftWidth: 0,
      borderTopWidth: 0,
      borderBottomRightRadius: RADIUS.large,
    },
    cameraControls: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
    },
    controlButton: {
      backgroundColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: SPACING.sm,
      paddingVertical: SPACING.sm,
      borderRadius: RADIUS.medium,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.3)',
      minWidth: 70,
    },
    controlButtonText: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: COLORS.white,
      fontWeight: FONTS.weights.bold,
      textAlign: 'center',
    },
    scanLineContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
    },
    scanLine: {
      width: '80%',
      height: 2,
      backgroundColor: COLORS.golden,
      opacity: 0.8,
    },
    permissionContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: SPACING.xl,
    },
    permissionIcon: {
      fontSize: 60,
      marginBottom: SPACING.lg,
    },
    permissionTitle: {
      fontSize: FONTS.sizes.xxxlarge,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text,
      textAlign: 'center',
      marginBottom: SPACING.md,
    },
    permissionText: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: SPACING.xl,
    },
    settingsButton: {
      backgroundColor: COLORS.darkPurple,
      paddingHorizontal: SPACING.xl,
      paddingVertical: SPACING.md,
      borderRadius: RADIUS.medium,
    },
    settingsButtonText: {
      color: COLORS.white,
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
    },
  }), [COLORS]);

  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionIcon}>📱</Text>
          <Text style={styles.permissionTitle}>Camera Permission</Text>
          <Text style={styles.permissionText}>Requesting camera access...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionIcon}>🚫</Text>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            PawSafety needs camera access to scan pet IDs and QR codes. Tap the button below to grant permission.
          </Text>
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={requestPermission}
          >
            <Text style={styles.settingsButtonText}>Grant Camera Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }



  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>📱 Pet Scanner</Text>
          <View style={styles.statusIndicator}>
            <View style={[styles.statusDot, scanning && styles.statusDotActive]} />
            <Text style={styles.statusText}>{scanning ? 'Scanning...' : 'Ready'}</Text>
          </View>
        </View>
      </View>

      {/* Real Camera Scanner */}
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
          enableTorch={flashEnabled}
          onBarcodeScanned={scanning ? handleBarCodeScanned : undefined}
          barcodeScannerSettings={{
            barcodeTypes: [
              'qr',
              'pdf417',
              'aztec',
              'code128',
              'code39',
              'code93',
              'codabar',
              'datamatrix',
              'ean13',
              'ean8',
              'itf14',
              'upc_a',
              'upc_e',
            ],
          }}
        >
          {/* Camera Overlay */}
          <View style={styles.cameraOverlay}>
            {/* Top gradient */}
            <View style={styles.overlayTop}>
              <Text style={styles.instructionText}>
                {scanning ? 'Point camera at pet ID tag or QR code' : 'Tap to scan again'}
              </Text>
            </View>

            {/* Center scanning area */}
            <View style={styles.scanningArea}>
              <View style={styles.scanFrame}>
                {/* Scan Frame Corners */}
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
                
                {scanning && (
                  <View style={styles.scanLineContainer}>
                    <View style={styles.scanLine} />
                  </View>
                )}
              </View>
            </View>

            {/* Bottom controls */}
            <View style={styles.overlayBottom}>
              <View style={styles.cameraControls}>
                <TouchableOpacity 
                  style={styles.controlButton} 
                  onPress={toggleFlash}
                >
                  <Text style={styles.controlButtonText}>
                    {flashEnabled ? '🔦' : '💡'} Flash
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </CameraView>
      </View>


    </SafeAreaView>
  );
};

export default ScanScreen; 