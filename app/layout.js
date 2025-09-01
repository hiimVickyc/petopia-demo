import 'react-datepicker/dist/react-datepicker.css'
import 'react-toastify/dist/ReactToastify.css'
import '@/styles/globals.css'
import { Providers } from './providers'

import AppShell from './AppShell'

export const metadata = {
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant" data-theme="light" className="scroll-smooth">
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  )
}
