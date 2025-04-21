import "./globals.css";

export const metadata = {
  title: "LectureLite",
  description: "LectureLite - Simplified Lecture Management",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}