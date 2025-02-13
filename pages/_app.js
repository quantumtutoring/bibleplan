// pages/_app.js
import '../styles/globals.css';
import { UserDataProvider } from '../contexts/ListenFireStore';

function MyApp({ Component, pageProps }) {
  return (
    <UserDataProvider>
      <Component {...pageProps} />
    </UserDataProvider>
  );
}

export default MyApp;
