import { lazy, Suspense } from 'react'
import Layout, { useRoutePath } from './components/layout/Layout.jsx'
import CorePage from './pages/CorePage.jsx'
import DevelopersPage from './pages/DevelopersPage.jsx'
import DocsPage from './pages/DocsPage.jsx'
import EcosystemPage from './pages/EcosystemPage.jsx'
import ExplorerPage from './pages/ExplorerPage.jsx'
import FaqPage from './pages/FaqPage.jsx'
import HomePage from './pages/HomePage.jsx'
import MiningPage from './pages/MiningPage.jsx'
import NetworkPage from './pages/NetworkPage.jsx'
import PassportPage from './pages/PassportPage.jsx'
import ProtocolPage from './pages/ProtocolPage.jsx'
import RoadmapPage from './pages/RoadmapPage.jsx'
import StatusPage from './pages/StatusPage.jsx'
import TokenomicsPage from './pages/TokenomicsPage.jsx'
import WalletPage from './pages/WalletPage.jsx'
import WhitepaperPage from './pages/WhitepaperPage.jsx'

const AdminApp = lazy(() => import('./admin/AdminApp.jsx'))

const pages = {
  '/': <HomePage />,
  '/core': <CorePage />,
  '/mining': <MiningPage />,
  '/wallet': <WalletPage />,
  '/explorer': <ExplorerPage />,
  '/developers': <DevelopersPage />,
  '/tokenomics': <TokenomicsPage />,
  '/faq': <FaqPage />,
  '/network': <NetworkPage />,
  '/protocol': <ProtocolPage />,
  '/passport': <PassportPage />,
  '/ecosystem': <EcosystemPage />,
  '/whitepaper': <WhitepaperPage />,
  '/roadmap': <RoadmapPage />,
  '/status': <StatusPage />,
}

export default function App() {
  const path = useRoutePath()
  if (path === '/admin' || path.startsWith('/admin/')) {
    return (
      <Suspense fallback={<div className="grid min-h-screen place-items-center bg-void text-frost">Loading admin...</div>}>
        <AdminApp path={path} />
      </Suspense>
    )
  }

  const page = path === '/docs' || path.startsWith('/docs/')
    ? <DocsPage path={path} />
    : pages[path] || <HomePage />

  return <Layout path={path}>{page}</Layout>
}
