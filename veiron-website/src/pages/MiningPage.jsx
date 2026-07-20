import { Gauge, Pickaxe, RadioTower, ShieldCheck, Timer, WalletCards } from 'lucide-react'
import { motion } from 'framer-motion'
import { FeatureCard, PageHero, SectionHeader } from '../components/ui/PageShell.jsx'
import MainnetCandidateBadge from '../components/ui/MainnetCandidateBadge.jsx'
import VisualPanel from '../components/ui/VisualPanel.jsx'
import { useContent } from '../hooks/useContent.js'
import { useNetworkStats } from '../hooks/useNetwork.js'

export default function MiningPage() {
  const { content } = useContent('mining')
  const { stats, source } = useNetworkStats()
  const miningModules = content.miningModules || []
  const networkStats = [
    { label: 'Current height', value: stats.height >= 0 ? `#${stats.height}` : 'API offline' },
    { label: 'Block time', value: `${stats.blockTimeSeconds} sec` },
    { label: 'Current reward', value: `${stats.currentReward} VIRE` },
    { label: 'Halving countdown', value: `${stats.halvingCountdown} blocks` },
  ]
  const icons = [Pickaxe, RadioTower, WalletCards, Gauge, Timer, ShieldCheck]
  return (
    <>
      <PageHero
        eyebrow="Mining"
        title="CUDA-only FiroPoW mining for the candidate network."
        text="Solo and pool mining are implemented as Mainnet Candidate prototypes. Production pool, infrastructure and launch gates remain incomplete."
      >
        <MainnetCandidateBadge source={source} />
      </PageHero>
      <section className="px-5 py-20">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
          <VisualPanel variant="mining" kicker="Mining visual" title="CUDA hashpower, blocks, shares and candidate pool logic." />
          <div className="grid gap-3 sm:grid-cols-2">
            {networkStats.map((item) => (
              <div key={item.label} className="rounded-lg border border-line bg-white/[0.035] p-5">
                <div className="text-xs uppercase tracking-[0.22em] text-ionSoft/60">{item.label}</div>
                <div className="mt-2 text-2xl font-black text-white">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="px-5 py-20">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="Mining modules" title="Implemented search and accounting; production gates remain." text="CUDA parity, node validation and pool APIs exist. Hardware diversity, abuse testing, storage, payout signing and soak evidence remain." />
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} transition={{ staggerChildren: 0.08 }} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {miningModules.map(([title, text], index) => (
              <FeatureCard key={title} icon={icons[index]} eyebrow="Mining" title={title} text={text} />
            ))}
          </motion.div>
        </div>
      </section>
    </>
  )
}
