import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

const qrPattern = [
  [1,1,1,1,1,1,1,0,1,0,1],
  [1,0,0,0,0,0,1,0,1,0,0],
  [1,0,1,1,1,0,1,0,1,1,1],
  [1,0,1,0,1,0,1,0,0,0,1],
  [1,0,1,1,1,0,1,0,1,0,1],
  [1,0,0,0,0,0,1,0,1,0,0],
  [1,1,1,1,1,1,1,0,1,0,1],
  [0,0,0,1,0,0,0,1,0,0,0],
  [1,0,1,0,1,0,1,0,1,0,1],
  [0,1,0,1,0,1,0,1,0,1,0],
  [1,0,1,0,1,0,1,0,1,0,1],
];

const HomePage = () => {
  const router = useRouter();
  const scanLinePosition = useRef(new Animated.Value(0)).current;

  // Animate the scanning line
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLinePosition, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(scanLinePosition, {
          toValue: 0,
          duration: 0,
          useNativeDriver: false,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [scanLinePosition]);

  const handleSignIn = () => {
    console.log('Sign In pressed');
    // Navigate to sign in screen
  };

  const handleSignUp = () => {
    console.log('Sign Up pressed');
    // Navigate to sign up screen
  };

 const handleStartScanning = () => {
    router.push('/scanner' as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header with Solana Logo */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.solanaLabel}>Powered by</Text>
            <Text style={styles.solanaLogo}>◎ SOLANA</Text>
          </View>
        </View>

        {/* Main Title and Branding */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>SafeScan QR</Text>
          <Text style={styles.subtitle}>Secure QR Code Scanner</Text>
          <Text style={styles.description}>
            Scan QR codes safely with AI-powered verification. Protect yourself from malicious links.
          </Text>
        </View>

        {/* Auth Buttons */}
        <View style={styles.authRow}>
          <TouchableOpacity style={[styles.signInButtonAlt, styles.authButtonLeft]} onPress={handleSignIn} activeOpacity={0.8}>
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.signUpButtonAlt} onPress={handleSignUp} activeOpacity={0.8}>
            <Text style={styles.signUpButtonText}>Sign Up</Text>
          </TouchableOpacity>
        </View>

        {/* QR Code Animation Section */}
        <View style={styles.qrAnimationContainer}>
          {/* QR Code Pattern */}
          <View style={styles.qrCodeBox}>
            {/* Top-left corner */}
            <View style={[styles.qrCorner, styles.topLeft]} />
            {/* Top-right corner */}
            <View style={[styles.qrCorner, styles.topRight]} />
            {/* Bottom-left corner */}
            <View style={[styles.qrCorner, styles.bottomLeft]} />

            {/* QR code pattern grid */}
            <View style={styles.qrGrid}>
              {qrPattern.map((row, rowIndex) =>
                row.map((cell, colIndex) => (
                  <View
                    key={`${rowIndex}-${colIndex}`}
                    style={[
                      styles.qrModule,
                      cell ? styles.qrModuleDark : styles.qrModuleLight,
                    ]}
                  />
                ))
              )}
            </View>

            {/* Animated Scanning Line */}
            <Animated.View
              style={[
                styles.scanLine,
                {
                  transform: [
                    {
                      translateY: scanLinePosition.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 240],
                      }),
                    },
                  ],
                },
              ]}
            />
          </View>
        </View>

        {/* Feature Highlights */}
        <View style={styles.featuresSection}>
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Text style={styles.featureIconText}>✓</Text>
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Real-time Protection</Text>
              <Text style={styles.featureDescription}>AI verifies every QR code instantly</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Text style={styles.featureIconText}>✓</Text>
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Safe Browsing Check</Text>
              <Text style={styles.featureDescription}>Google Safe Browsing integration</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Text style={styles.featureIconText}>✓</Text>
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Solana Rewards</Text>
              <Text style={styles.featureDescription}>Earn rewards for safe scans</Text>
            </View>
          </View>
        </View>

        {/* CTA Buttons */}
        <View style={styles.buttonSection}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleStartScanning}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Start Scanning</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Your security is our priority</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    marginTop: 20,
    marginBottom: 30,
  },
  logoContainer: {
    alignItems: 'flex-start',
  },
  solanaLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 4,
  },
  solanaLogo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#14f195',
    letterSpacing: 1,
  },
  titleSection: {
    marginBottom: 40,
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
  },
  qrAnimationContainer: {
    alignItems: 'center',
    marginVertical: 40,
  },
  qrCodeBox: {
    width: 280,
    height: 280,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
    overflow: 'hidden',
  },
  qrCorner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderWidth: 3,
    borderColor: '#1e3a8a',
  },
  topLeft: {
    top: 10,
    left: 10,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 10,
    right: 10,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 10,
    left: 10,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  qrGrid: {
    width: 240,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 12,
  },
  qrModule: {
    width: 18,
    height: 18,
    margin: 1,
    borderRadius: 2,
  },
  qrModuleDark: {
    backgroundColor: '#0f172a',
  },
  qrModuleLight: {
    backgroundColor: '#e2e8f0',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#87ceeb',
    shadowColor: '#87ceeb',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
  featuresSection: {
    marginVertical: 30,
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#87ceeb',
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureIconText: {
    color: '#0284c7',
    fontSize: 18,
    fontWeight: 'bold',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 12,
    color: '#94a3b8',
  },
  authRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  authButtonLeft: {
    marginRight: 12,
  },
  buttonSection: {
    marginVertical: 20,
  },
  signInButtonAlt: {
    flex: 1,
    minWidth: 130,
    borderWidth: 2,
    borderColor: '#0284c7',
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  signUpButtonAlt: {
    flex: 1,
    minWidth: 130,
    backgroundColor: '#14f195',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#14f195',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButton: {
    backgroundColor: '#0284c7',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },

  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  authSection: {
    marginTop: 30,
  },
  authPrompt: {
    textAlign: 'center',
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
    fontWeight: '500',
  },
  signUpButton: {
    backgroundColor: '#14f195',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#14f195',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  signUpButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: 'bold',
  },
  signInButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#cbd5e1',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  signInButtonText: {
    color: '#1e293b',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    marginTop: 40,
    paddingVertical: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  footerText: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
});

export default HomePage;