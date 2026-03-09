import Image from "next/image";

export function Header() {
  return (
    <header className="bg-[#0B1A3B] text-white">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
        <Image
          src="/logo.png"
          alt="Cruise Control Group"
          width={48}
          height={48}
          className="rounded"
        />
        <div>
          <h1 className="text-lg font-bold tracking-tight">
            Interview Generator
          </h1>
          <p className="text-sm text-[#F2E6D9] opacity-80">
            Cruise Control Group
          </p>
        </div>
      </div>
    </header>
  );
}
