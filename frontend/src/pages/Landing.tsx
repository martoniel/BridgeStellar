import { Link } from "react-router-dom";
import {
  ArrowRight,
  Landmark,
  TrendingUp,
  Shield,
  Zap,
  Users,
  Coins,
  ArrowLeftRight,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { useWallet } from "@/hooks/useWallet";

const features = [
  {
    icon: Coins,
    title: "Tokenize",
    description:
      "Convert invoices into tradeable digital assets on the Stellar blockchain with full transparency.",
  },
  {
    icon: TrendingUp,
    title: "Trade",
    description:
      "Access a decentralized marketplace where invoices are funded and shares are traded peer-to-peer.",
  },
  {
    icon: ArrowLeftRight,
    title: "Settle",
    description:
      "Automated smart contract settlements ensure instant, trustless payments when invoices mature.",
  },
];

const stats = [
  { label: "Total Factored", value: "$12.5M+" },
  { label: "Invoices Funded", value: "2,400+" },
  { label: "Active Investors", value: "850+" },
  { label: "Avg. Return", value: "8.2%" },
];

export default function Landing() {
  const { isConnected } = useWallet();

  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-sm rounded-full text-white/80 text-sm font-medium mb-8">
              <Landmark className="h-4 w-4" />
              Decentralized Invoice Factoring on Stellar
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight text-balance">
              Bridge the gap between{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-200 to-primary-400">
                invoices and capital
              </span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-primary-200 max-w-2xl mx-auto text-balance">
              FactBridge tokenizes real-world invoices on the Stellar blockchain,
              enabling instant liquidity, transparent funding, and automated
              settlement through smart contracts.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              {isConnected ? (
                <Link to="/dashboard">
                  <Button size="lg" variant="secondary" icon={<ArrowRight className="h-5 w-5" />}>
                    Go to Dashboard
                  </Button>
                </Link>
              ) : (
                <Button size="lg" variant="secondary">
                  Connect Wallet to Start
                </Button>
              )}
              <a href="#features">
                <Button size="lg" variant="ghost" className="text-white hover:bg-white/10">
                  Learn More
                </Button>
              </a>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-gray-50 to-transparent" />
      </section>

      <section className="bg-gray-50 -mt-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-12 border-b border-gray-200">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="py-20 sm:py-28 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              How FactBridge Works
            </h2>
            <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
              Three simple steps to unlock the value of your invoices
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className="relative bg-white rounded-2xl border border-gray-200 p-8 shadow-sm hover:shadow-lg transition-shadow"
              >
                <div className="absolute top-6 right-6 text-5xl font-extrabold text-gray-100">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="relative">
                  <div className="p-3 bg-primary-50 rounded-xl w-fit mb-4">
                    <feature.icon className="h-6 w-6 text-primary-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-500 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                Built for Trust and Transparency
              </h2>
              <div className="space-y-4">
                {[
                  {
                    icon: Shield,
                    title: "Smart Contract Security",
                    desc: "All transactions are enforced by audited smart contracts on Stellar.",
                  },
                  {
                    icon: Zap,
                    title: "Instant Settlements",
                    desc: "Near-instant transaction finality with minimal fees on Stellar.",
                  },
                  {
                    icon: Users,
                    title: "Decentralized Governance",
                    desc: "Community-driven platform with transparent on-chain decision making.",
                  },
                ].map((item) => (
                  <div key={item.title} className="flex gap-4">
                    <div className="p-2 bg-primary-50 rounded-lg h-fit">
                      <item.icon className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {item.title}
                      </h4>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl p-8 text-center">
              <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm mx-auto">
                <div className="h-12 w-12 bg-primary-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Landmark className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Ready to Get Started?
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Connect your Freighter wallet and start factoring invoices
                  today.
                </p>
                {isConnected ? (
                  <Link to="/dashboard">
                    <Button className="w-full">
                      Go to Dashboard
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                ) : (
                  <Button className="w-full">
                    Connect Freighter Wallet
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-7 w-7 rounded-md bg-primary-600 flex items-center justify-center">
              <Landmark className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white">FactBridge</span>
          </div>
          <p className="text-sm">
            Decentralized Invoice Factoring on Stellar Blockchain
          </p>
          <p className="text-xs mt-4 text-gray-600">
            &copy; {new Date().getFullYear()} FactBridge. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
