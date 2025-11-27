# QR Code Libraries Documentation

This document lists the libraries and tools used for QR code generation and scanning in the PawSafety application.

## QR Code Generation

### Library
- **Name**: `react-native-qrcode-svg`
- **Version**: `^6.3.15`
- **Description**: A React Native library for generating QR codes using SVG

### Usage
- Used in `MyPetsScreen.js` to display QR codes for registered pets
- Used in `RegisterPetScreen.js` for pet registration flow
- Generates QR codes containing pet identification information

### Additional Dependencies
- **`react-native-view-shot`** (`^4.0.3`): Used to capture and save QR codes as images to the device gallery
- **`react-native-svg`** (`^15.12.0`): Required dependency for SVG rendering

### Implementation Details
- QR codes are generated using the `QRCode` component from `react-native-qrcode-svg`
- QR data includes pet identification information formatted as human-readable text
- QR codes can be downloaded/saved to the device gallery using `react-native-view-shot`

---

## QR Code Scanning

### Library
- **Name**: `expo-camera`
- **Version**: `^16.1.10`
- **Description**: Expo's camera module with built-in barcode scanning capabilities

### Usage
- Implemented in `ScanScreen.js` for scanning pet QR codes and ID tags
- Uses the `CameraView` component with barcode scanning enabled

### Features
- **Barcode Types Supported**:
  - QR codes (`qr`)
  - PDF417
  - Aztec
  - Code128, Code39, Code93
  - Codabar
  - DataMatrix
  - EAN13, EAN8
  - ITF14
  - UPC-A, UPC-E

- **Additional Features**:
  - Camera permission handling
  - Flash/torch support
  - Scan cooldown to prevent duplicate scans
  - Visual scanning frame with corner indicators
  - Real-time barcode detection

### Implementation Details
- Uses `onBarcodeScanned` callback to handle scanned QR codes
- Implements debouncing to prevent multiple scans of the same code
- Automatically detects pet IDs and QR codes
- Provides options to contact owner or view pet details after scanning

---

## Installation

These libraries are already included in the project's `package.json`. To install:

```bash
npm install
```

Or if using yarn:

```bash
yarn install
```

## Dependencies Summary

| Library | Version | Purpose |
|---------|---------|---------|
| `react-native-qrcode-svg` | ^6.3.15 | QR code generation |
| `react-native-view-shot` | ^4.0.3 | QR code image capture |
| `react-native-svg` | ^15.12.0 | SVG rendering (required) |
| `expo-camera` | ^16.1.10 | QR code scanning |

---

## Files Using QR Code Functionality

### QR Code Generation
- `Pawsafety/screens/MyPetsScreen.js`
- `Pawsafety/screens/RegisterPetScreen.js`

### QR Code Scanning
- `Pawsafety/screens/tabs/ScanScreen.js`

---

## Notes

- Both libraries are React Native/Expo compatible
- QR codes are only available for registered pets that have been approved
- The scanning feature requires camera permissions to function
- QR codes contain pet identification data that can be used to reunite lost pets with their owners

