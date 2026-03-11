import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-400 via-red-500 to-pink-600 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Animation */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-white opacity-10 rounded-full blur-3xl -top-20 -left-20"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-white opacity-10 rounded-full blur-3xl -bottom-20 -right-20"></div>

      <div className="relative z-10 text-center max-w-md">
        {/* Logo */}
        <div className="mb-6 animate-bounce">
          <span className="text-7xl">🐾</span>
        </div>

        {/* Title */}
        <h1 className="text-5xl font-black text-white mb-3 drop-shadow-lg">
          Pawtrol
        </h1>
        
        {/* Subtitle */}
        <p className="text-xl text-white mb-4 font-semibold drop-shadow-md">
          בעל חיים במצוקה?
        </p>

        <p className="text-lg text-white/90 mb-8 drop-shadow-md leading-relaxed">
          דווח תוך 10 שניות והעזור להצילו
        </p>

        {/* CTA Button */}
        <Link href="/report">
          <button className="w-full bg-white text-red-600 font-black py-4 px-8 rounded-2xl text-lg shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 mb-6">
            🚨 דווח עכשיו
          </button>
        </Link>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mt-8">
          <div className="bg-white/20 backdrop-blur-md rounded-xl p-4 text-white">
            <p className="text-2xl font-black">0</p>
            <p className="text-sm">דיווחים</p>
          </div>
          <div className="bg-white/20 backdrop-blur-md rounded-xl p-4 text-white">
            <p className="text-2xl font-black">0</p>
            <p className="text-sm">חיות הצלו</p>
          </div>
        </div>
      </div>
    </div>
  );
}