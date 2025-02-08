// pages/_app.js
import '../styles/globals.css';
import { UserDataProvider } from '../contexts/UserDataContext';

function MyApp({ Component, pageProps }) {
  return (
    <UserDataProvider>
      <Component {...pageProps} />
    </UserDataProvider>
  );
}

export default MyApp;
