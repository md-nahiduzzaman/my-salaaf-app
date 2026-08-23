import './globals.css';

export const metadata = {
  title: 'Work Ledger',
  description: 'Daily check-in and task tracking ledger',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
