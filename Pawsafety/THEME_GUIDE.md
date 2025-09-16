# PawSafety Theme Guide

## Color Palette

The PawSafety app uses a modern, pet-friendly color palette:

### Primary Colors
- **Light Blue** (`#D9EFF7`) - Background and soft elements
- **Medium Blue** (`#9BBBFC`) - Secondary elements and highlights  
- **Dark Purple** (`#4741A6`) - Primary text, buttons, and navigation
- **Golden Yellow** (`#F9CE69`) - Accent color for special elements

### Color Usage

#### Light Blue (#D9EFF7)
- Main background color
- Creates a calm, soothing atmosphere
- Used for screen backgrounds

#### Medium Blue (#9BBBFC)
- Input field borders
- Secondary text elements
- User email display

#### Dark Purple (#4741A6)
- Primary buttons (Login)
- Main text and headings
- Navigation header
- App name and titles

#### Golden Yellow (#F9CE69)
- Sign Up button background
- Link text on Sign Up screen
- Accent elements and highlights

## Typography

### Font Family
- **Primary**: SF Pro Display (iOS native)
- **Fallback**: System font (Android/Web)

### Font Weights
- Light: 300
- Regular: 400
- Medium: 500
- Semi Bold: 600
- Bold: 700
- Heavy: 800

### Font Sizes
- Small: 14px
- Medium: 16px
- Large: 18px
- XLarge: 20px
- XXLarge: 24px
- XXXLarge: 28px
- Title: 32px
- Logo: 50px
- Big Logo: 80px

## Implementation

All theme constants are defined in `constants/theme.js` and imported throughout the app:

```javascript
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
```

## Design Principles

1. **Accessibility**: High contrast ratios for readability
2. **Consistency**: Unified spacing and styling across all screens
3. **Modern**: Clean, minimal design with subtle shadows
4. **Pet-Friendly**: Warm, welcoming colors that reflect pet care
5. **Professional**: Trustworthy appearance for a safety app

## Screen-Specific Styling

### Authentication Screens (Login/SignUp)
- Light blue background for calmness
- White cards with subtle shadows
- Dark purple primary buttons
- Golden accent for secondary actions

### Home Screen
- Consistent background and card styling
- Information cards with subtle shadows
- Red logout button for clear action distinction

### Navigation
- Dark purple header for brand consistency
- White text for contrast
- Clean, minimal design 