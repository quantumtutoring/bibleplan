// pages/_app.js
import '../styles/globals.css';
import { UserDataProvider } from '../contexts/ListenFireStore';
import { SettingsProvider } from '../contexts/SettingsContext';

function MyApp({ Component, pageProps }) {
  return (
    <UserDataProvider>
      <SettingsProvider>
        <Component {...pageProps} />
      </SettingsProvider>
    </UserDataProvider>
  );
}

export default MyApp;
