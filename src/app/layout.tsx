import type {Metadata} from 'next';
import { Manrope, Playfair_Display } from 'next/font/google';
import { Toaster } from "@/components/ui/toaster";
import './globals.css';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-body',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-headline',
});

export const metadata: Metadata = {
  title: 'Orange Hotel | Secure Booking',
  description: 'Book Standard and Platinum rooms online at Orange Hotel.',
  icons: {
    icon: '/logo.jpeg',
    shortcut: '/logo.jpeg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${manrope.variable} ${playfair.variable} font-body antialiased bg-background`} suppressHydrationWarning>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
