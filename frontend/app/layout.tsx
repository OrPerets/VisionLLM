export const metadata = {
  title: "VisionBI Assistant",
  description: "In-house AI assistant",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}


