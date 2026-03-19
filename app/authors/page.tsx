export default function AuthorsPage() {
  const authors = [
    "Sabrina Esanova",
    "Norimova Shohista",
    "Farangiz Begmurodova",
    "Hilolaxon Ismoilova",
    "Asatullayeva Nodira",
    "Jumayeva Dinara",
    "Rasulov Shohjahon",
    "Abdulaziz Axmadov",
    "Qurbonov Og'abek",
    "Asilbek Eshmatov",
    "Mehribon Ahmadjonova",
    "Otabek Izzatovich",
    "Toshev Quvonchbek"
  ]

  return (
    <div className="min-h-screen bg-[#F4F1EA]">
      <main className="max-w-3xl mx-auto px-6 md:px-8 pt-24 pb-16">
        <h1 className="text-4xl md:text-5xl font-serif text-[#0F5C4A] mb-6">
          Authors
        </h1>

        <p className="text-sm text-[#7A7462] mb-12">
          Writers contributing to Aponomics.
        </p>

        <ul className="space-y-5">
          {authors.map((name) => (
            <li
              key={name}
              className="text-2xl md:text-[2rem] leading-none font-serif italic text-[#1A1A1A]"
            >
              {name}
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}