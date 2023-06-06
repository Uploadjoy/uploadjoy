import { Inter } from "next/font/google";
import { BasicInput } from "./_components/BasicInput";
import { WithProgress } from "./_components/WithProgress";
import { Dropzone } from "./_components/Dropzone";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  return (
    <main className="flex flex-col gap-8 p-6">
      <BasicInput />
      <WithProgress />
      <Dropzone />
    </main>
  );
}
