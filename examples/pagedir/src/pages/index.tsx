import { BasicInput } from "@/components/BasicInput";
import { WithProgress } from "@/components/WithProgress";

export default function Home() {
  return (
    <main className="flex flex-col gap-8 p-6">
      <BasicInput />
      <WithProgress />
    </main>
  );
}
