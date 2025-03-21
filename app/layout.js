import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from './components/AuthContext';
import NavBar from './components/NavBar';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Villa c21 - Daily Villa & Pool Rental",
  description: "Management system for daily villa and pool rentals",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-white text-black`}>
        <AuthProvider>
          <Toaster position="top-right" />
          <NavBar />
          <main className="container mx-auto px-4 py-8 bg-white text-black">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
