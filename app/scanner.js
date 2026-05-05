// SafeScanQRApp/src/screens/ScannerScreen.js
import React from 'react';
import { SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const ScannerScreen = () => {
  const [email, setEmail] = React.useState('');
  const [urlInput, setUrlInput] = React.useState('');

  const handleSubmit = () => {
    console.log('Form submitted');
  };

  return (
    <SafeAreaView style={styles.pageShell}>
      {/* Top Auth Section */}
      <View style={styles.topAuth}>
        <TouchableOpacity style={styles.topActionButton} onPress={() => console.log('Referral link pressed')}>
          <Text>Referral link</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.topActionButton} onPress={() => console.log('Connect wallet pressed')}>
          <Text>Connect wallet</Text>
        </TouchableOpacity>
        {/* Google Sign-In Section */}
        <View style={styles.googleSigninWrap}>
          <TouchableOpacity style={styles.googleVisualButton}>
            <Text>Sign in with Google</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Hero Section */}
      <View style={styles.hero}>
        <View style={styles.heroCopy}>
          <View style={styles.heroKicker}>
            <Text style={styles.eyebrow}>Hackabull Demo</Text>
            <View style={styles.poweredBySolana}>
              <Text>Powered By</Text>
              {/* SVG Placeholder */}
              <View style={styles.solanaGradientTop} />
            </View>
          </View>
          <Text style={styles.heroTitle}>SafeScan QR</Text>
          <Text style={styles.heroProblem}>Can you distinguish a malicious QR?</Text>
          <Text style={styles.heroText}>Check QR destinations with AI before anything runs.</Text>
          <View style={styles.heroActions}>
            <TouchableOpacity style={styles.primaryButton} onPress={() => console.log('Scan QR pressed')}>
              <Text>Scan QR</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => console.log('Airdrop pressed')}>
              <Text>Airdrop</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.heroCard}>
          <Text style={styles.heroCardLabel}>Demo focus</Text>
          <View style={styles.demoFocusList}>
            <Text>Decodes QR directly via Python ZBar</Text>
            <Text>Real-time Google Safe Browsing API</Text>
            <Text>Tracks scan progress for airdrop tiers</Text>
          </View>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.main}>
        <View style={styles.scannerPanel}>
          <View style={styles.panelHeader}>
            <Text style={styles.eyebrow}>Interactive demo</Text>
            <Text style={styles.headerTitle}>Analyze Payload</Text>
          </View>
          <View style={styles.scannerGrid}>
            <View style={styles.scannerCard}>
              <TextInput
                placeholder="hidden"
                value={email}
                onChangeText={() => {}}
                editable={false}
                selectTextOnFocus={false}
                style={styles.hiddenWalletInput}
              />
              <TouchableOpacity onPress={() => console.log('Use mobile camera/photo pressed')}>
                <Text>Use mobile camera/photo</Text>
              </TouchableOpacity>
              <TextInput
                placeholder="https://example.com"
                value={urlInput}
                onChangeText={setUrlInput}
                style={styles.urlInput}
              />
              <TouchableOpacity onPress={handleSubmit} style={styles.submitButton}>
                <Text>Analyze Payload</Text>
              </TouchableOpacity>
            </View>
            {/* Visual Card Placeholder */}
            <View style={styles.visualCard}>
              <View style={styles.qrFrame}>
                <View style={styles.qrGrid}>
                  {[...Array(6)].map((_, index) => (
                    <View key={index} style={styles.qrSpan} />
                  ))}
                </View>
                <View style={styles.scanLine} />
              </View>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  pageShell: {
    flex: 1,
    backgroundColor: '#fff',
  },
  topAuth: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: 20,
  },
  topActionButton: {
    width: '45%',
    height: 44,
    borderRadius: 12,
    backgroundColor: '#05070b',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#f8fafc',
    fontSize: 16,
  },
  googleSigninWrap: {
    position: 'relative',
    display: 'flex',
    width: 240,
    height: 44,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#05070b',
  },
  googleVisualButton: {
    position: 'absolute',
    inset: 0,
    zIndex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    border: '1px solid rgba(255, 255, 255, 0.18)',
    backgroundColor: '#05070b',
    color: '#f8fafc',
    fontFamily: 'Roboto',
    pointerEvents: 'none',
  },
  hero: {
    padding: 20,
  },
  heroCopy: {
    flex: 1,
  },
  heroKicker: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyebrow: {
    fontSize: 14,
    color: '#55A6F8',
  },
  poweredBySolana: {
    marginLeft: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  solanaGradientTop: {
    width: 20,
    height: 20,
    backgroundColor: '#14F195',
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  heroProblem: {
    fontSize: 16,
    color: '#777',
  },
  heroText: {
    fontSize: 14,
    color: '#555',
  },
  heroActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  primaryButton: {
    width: '45%',
    height: 44,
    borderRadius: 12,
    backgroundColor: '#55A6F8',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: 16,
  },
  secondaryButton: {
    width: '45%',
    height: 44,
    borderRadius: 12,
    backgroundColor: '#9945FF',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: 16,
  },
  heroCard: {
    padding: 20,
    marginTop: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
  },
  heroCardLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  demoFocusList: {
    flexDirection: 'column',
  },
  main: {
    flex: 1,
    padding: 20,
  },
  scannerPanel: {
    flex: 1,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  scannerGrid: {
    flexDirection: 'row',
    gap: 20,
  },
  scannerCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 20,
    borderRadius: 12,
  },
  hiddenWalletInput: {
    placeholderTextColor: '#aaa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  urlInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  submitButton: {
    height: 44,
    backgroundColor: '#55A6F8',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: 16,
    borderRadius: 5,
  },
  visualCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 20,
    borderRadius: 12,
  },
  qrFrame: {
    position: 'relative',
    width: '100%',
    height: 300,
    overflow: 'hidden',
    backgroundColor: '#ddd',
  },
  qrGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  qrSpan: {
    width: '16.67%',
    aspectRatio: 1,
    backgroundColor: '#ccc',
  },
  scanLine: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#55A6F8',
  },
});

export default ScannerScreen;