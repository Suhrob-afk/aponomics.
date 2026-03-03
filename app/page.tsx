export default function Home() {
  return (
    <main className="min-h-screen bg-white text-black">

      {/* NAVIGATION */}
      <nav className="flex justify-between items-center px-12 py-6 border-b">
      <h1 className="text-2xl font-semibold tracking-tight font-serif">
          APONOMICS
        </h1>
        <div className="space-x-8 text-sm uppercase tracking-wide">
          <a href="#">Economy</a>
          <a href="#">Policy</a>
          <a href="#">Research</a>
          <a href="#">About</a>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="px-12 py-28 max-w-5xl">
      <h2 className="text-7xl leading-tight font-light font-serif">
          Economic thought for a changing world.
        </h2>

        <p className="mt-8 text-lg text-gray-600 max-w-2xl">
          aponomics is an editorial platform exploring macroeconomics,
          public policy, governance, and financial systems shaping
          the global future.
        </p>
      </section>

      {/* FEATURED ARTICLES */}
      <section className="px-12 pb-24 grid md:grid-cols-3 gap-16 max-w-6xl">

        <article className="group cursor-pointer">
          <div className="h-64 bg-gray-200 mb-4"></div>
          <h3 className="text-xl font-semibold group-hover:underline">
            The Housing Affordability Crisis
          </h3>
          <p className="text-sm text-gray-500 mt-2">
            Supply constraints, monetary policy, and urban growth.
          </p>
        </article>

        <article className="group cursor-pointer">
          <div className="h-64 bg-gray-200 mb-4"></div>
          <h3 className="text-xl font-semibold group-hover:underline">
            Rethinking Minimum Wage Economics
          </h3>
          <p className="text-sm text-gray-500 mt-2">
            Productivity, labor markets, and political signaling.
          </p>
        </article>

        <article className="group cursor-pointer">
          <div className="h-64 bg-gray-200 mb-4"></div>
          <h3 className="text-xl font-semibold group-hover:underline">
            Cryptocurrency in Developing Economies
          </h3>
          <p className="text-sm text-gray-500 mt-2">
            Can decentralized finance stabilize volatile currencies?
          </p>
        </article>

      </section>

    </main>
  );
}