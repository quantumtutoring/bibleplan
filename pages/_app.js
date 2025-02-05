// pages/_app.js
// Import the global CSS styles for the entire application.
import "../styles/globals.css";

// MyApp serves as the custom App component for Next.js.
// It wraps every page in the application, allowing global CSS and context providers.
export default function MyApp({ Component, pageProps }) {
  // Render the page component with its props.
  return <Component {...pageProps} />;
}
