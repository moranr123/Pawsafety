import { registerRootComponent } from 'expo';
import { AppRegistry } from 'react-native';
import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately

try {
  registerRootComponent(App);
} catch (error) {
  console.error("Root component registration failed:", error);
  // Fallback to standard registration if Expo's wrapper fails
  AppRegistry.registerComponent('main', () => App);
}
