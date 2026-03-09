import Image from "next/image";

type Tool = "interview" | "profile";

interface HeaderProps {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
}

export function Header({ activeTool, onToolChange }: HeaderProps) {
  return (
    <header className="bg-[#0B1A3B] text-white no-print">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
        <Image
          src="/logo.png"
          alt="Cruise Control Group"
          width={48}
          height={48}
          className="rounded"
        />
        <div className="flex-1">
          <h1 className="text-lg font-bold tracking-tight">
            Recruitment Tools
          </h1>
          <p className="text-sm text-[#F2E6D9] opacity-80">
            Cruise Control Group
          </p>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-6">
        <nav className="flex gap-1 -mb-px">
          <button
            onClick={() => onToolChange("interview")}
            className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
              activeTool === "interview"
                ? "bg-white text-[#0B1A3B]"
                : "text-[#F2E6D9] hover:text-white hover:bg-white/10"
            }`}
          >
            Interview Generator
          </button>
          <button
            onClick={() => onToolChange("profile")}
            className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
              activeTool === "profile"
                ? "bg-white text-[#0B1A3B]"
                : "text-[#F2E6D9] hover:text-white hover:bg-white/10"
            }`}
          >
            Profile Creator
          </button>
        </nav>
      </div>
    </header>
  );
}
