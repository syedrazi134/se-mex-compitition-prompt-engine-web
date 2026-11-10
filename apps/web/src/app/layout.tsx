import type { Metadata } from 'next';
import { AppShell } from '@/components/app-shell';
import { AuthProvider } from '@/lib/auth-context';
import { ThemeProvider } from '@/lib/theme-context';
import './globals.css';
import './marketplace-ui.css';

export const metadata: Metadata = {
  title: {
    default: 'Prompt Engine — Find the prompt behind the picture',
    template: '%s · Prompt Engine',
  },
  description: 'Discover, buy, create, and manage AI prompts from trusted creators.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="light">
      <body>
        <ThemeProvider>
          <AuthProvider>
            <AppShell>{children}</AppShell>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
