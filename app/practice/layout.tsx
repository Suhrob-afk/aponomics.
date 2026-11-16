import { PracticeFooter } from "@/components/practice/PracticeFooter";

export default function PracticeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-sans text-[#1A1A1A]">
      {children}
      <PracticeFooter />
    </div>
  );
}
