"use client";

import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase"
import { usePathname } from "next/navigation";

export function Header() {
  const pathname = usePathname();

  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const authContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function getUser() {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    }

    getUser();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (authContainerRef.current && !authContainerRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);
  
  useEffect(() => {
    if (!menuOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  return (
    <header className="bg-[#F4F1EA] relative z-30">
      <div className="relative flex items-center justify-between px-6 md:px-8 py-4 md:py-6">
        {/* Left: hamburger + desktop home icon */}
        <div className="z-10 flex items-center gap-3 md:gap-4">
          {!menuOpen && (
            <button
              aria-label="Open navigation"
              className="group inline-flex flex-col justify-center gap-1.5 text-[#1A1A1A] transition-opacity duration-200 hover:opacity-70 cursor-pointer"
              onClick={() => {
                setMenuOpen(true);
                setProfileOpen(false);
              }}
            >
              <span className="block w-8 h-[2px] bg-current"></span>
              <span className="block w-8 h-[2px] bg-current"></span>
              <span className="block w-8 h-[2px] bg-current"></span>
            </button>
          )}

          {pathname !== "/" && !menuOpen && (
            <Link
              href="/"
              className="hidden md:inline-flex hover:opacity-70 transition cursor-pointer"
            >
              <svg
  xmlns="http://www.w3.org/2000/svg"
  className="w-6 h-6 text-[#1A1A1A]"
  fill="none"
  viewBox="0 0 24 24"
  stroke="currentColor"
  strokeWidth={2}
>
  <path
    strokeLinecap="round"
    strokeLinejoin="round"
    d="M3 10.5L12 3l9 7.5M5 10.5V20h14v-9.5"
  />
</svg>
            </Link>
          )}
        </div>

        {/* Center: logo */}
        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2">
          <Link
            href="/"
            className="pointer-events-auto text-center leading-tight hover:opacity-70 transition-opacity duration-200"
          >
            <div className="font-serif text-5xl md:text-6xl lg:text-7xl tracking-tight text-[#0F5C4A]">
              aponomics
            </div>
            <div className="mt-2 font-serif text-xs md:text-sm tracking-[0.25em] text-[#3D7A68]">
              economics for the curious
            </div>
          </Link>
        </div>

        {/* Right: profile/sign in + search */}
        <div className="z-10 flex items-center gap-4 md:gap-5 pr-3 md:pr-0 text-[#1A1A1A]">
          <div className="relative" ref={authContainerRef}>
            {user ? (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setProfileOpen((prev) => !prev);
                  }}
                className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-sm font-medium bg-[#D6D0C4] text-[#1A1A1A]"
                  aria-label="Profile menu"
                >
                  {user.user_metadata?.avatar_url ? (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt=""
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    (user.email ?? "?").charAt(0).toUpperCase()
                  )}
                </button>
                {profileOpen && (
                  <div
                    className="absolute right-0 top-full mt-3 w-64 bg-white border border-[#D6D0C4] rounded-lg shadow-lg py-2 text-sm animate-fadeIn"
                    role="menu"
                  >
                    <Link
                      href="/profile"
                      onClick={() => setProfileOpen(false)}
                      className="block w-full text-left px-4 py-3 hover:bg-gray-100 rounded-none"
                    >
                      Profile
                    </Link>
                    <Link
                      href="/saved"
                      onClick={() => setProfileOpen(false)}
                      className="block w-full text-left px-4 py-3 hover:bg-gray-100 rounded-none"
                    >
                      Saved Articles
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setProfileOpen(false)}
                      className="block w-full text-left px-4 py-3 hover:bg-gray-100 rounded-none"
                    >
                      Settings
                    </Link>
                    <button
                      type="button"
                      onClick={async () => {
                        await supabase.auth.signOut();
                        setProfileOpen(false);
                        window.location.reload();
                      }}
                      className="block w-full text-left px-4 py-3 hover:bg-gray-100 rounded-none"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </>
            ) : (
              
              <Link
  href="/signin"
  className="flex items-center gap-2 hover:opacity-70 transition"
>
  {/* Icon */}
  <svg
    className="w-6 h-6 md:w-8 md:h-8"
    viewBox="0 0 24 24"
    fill="none"
  >
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="1.4" />
    <path
      d="M7 17c1.5-2 8.5-2 10 0"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  </svg>

  {/* Responsive text */}
  <span className="hidden md:inline text-sm text-[#1A1A1A]/80">
  Sign In
</span>
</Link>


            )}
          </div>
          {/* Search */}
          <button
            aria-label="Search"
            className="p-2.5 md:p-2 text-[#1A1A1A] cursor-pointer hover:opacity-70 transition"
          >
            <svg
              className="w-6 h-6 md:w-8 md:h-8 text-[#1A1A1A]"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="11"
                cy="11"
                r="5.5"
                stroke="currentColor"
                strokeWidth="1.2"
              />
              <line
                x1="15.2"
                y1="15.2"
                x2="19"
                y2="19"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Sliding menu panel */}
      <div
  className={`fixed inset-x-0 top-0 h-[63vh] bg-[#F7F3EB] border-b border-[#D6D0C4] transition-transform duration-300 ease-in-out ${menuOpen ? "translate-y-0" : "-translate-y-full"}`}
>
        <div className="relative h-full max-w-6xl mx-auto px-20 md:px-24 pt-16 pb-6 flex flex-col overflow-y-auto">
          {/* Close Button */}
          <button
            aria-label="Close navigation"
            className="absolute top-5 left-0 text-[40px] font-light text-[#1A1A1A] hover:opacity-70 transition-opacity"
            onClick={() => setMenuOpen(false)}
          >
            ×
          </button>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-[3fr_1fr_1fr] gap-20">
            {/* Left column: core themes */}
            <div className="space-y-10 md:space-y-5">
              <div>
                <Link href="/theme/markets" onClick={() => setMenuOpen(false)}>
                  <h2 className="font-serif text-[34px] leading-[1.2] font-medium tracking-tight text-[#2f5d50] hover:opacity-70 cursor-pointer">
                    Markets
                  </h2>
                </Link>
                <p className="mt-1 text-[15px] text-[#8C8573]">
                  How incentives and competition shape the economy
                </p>
              </div>
              <div>
                <Link href="/theme/growth" onClick={() => setMenuOpen(false)}>
                  <h2 className="font-serif text-[34px] leading-[1.2] font-medium tracking-tight text-[#b48a3c] hover:opacity-70 cursor-pointer">
                    Growth
                  </h2>
                </Link>

                <p className="mt-1 text-[15px] text-[#8C8573]">
                  Why nations prosper or stagnate
                </p>
              </div>

              <div>
                <Link href="/theme/policy" onClick={() => setMenuOpen(false)}>
                  <h2 className="font-serif text-[34px] leading-[1.2] font-medium tracking-tight text-[#2c3e5a] hover:opacity-70 cursor-pointer">
                    Policy
                  </h2>
                </Link>

                <p className="mt-1 text-[15px] text-[#8C8573]">
                  The architecture of government decisions
                </p>
              </div>

              <div>
                <Link href="/theme/society" onClick={() => setMenuOpen(false)}>
                  <h2 className="font-serif text-[34px] leading-[1.2] font-medium tracking-tight text-[#a45a3a] hover:opacity-70 cursor-pointer">
                    Society
                  </h2>
                </Link>

                <p className="mt-1 text-[15px] text-[#8C8573]">
                  Economic forces shaping everyday life
                </p>
              </div>

              <div>
                <Link href="/theme/future" onClick={() => setMenuOpen(false)}>
                  <h2 className="font-serif text-[34px] leading-[1.2] font-medium tracking-tight text-[#6b5aa6] hover:opacity-70 cursor-pointer">
                    Future
                  </h2>
                </Link>

                <p className="mt-1 text-[15px] text-[#8C8573]">
               The next transformations of the global economy
             </p>
             </div>
             </div> {/* closes themes column */}
           
          {/* EXPLORE */}
<div className="space-y-6 text-[25px]">
  <div className="text-[11px] tracking-[0.22em] uppercase text-[#7A7462]">
    Explore
  </div>

  <Link href="/articles" onClick={() => setMenuOpen(false)} className="block hover:opacity-70">
    Articles
  </Link>

  <Link href="/authors" onClick={() => setMenuOpen(false)} className="block hover:opacity-70">
    Authors
  </Link>

  <Link href="/popular" onClick={() => setMenuOpen(false)} className="block hover:opacity-70">
    Popular
  </Link>
</div>


{/* ORGANIZATION */}
<div className="space-y-8 text-[25px]">

  <div className="space-y-4">
    <div className="text-[11px] tracking-[0.22em] uppercase text-[#7A7462]">
      Organization
    </div>

    <Link href="/about" onClick={() => setMenuOpen(false)} className="block hover:opacity-70">
      About
    </Link>

    <Link href="/team" onClick={() => setMenuOpen(false)} className="block hover:opacity-70">
      Team
    </Link>

    <Link href="/contact" onClick={() => setMenuOpen(false)} className="block hover:opacity-70">
      Contact
    </Link>
  </div>

  <div className="space-y-4">
    <div className="text-[11px] tracking-[0.22em] uppercase text-[#7A7462]">
      Events
    </div>

    <Link href="/events/model-government" onClick={() => setMenuOpen(false)} className="block hover:opacity-70">
      Model Government
      </Link>
</div>

</div> {/* END explore + organization grid */}

</div> {/* END menu container */}

</div> {/* FIX: closes the div opened at line 152 */}

</div> {/* END sliding panel */}

</header>
);
}